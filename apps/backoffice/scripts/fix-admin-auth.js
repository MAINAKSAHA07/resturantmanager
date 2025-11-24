/**
 * Script to find and replace all admin authentication patterns
 * This helps identify all files that need to be updated
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '../src/app/api');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('adminPb.admins.authWithPassword(adminEmail, adminPassword)') ||
          content.includes('pb.admins.authWithPassword(adminEmail, adminPassword)')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

const files = findFiles(apiDir);
console.log('Files that need updating:');
files.forEach(f => console.log('  -', f.replace(process.cwd() + '/', '')));
console.log(`\nTotal: ${files.length} files`);

