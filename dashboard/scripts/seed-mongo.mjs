#!/usr/bin/env node
/**
 * Seed MongoDB with the static JSON data files.
 * Safe to run multiple times — skips collections that already have data.
 *
 * Usage:
 *   node scripts/seed-mongo.mjs
 *   MONGODB_URI=mongodb://localhost:27017 node scripts/seed-mongo.mjs
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017';

const DB_NAME = 'kotlin_edu';

// Map: collection name → path to JSON file (relative to dashboard root)
const SEED_MAP = {
  courses: join(ROOT, 'public/data/courses_unified.json'),
  serp:    join(ROOT, 'public/data/serp_progress.json'),
};

// baseline is a single object stored as one document
const BASELINE_PATH = join(ROOT, 'public/data/baseline_comparison.json');

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadJson(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`  ✗ Could not load ${filePath}:`, err.message);
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🍃  Connecting to MongoDB at ${MONGO_URI} …`);
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    console.log('   Connected.\n');
  } catch (err) {
    console.error('✗  Could not connect to MongoDB:', err.message);
    console.error('   Make sure MongoDB is running and MONGODB_URI is correct.');
    process.exit(1);
  }

  const db = client.db(DB_NAME);

  // ── Seed array collections ─────────────────────────────────────────────────
  for (const [collName, filePath] of Object.entries(SEED_MAP)) {
    const coll = db.collection(collName);
    const existing = await coll.countDocuments();

    if (existing > 0 && !process.env.FORCE_RESEED) {
      console.log(`⏭   ${collName}: already has ${existing.toLocaleString()} documents — skipping.`);
      console.log(`    (run with FORCE_RESEED=1 to drop and re-seed)`);
      continue;
    }

    if (existing > 0 && process.env.FORCE_RESEED) {
      console.log(`🗑   ${collName}: force-reseeding — dropping ${existing.toLocaleString()} existing documents…`);
      await coll.deleteMany({});
    }


    console.log(`📥  ${collName}: loading from ${filePath.replace(ROOT, '.')} …`);
    const data = loadJson(filePath);
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn(`  ⚠  No data found in ${filePath}, skipping.`);
      continue;
    }

    // Insert in batches of 1000 to avoid hitting BSON size limits
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < data.length; i += BATCH) {
      const batch = data.slice(i, i + BATCH);
      const result = await coll.insertMany(batch, { ordered: false });
      inserted += result.insertedCount;
      process.stdout.write(`\r  Inserted ${inserted.toLocaleString()} / ${data.length.toLocaleString()} …`);
    }
    console.log(`\n  ✓  ${collName}: seeded ${inserted.toLocaleString()} documents.`);

    // Create useful indexes
    if (collName === 'courses') {
      await coll.createIndex({ source: 1 });
      await coll.createIndex({ country: 1 });
      await coll.createIndex({ signal_tier: 1 });
      await coll.createIndex({ learning_type: 1 });
      await coll.createIndex({ kotlin_confidence: 1 });
      console.log('  ✓  Indexes created on courses collection.');
    }
    if (collName === 'serp') {
      await coll.createIndex({ status: 1 });
      await coll.createIndex({ engine: 1 });
      console.log('  ✓  Indexes created on serp collection.');
    }
  }

  // ── Seed baseline (single-document collection) ───────────────────────────
  const baselineColl = db.collection('baseline');
  const baselineExists = await baselineColl.countDocuments();

  if (baselineExists > 0) {
    console.log(`⏭   baseline: already has ${baselineExists} document — skipping.`);
  } else {
    const baseline = loadJson(BASELINE_PATH);
    if (baseline && typeof baseline === 'object') {
      await baselineColl.insertOne(baseline);
      console.log('  ✓  baseline: seeded 1 document.');
    } else {
      console.warn('  ⚠  Could not load baseline_comparison.json, skipping.');
    }
  }

  await client.close();
  console.log('\n✅  Seeding complete.\n');
}

main().catch((err) => {
  console.error('\n✗  Unexpected error:', err);
  process.exit(1);
});
