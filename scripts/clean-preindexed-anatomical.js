const fs = require('fs');
const path = require('path');

// Anatomical mismatch rules
const anatomicalRules = [
  {
    // Joint complications - only for orthopedic/joint procedures
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
    reason: 'Joint complications in non-joint procedures'
  },
  {
    // Cardiac complications - only for cardiac/thoracic procedures
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
    reason: 'Cardiac complications in non-cardiac procedures'
  },
  {
    // Brain/CSF complications - only for neuro procedures
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
    reason: 'Brain/CSF complications in non-neurological procedures'
  },
  {
    // Eye complications - only for ophthalmic procedures
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
    reason: 'Eye complications in non-ophthalmic procedures'
  },
  {
    // Catheter/access complications - only for vascular procedures
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
    reason: 'Catheter access complications in non-vascular procedures'
  }
];

// Load preindexed JSON
const jsonPath = path.join(__dirname, '../src/data/preindexed_procedures.json');
const jsonData = fs.readFileSync(jsonPath, 'utf-8');
const procedures = JSON.parse(jsonData);

console.log('='.repeat(100));
console.log('CLEANING PREINDEXED JSON - REMOVING ANATOMICAL MISMATCHES');
console.log('='.repeat(100));
console.log();

let totalRemoved = 0;

for (const proc of procedures) {
  if (!proc.complications) continue;

  let procedureRemoved = 0;

  for (const rule of anatomicalRules) {
    // Check if procedure is allowed to have these complications
    const isAllowed = rule.allowedProcedures.some(term =>
      proc.name.toLowerCase().includes(term)
    );

    if (isAllowed) continue; // Skip if allowed

    // Remove disallowed complications
    for (const category of Object.keys(proc.complications)) {
      const complications = proc.complications[category];
      const originalLength = complications.length;

      proc.complications[category] = complications.filter(c => {
        const compName = c.name || c;
        return !rule.complications.some(pattern =>
          compName.toLowerCase().includes(pattern.toLowerCase())
        );
      });

      const removed = originalLength - proc.complications[category].length;
      if (removed > 0) {
        console.log(`✓ Removed ${removed} ${rule.reason} from: ${proc.name} [${category}]`);
        procedureRemoved += removed;
        totalRemoved += removed;
      }
    }
  }
}

console.log();
console.log(`Total complications removed: ${totalRemoved}`);
console.log();

// Backup the original
const backupPath = path.join(__dirname, '../src/data/preindexed_procedures_anatomical_backup.json');
fs.writeFileSync(backupPath, jsonData, 'utf-8');
console.log(`✓ Original preindexed JSON backed up to: ${backupPath}`);
console.log();

// Write cleaned JSON
const cleanedJson = JSON.stringify(procedures, null, 2);
fs.writeFileSync(jsonPath, cleanedJson, 'utf-8');
console.log(`✓ Cleaned preindexed JSON written to: ${jsonPath}`);
console.log();

console.log('='.repeat(100));
console.log('DONE: Anatomical mismatches removed from preindexed JSON');
console.log('='.repeat(100));
