const fs = require('fs');
const path = require('path');

const sourceDir = process.cwd();
const targetDir = path.join(sourceDir, '.output/public');

const csvFiles = [
  'kotlin_education_tableau.csv',
  'kotlin_education_tableau_universities.csv'
];

const jsonFiles = [
  'courses_unified.json',
  'serp_progress.json',
  'baseline_comparison.json',
  'insights.json',
  'programs.json',
  'topics.json'
];

const dataSourceDir = path.join(sourceDir, 'public/data');
const dataTargetDir = path.join(targetDir, 'data');

// Ensure target directories exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
if (!fs.existsSync(dataTargetDir)) {
  fs.mkdirSync(dataTargetDir, { recursive: true });
}

// Copy CSV files
csvFiles.forEach(file => {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to build output`);
  } else {
    console.warn(`Warning: ${file} not found in source directory`);
  }
});

// Copy JSON data files
jsonFiles.forEach(file => {
  const source = path.join(dataSourceDir, file);
  const target = path.join(dataTargetDir, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to build output`);
  } else {
    console.warn(`Warning: ${file} not found in data directory`);
  }
});

// Also copy to public directory for development compatibility
const publicDir = path.join(sourceDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

csvFiles.forEach(file => {
  const source = path.join(sourceDir, file);
  const target = path.join(publicDir, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to public directory`);
  }
});

console.log('CSV and JSON files copied successfully');