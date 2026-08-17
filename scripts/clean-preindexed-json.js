const fs = require('fs');
const path = require('path');

// Cardiac/catheter complications to remove
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

// Load preindexed JSON
const jsonPath = path.join(__dirname, '../src/data/preindexed_procedures.json');
const jsonData = fs.readFileSync(jsonPath, 'utf-8');
const procedures = JSON.parse(jsonData);

console.log('Removing cardiac complications from preindexed JSON...');
console.log();

let removedCount = 0;

for (const proc of procedures) {
  if (!proc.complications) continue;

  for (const category of Object.keys(proc.complications)) {
    const complications = proc.complications[category];
    const originalLength = complications.length;

    // Filter out cardiac complications
    proc.complications[category] = complications.filter(c =>
      !cardiacComplicationsToRemove.includes(c.name)
    );

    const removed = originalLength - proc.complications[category].length;
    if (removed > 0) {
      console.log(`✓ Removed ${removed} cardiac complication(s) from: ${proc.name} [${category}]`);
      removedCount += removed;
    }
  }
}

console.log();
console.log(`Total complications removed: ${removedCount}`);
console.log();

// Backup the original
const backupPath = path.join(__dirname, '../src/data/preindexed_procedures_backup.json');
fs.writeFileSync(backupPath, jsonData, 'utf-8');
console.log(`✓ Original preindexed JSON backed up to: ${backupPath}`);
console.log();

// Write cleaned JSON
const cleanedJson = JSON.stringify(procedures, null, 2);
fs.writeFileSync(jsonPath, cleanedJson, 'utf-8');
console.log(`✓ Cleaned preindexed JSON written to: ${jsonPath}`);
console.log();

console.log('='.repeat(80));
console.log('DONE: Cardiac hallucinations removed from preindexed JSON');
console.log('='.repeat(80));
