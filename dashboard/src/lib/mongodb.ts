import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function getMongoUri(): string {
  // 1. Check process.env
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  if (process.env.VITE_MONGODB_URI) return process.env.VITE_MONGODB_URI;

  // 2. Fallback: Parse .env / .env.local manually from disk if running in Node/Vite
  const envPaths = [
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '.env'),
    join(process.cwd(), '../.env'),
  ];

  for (const envPath of envPaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        const match = content.match(/^(?:MONGODB_URI|MONGO_URI|VITE_MONGODB_URI)=(.*)$/m);
        if (match && match[1]) {
          const uri = match[1].trim().replace(/^["']|["']$/g, '');
          if (uri) return uri;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // 3. Hardcoded Atlas URI fallback provided by user
  return 'mongodb://markoeltiger8_db_user:hvtPyW7XyWvo9c9y@ac-jhbcezo-shard-00-00.ul5d133.mongodb.net:27017,ac-jhbcezo-shard-00-01.ul5d133.mongodb.net:27017,ac-jhbcezo-shard-00-02.ul5d133.mongodb.net:27017/?ssl=true&replicaSet=atlas-fxnozm-shard-0&authSource=admin&appName=Cluster0';
}

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  const uri = getMongoUri();

  if (!clientPromise) {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      console.log(`[mongo] Initializing MongoClient connection to MongoDB Atlas...`);
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  }

  return clientPromise;
}

export default getClientPromise;

export async function getDb(dbName = 'kotlin_edu') {
  const promise = getClientPromise();
  const client = await promise;
  return client.db(dbName);
}

/** Returns null instead of throwing when MongoDB is unavailable */
export async function getDbSafe(dbName = 'kotlin_edu') {
  try {
    return await getDb(dbName);
  } catch (err) {
    console.error('[mongo] Connection error:', (err as Error).message);
    return null;
  }
}
