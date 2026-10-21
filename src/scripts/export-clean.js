/**
 * Script untuk mengekspor source code TugasKu secara bersih (Clean Export)
 * Menghapus/mengecualikan file data pribadi sebelum dibagikan ke mahasiswa lain:
 * - .env (kredensial login)
 * - config/session.json (token sesi login LMS MENTARI)
 * - config/contacts.json (nomor WhatsApp asli seluruh mahasiswa)
 * - config/telegram.json (token bot & chat ID Telegram pribadi)
 * - config/whatsapp-session.json & whatsapp.json
 * - data/ (log & runtime data)
 * - node_modules/ & .git/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const outDir = path.join(rootDir, 'dist-clean');

const EXCLUDED_PATHS = new Set([
  '.env',
  '.git',
  'node_modules',
  'config/session.json',
  'config/contacts.json',
  'config/telegram.json',
  'config/whatsapp-session.json',
  'config/whatsapp.json',
  'data',
  'test-logs',
  'test-scheduler-data',
  'test-snapshots',
  'test-whatsapp-data',
  'dist-clean',
  'dist-electron',
  'TugasKu.zip'
]);

function copyDirClean(src, dest, relPath = '') {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const entryRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
    const normalizedRel = entryRelPath.replace(/\\/g, '/');

    if (EXCLUDED_PATHS.has(normalizedRel) || entry.name.endsWith('.log')) {
      console.log(`  [Dilewati / Rahasia] -> ${normalizedRel}`);
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirClean(srcPath, destPath, normalizedRel);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('   📦 MENYIAPKAN PAKET BERSIH TUGASKU UNTUK DIBAGIKAN');
console.log('='.repeat(60));

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}

copyDirClean(rootDir, outDir);

// Pastikan template example tersedia
const sessionEx = path.join(outDir, 'config', 'session.example.json');
if (!fs.existsSync(sessionEx)) {
  fs.writeFileSync(sessionEx, JSON.stringify({ token: '', updatedAt: null, user: null }, null, 2));
}

console.log('='.repeat(60));
console.log(`✅ BERHASIL! Folder bersih tersimpan di:`);
console.log(`   ${outDir}`);
console.log(`\nFolder tersebut aman di-ZIP atau dibagikan ke mahasiswa lain:`);
console.log(`- Bebas dari token MENTARI pribadi`);
console.log(`- Bebas dari daftar nomor HP / kontak mahasiswa`);
console.log(`- Bebas dari token bot Telegram`);
console.log('='.repeat(60) + '\n');
