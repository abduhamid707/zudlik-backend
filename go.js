// file: read-all-files.js
import fs from 'fs';
import path from 'path';
import os from 'os';

const desktopPath = path.join(os.homedir(), 'Desktop');

// ❌ Katta yoki avtomatik papkalar
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'out'];

// ❌ O‘qilmasin kerak bo‘lgan fayllar
const EXCLUDED_FILES = [
  'package-lock.json',
  'package.json',
  'yarn.lock',
  '.env',
  '.DS_Store',
  'pnpm-lock.yaml'
];

// 📂 Terminal argumentlar
const comment = process.argv[2] || '';
const userPath = process.argv[3];
const inputPath = userPath ? path.resolve(userPath) : path.resolve('./');

const structureLines = [];
const codeLines = [];

if (!fs.existsSync(inputPath)) {
  console.error(`❗ Papka topilmadi: ${inputPath}`);
  process.exit(1);
}

structureLines.push(`Izoh: ${comment}\n`);
structureLines.push(`Papka> ${path.relative(process.cwd(), inputPath)}\n`);

// 📁 Papka tuzilmasi
function traverseStructure(dirPath, depth = 0) {
  const indent = '  '.repeat(depth);
  const items = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(item => 
      !EXCLUDED_DIRS.includes(item.name) &&
      !EXCLUDED_FILES.includes(item.name)
    );

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      structureLines.push(`${indent}Papka> ${item.name}`);
      traverseStructure(fullPath, depth + 1);
    } else {
      structureLines.push(`${indent}File> ${item.name}`);
    }
  }
}

// 📜 Fayl kodlarini o‘qish
function traverseWithCode(dirPath, depth = 0) {
  const indent = '  '.repeat(depth);
  const items = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(item => 
      !EXCLUDED_DIRS.includes(item.name) &&
      !EXCLUDED_FILES.includes(item.name)
    );

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(inputPath, fullPath).replace(/\\/g, '/');

    if (item.isDirectory()) {
      codeLines.push(`${indent}Papka> ${item.name}`);
      traverseWithCode(fullPath, depth + 1);
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.json'].includes(ext)) {
        codeLines.push(`${indent}File> ${item.name}`);
        try {
          const code = fs.readFileSync(fullPath, 'utf8');
          const codeIndented = code.split('\n').map(line => `${indent}  ${line}`);
          codeLines.push(...codeIndented);
        } catch (err) {
          codeLines.push(`${indent}  ❌ Xatolik: ${relativePath}`);
        }
      }
    }
  }
}

// ▶️ Ishga tushirish
traverseStructure(inputPath);
codeLines.unshift('\nKodlar:\n');
traverseWithCode(inputPath);

// 💾 Natijani saqlash
const final = [...structureLines, ...codeLines].join('\n');
const outputFile = path.join(desktopPath, 'bundle.txt');
fs.writeFileSync(outputFile, final, 'utf8');

console.log(`✅ Tugadi! Fayl saqlandi: ${outputFile}`);
