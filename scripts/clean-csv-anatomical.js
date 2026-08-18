const fs = require('fs');
const path = require('path');

// Same anatomical rules as preindexed JSON
const anatomicalRules = [
  {
    complications: [
      'Cartilage or Labral Injury',
      'Joint Stiffness',
      'Joint dislocation or instability',
      'Recurrent Impingement',
      'Osteoarthritis Progression',
      'Meniscus',
      'Rotator cuff',
      'ACL',
      'PCL',
      'Ligament tear',
      'Tendon rupture'
    ],
    allowedProcedures: [
      'knee', 'hip', 'shoulder', 'elbow', 'ankle', 'wrist', 'finger', 'toe',
      'arthroscopy', 'arthroplasty', 'replacement', 'fusion', 'osteotomy',
      'ACL', 'PCL', 'meniscus', 'rotator', 'labral', 'cartilage',
      'spinal', 'spine', 'discectomy', 'laminectomy'
    ],
    reason: 'Joint complications'
  },
  {
    complications: [
      'Cardiac Perforation',
      'Residual or Recurrent Valve Leakage',
      'Coronary Artery Perforation',
      'Arrhythmia',
      'Atrial Fibrillation',
      'Myocardial',
      'Valve'
    ],
    allowedProcedures: [
      'cardiac', 'heart', 'bypass', 'stent', 'catheter', 'valve', 'pacemaker',
      'icd', 'thoracotomy', 'sternotomy', 'aortic', 'coronary', 'mitral',
      'tricuspid', 'pulmonary valve', 'transcatheter'
    ],
    reason: 'Cardiac complications'
  },
  {
    complications: [
      'Brain hemorrhage',
      'Cerebral',
      'Dural tear',
      'CSF leak',
      'Intracerebral',
      'Epidural hematoma',
      'Cerebrospinal fluid',
      'Meningeal'
    ],
    allowedProcedures: [
      'craniotomy', 'brain', 'neurosurgery', 'craniectomy', 'lumbar',
      'spinal fusion', 'spine', 'laminectomy', 'discectomy'
    ],
    reason: 'Brain/CSF complications'
  },
  {
    complications: [
      'Endophthalmitis',
      'Intraocular',
      'Retinal detachment',
      'Corneal',
      'Optic',
      'Vision',
      'Refractive'
    ],
    allowedProcedures: [
      'cataract', 'eye', 'ophthalm', 'orbital', 'vitrectomy', 'retina',
      'glaucoma', 'corneal'
    ],
    reason: 'Eye complications'
  },
  {
    complications: [
      'Access Site Bleeding',
      'Vascular access site',
      'Access site',
      'Catheter insertion'
    ],
    allowedProcedures: [
      'catheter', 'angioplasty', 'stenting', 'embolization', 'dialysis',
      'port', 'central line', 'pacemaker', 'icd', 'fistula', 'bypass'
    ],
    reason: 'Catheter access complications'
  }
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

console.log('='.repeat(100));
console.log('CLEANING CSV - REMOVING ANATOMICAL MISMATCHES');
console.log('='.repeat(100));
console.log();

let totalRemoved = 0;

for (const proc of procedures) {
  let procedureRemoved = 0;

  for (const rule of anatomicalRules) {
    // Check if procedure is allowed to have these complications
    const isAllowed = rule.allowedProcedures.some(term =>
      proc.procedure.toLowerCase().includes(term)
    );

    if (isAllowed) continue;

    // Remove disallowed complications
    const filterComplications = (list) => {
      return list.filter(c => {
        return !rule.complications.some(pattern =>
          c.toLowerCase().includes(pattern.toLowerCase())
        );
      });
    };

    const originalTotal = proc.immediate.length + proc.early.length + proc.late.length;

    proc.immediate = filterComplications(proc.immediate);
    proc.early = filterComplications(proc.early);
    proc.late = filterComplications(proc.late);

    const newTotal = proc.immediate.length + proc.early.length + proc.late.length;
    const removed = originalTotal - newTotal;

    if (removed > 0) {
      console.log(`✓ Removed ${removed} ${rule.reason} from: ${proc.procedure}`);
      procedureRemoved += removed;
      totalRemoved += removed;
    }
  }
}

console.log();
console.log(`Total complications removed: ${totalRemoved}`);
console.log();

// Generate cleaned CSV
const header = 'Procedure;Specialty;Immediate / Intraoperative Complications;Early Post-Operative Complications;Late Post-Operative Complications';
const csvLines = [header, ...procedures.map(generateCSVLine)];
const cleanedCSV = csvLines.join('\n');

// Write cleaned CSV
const outputPath = path.join(__dirname, '../ProcedureComplications.csv');
const backupPath = path.join(__dirname, '../ProcedureComplications_anatomical_backup.csv');

fs.writeFileSync(backupPath, csvContent, 'utf-8');
console.log(`✓ Original CSV backed up to: ${backupPath}`);

fs.writeFileSync(outputPath, cleanedCSV, 'utf-8');
console.log(`✓ Cleaned CSV written to: ${outputPath}`);

// Update public and assets copies
const publicPath = path.join(__dirname, '../public/ProcedureComplications.csv');
if (fs.existsSync(publicPath)) {
  fs.writeFileSync(publicPath, cleanedCSV, 'utf-8');
  console.log(`✓ Public CSV updated`);
}

const assetsPath = path.join(__dirname, '../assets/images/ProcedureComplications.csv');
if (fs.existsSync(assetsPath)) {
  fs.writeFileSync(assetsPath, cleanedCSV, 'utf-8');
  console.log(`✓ Assets CSV updated`);
}

console.log();
console.log('='.repeat(100));
console.log('DONE: Anatomical mismatches removed from CSV');
console.log('='.repeat(100));
