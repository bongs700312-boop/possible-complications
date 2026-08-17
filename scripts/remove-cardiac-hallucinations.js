const fs = require('fs');
const path = require('path');

// Cardiac/catheter complications to remove from non-cardiac procedures
const cardiacComplicationsToRemove = [
  'Cardiac Perforation (Accidental puncture of the heart wall during device placement)',
  'Residual or Recurrent Valve Leakage (The valve continues to leak or leaks again over time)',
  'Coronary Artery Perforation (Accidental hole created in the artery wall during stent placement)',
  'Arrhythmia (Irregular heartbeat occurring during the procedure)',
  'Atrial Fibrillation (Irregular heart rhythm after surgery)',
  'Access Site Bleeding (Bleeding or bruising at the catheter insertion site)',
  'Vascular access site disruption or severe hematoma (Collection of blood causing swelling)',
  'Vascular access site laceration or retroperitoneal hemorrhage (Excessive or unexpected bleeding during the procedure)',
  'Vascular Access Site Complications (Bleeding or injury at the catheter insertion site)',
  'Access site / operative hematoma'
];

// Procedures that should NEVER have cardiac complications
const nonCardiacProcedures = [
  'knee', 'patellofemoral', 'foot', 'toe', 'ankle', 'tarsal', 'metatarsal', 'calcaneal', 'achilles',
  'mandible', 'jaw', 'facial', 'maxillary', 'zygomatic', 'orbital', 'tmj',
  'rhinoplasty', 'rhinectomy', 'nose', 'nasal',
  'appendectomy', 'colectomy', 'gastrectomy', 'hepatectomy', 'thyroidectomy'
];

// Parse CSV
function parseCSV(content) {
  const lines = content.split('\n');
  const procedures = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (parts.length >= 5) {
      const procedure = parts[0].trim();
      const specialty = parts[1] ? parts[1].trim() : '';
      const immediate = parts[2] ? parts[2].split(';').map(c => c.trim()).filter(c => c) : [];
      const early = parts[3] ? parts[3].split(';').map(c => c.trim()).filter(c => c) : [];
      const late = parts[4] ? parts[4].split(';').map(c => c.trim()).filter(c => c) : [];

      procedures.push({
        procedure,
        specialty,
        immediate,
        early,
        late
      });
    }
  }

  return procedures;
}

// Generate CSV line
function generateCSVLine(proc) {
  const quoteIfNeeded = (str) => {
    if (str.includes(';') || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  const immediateStr = proc.immediate.join('; ');
  const earlyStr = proc.early.join('; ');
  const lateStr = proc.late.join('; ');

  return `${proc.procedure};${proc.specialty};${quoteIfNeeded(immediateStr)};${quoteIfNeeded(earlyStr)};${quoteIfNeeded(lateStr)}`;
}

// Main processing
const csvPath = path.join(__dirname, '../ProcedureComplications.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const procedures = parseCSV(csvContent);

let removedCount = 0;

console.log('Removing cardiac hallucinations from CSV...');
console.log();

for (const proc of procedures) {
  // Check if this is a non-cardiac procedure
  const isNonCardiac = nonCardiacProcedures.some(term => proc.procedure.toLowerCase().includes(term));

  if (isNonCardiac) {
    // Remove cardiac complications from all categories
    const originalTotal = proc.immediate.length + proc.early.length + proc.late.length;

    proc.immediate = proc.immediate.filter(c => !cardiacComplicationsToRemove.includes(c));
    proc.early = proc.early.filter(c => !cardiacComplicationsToRemove.includes(c));
    proc.late = proc.late.filter(c => !cardiacComplicationsToRemove.includes(c));

    const newTotal = proc.immediate.length + proc.early.length + proc.late.length;
    const removed = originalTotal - newTotal;

    if (removed > 0) {
      console.log(`✓ Removed ${removed} cardiac complication(s) from: ${proc.procedure}`);
      removedCount += removed;
    }
  }
}

console.log();
console.log(`Total complications removed: ${removedCount}`);
console.log();

// Generate cleaned CSV
const header = 'Procedure;Specialty;Immediate / Intraoperative Complications;Early Post-Operative Complications;Late Post-Operative Complications';
const csvLines = [header, ...procedures.map(generateCSVLine)];
const cleanedCSV = csvLines.join('\n');

// Write cleaned CSV
const outputPath = path.join(__dirname, '../ProcedureComplications_cleaned.csv');
fs.writeFileSync(outputPath, cleanedCSV, 'utf-8');

console.log(`✓ Cleaned CSV written to: ${outputPath}`);
console.log();

// Also backup the original
const backupPath = path.join(__dirname, '../ProcedureComplications_backup.csv');
fs.writeFileSync(backupPath, csvContent, 'utf-8');
console.log(`✓ Original CSV backed up to: ${backupPath}`);
console.log();

// Now replace the original with the cleaned version
fs.writeFileSync(csvPath, cleanedCSV, 'utf-8');
console.log(`✓ Original CSV replaced with cleaned version`);
console.log();

// Also update the public copy
const publicCsvPath = path.join(__dirname, '../public/ProcedureComplications.csv');
if (fs.existsSync(publicCsvPath)) {
  fs.writeFileSync(publicCsvPath, cleanedCSV, 'utf-8');
  console.log(`✓ Public CSV updated`);
}

console.log();
console.log('='.repeat(80));
console.log('DONE: Cardiac hallucinations removed from CSV');
console.log('='.repeat(80));
