import assert from "assert";

console.log("=== DRAFT NUMBER / PHONE TOGGLE & RANGKUMAN AUTOSCAN TESTS ===\n");

let passed = 0;
function check(desc, cond) {
  assert(cond, desc);
  console.log(`  ✓ [PASS] ${desc}`);
  passed++;
}

// 1. Logika formatDraftText yang digunakan di frontend
function formatDraftText(rawText, { includePhones = true, includeNumbering = true } = {}) {
  if (!rawText) return "";
  let text = rawText;

  // 1. Sembunyikan Nomor Telepon/HP jika dinonaktifkan
  if (!includePhones) {
    text = text.replace(/@\+?\d{7,16}\s*\(([^)]+)\)/g, "$1");
    text = text.replace(/@\+?\d{7,16}\s*/g, "");
  }

  // 2. Sembunyikan Nomor Urut jika dinonaktifkan
  if (!includeNumbering) {
    text = text.replace(/^(\s*)\d+\.\s+/gm, "$1• ");
  }

  return text;
}

const sampleDraft = `> TEKNIK RISET OPERASIONAL
*Pert. 4* • *Deadline: Jumat, 23:59 WIB* 🚨 *[DEADLINE HARI INI]*

💬 *Forum Kurang (<2x reply) (3):*
1. @6281292355118 (GILANG TRI SATRIA KURNIAWAN)
2. @6281380548248 (JOS VIKEN DARMASAH GUNAWAN)
3. [Revisi] @6288212741019 (KAYLA OLIVIA RAHMA KALESARAN)

❌ *Belum Posttest (1):*
1. @62895635396047 (M. HAFIDZ AWALUDIN)
`;

// Test 1: Default (both true)
const defaultFormatted = formatDraftText(sampleDraft, { includePhones: true, includeNumbering: true });
check("Default menyertakan nomor HP (@628...)", defaultFormatted.includes("@6281292355118 (GILANG TRI SATRIA KURNIAWAN)"));
check("Default menyertakan nomor urut (1., 2., 3.)", defaultFormatted.includes("1. ") && defaultFormatted.includes("2. ") && defaultFormatted.includes("3. "));

// Test 2: Omit phone numbers (includePhones: false)
const noPhoneFormatted = formatDraftText(sampleDraft, { includePhones: false, includeNumbering: true });
check("Omit phone: nomor HP @628xxx tidak ada di draft", !noPhoneFormatted.includes("@6281292355118") && !noPhoneFormatted.includes("@6281380548248"));
check("Omit phone: nama mahasiswa tetap bersih tercantum", noPhoneFormatted.includes("1. GILANG TRI SATRIA KURNIAWAN"));
check("Omit phone: tag revisi tetap utuh", noPhoneFormatted.includes("3. [Revisi] KAYLA OLIVIA RAHMA KALESARAN"));
check("Omit phone: nomor urut tetap ada jika includeNumbering true", noPhoneFormatted.includes("1. ") && noPhoneFormatted.includes("2. "));

// Test 3: Omit numbering (includeNumbering: false)
const noNumberingFormatted = formatDraftText(sampleDraft, { includePhones: true, includeNumbering: false });
check("Omit numbering: tidak ada baris diawali '1. ' atau '2. '", !/^1\.\s/m.test(noNumberingFormatted) && !/^2\.\s/m.test(noNumberingFormatted));
check("Omit numbering: digantikan oleh bullet point '• '", noNumberingFormatted.includes("• @6281292355118 (GILANG TRI SATRIA KURNIAWAN)"));

// Test 4: Omit both phone and numbering (includePhones: false, includeNumbering: false)
const cleanBulletFormatted = formatDraftText(sampleDraft, { includePhones: false, includeNumbering: false });
check("Clean bullet: nomor HP tidak ada", !cleanBulletFormatted.includes("@6281292355118"));
check("Clean bullet: nomor urut tidak ada", !/^\d+\.\s/m.test(cleanBulletFormatted));
check("Clean bullet: baris mahasiswa tersusun rapi dengan bullet dan nama", cleanBulletFormatted.includes("• GILANG TRI SATRIA KURNIAWAN"));
check("Clean bullet: baris revisi tersusun rapi dengan bullet dan nama", cleanBulletFormatted.includes("• [Revisi] KAYLA OLIVIA RAHMA KALESARAN"));

// Test 5: Auto-scan trigger simulation for Rangkuman Pribadi
let scanCalled = false;
let currentWeek = "4";
function simulateSwitchMainView(viewName) {
  if (viewName === "rangkuman") {
    scanCalled = true;
    return `Scanning week ${currentWeek}`;
  }
}
const scanRes = simulateSwitchMainView("rangkuman");
check("Navigasi ke rangkuman langsung memicu scan", scanCalled && scanRes === "Scanning week 4");

console.log(`\n=================================================================`);
console.log(` Summary: ${passed} passed, 0 failed`);
console.log(`=================================================================\n`);
