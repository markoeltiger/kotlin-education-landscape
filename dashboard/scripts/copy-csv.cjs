const fs = require('fs');
const path = require('path');

const sourceDir = process.cwd();
const targetDir = path.join(sourceDir, '.output/public');

const files = [
  'kotlin_education_tableau.csv',
  'kotlin_education_tableau_universities.csv'
];

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy CSV files
files.forEach(file => {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to build output`);
  } else {
    console.warn(`Warning: ${file} not found in source directory`);
  }
});

// Also copy to public directory for development compatibility
const publicDir = path.join(sourceDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

files.forEach(file => {
  const source = path.join(sourceDir, file);
  const target = path.join(publicDir, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to public directory`);
  }
});

console.log('CSV files copied successfully');