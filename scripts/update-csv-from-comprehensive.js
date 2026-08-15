/**
 * Utility script to convert comprehensiveClinicalDatabase entries to CSV format
 * This script reads the comprehensiveClinicalDatabase from index.tsx and generates
 * properly formatted CSV entries with patient-friendly complications
 */

const fs = require('fs');
const path = require('path');

// Read the index.tsx file to extract comprehensiveClinicalDatabase
const indexPath = path.join(__dirname, '../src/app/index.tsx');
const csvPath = path.join(__dirname, '../ProcedureComplications.csv');

// Read the index file
const indexContent = fs.readFileSync(indexPath, 'utf-8');

// Extract comprehensiveClinicalDatabase using regex and convert to usable format
const dbMatch = indexContent.match(/const comprehensiveClinicalDatabase = \{([\s\S]*?)\n\};/);
if (!dbMatch) {
  console.error('Could not find comprehensiveClinicalDatabase in index.tsx');
  process.exit(1);
}

// Parse the database more safely by extracting the content and converting to proper JSON
const dbContent = dbMatch[1];
const jsonContent = '{' + dbContent + '}';

// Simple parser to handle the database structure
function parseComprehensiveDatabase(content) {
  const procedures = {};
  const lines = content.split('\n');
  let currentProcedure = null;
  let inArray = false;
  let arrayContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for procedure definition
    const procedureMatch = line.match(/^'([^']+)':\s*\[$/);
    if (procedureMatch) {
      currentProcedure = procedureMatch[1];
      procedures[currentProcedure] = [];
      inArray = true;
      continue;
    }
    
    // Check for end of array
    if (line === '],') {
      inArray = false;
      currentProcedure = null;
      continue;
    }
    
    // Parse complication objects
    if (inArray && currentProcedure && line.startsWith('{')) {
      try {
        // Extract the complication object
        const objMatch = line.match(/\{ id: (\d+), name: '([^']+)', description: '([^']*)', category: '([^']*)', source: '([^']*)' \}/);
        if (objMatch) {
          procedures[currentProcedure].push({
            id: parseInt(objMatch[1]),
            name: objMatch[2],
            description: objMatch[3],
            category: objMatch[4],
            source: objMatch[5]
          });
        }
      } catch (error) {
        console.warn(`Could not parse line: ${line}`);
      }
    }
  }
  
  return procedures;
}

const comprehensiveClinicalDatabase = parseComprehensiveDatabase(jsonContent);

// Simple mapping of procedures to specialties
const specialtyMapping = {
  'vasectomy': 'Urology',
  'cataract surgery': 'Ophthalmology',
  'hysterectomy': 'Gynecology',
  'rhinoplasty': 'Plastic Surgery',
  'tonsillectomy': 'Otolaryngology',
  'appendectomy': 'General Surgery & Gastrointestinal',
  'tracheostomy': 'Otolaryngology',
  'rhinectomy': 'Otolaryngology',
  'arthroscopy': 'Orthopedic Surgery',
  'lobectomy': 'Thoracic Surgery',
  'craniotomy': 'Neurosurgery',
  'thyroidectomy': 'Endocrine Surgery',
  'parathyroidectomy': 'Endocrine Surgery',
  'adrenalectomy': 'Endocrine Surgery',
  'lumpectomy': 'Breast Surgery',
  'pneumonectomy': 'Thoracic Surgery',
  'gastrectomy': 'General Surgery & Gastrointestinal',
  'esophagectomy': 'Thoracic Surgery',
  'colectomy': 'General Surgery & Gastrointestinal',
  'hepatectomy': 'Hepatobiliary Surgery',
  'pancreatectomy': 'Hepatobiliary Surgery',
  'splenectomy': 'General Surgery',
  'nephrectomy': 'Urology',
  'prostatectomy': 'Urology',
  'salpingectomy': 'Gynecology',
  'oophorectomy': 'Gynecology',
  'laminectomy': 'Neurosurgery',
  'discectomy': 'Neurosurgery',
  'arthroplasty': 'Orthopedic Surgery',
  'endarterectomy': 'Vascular Surgery',
  'pericardiectomy': 'Cardiac Surgery',
  'thrombectomy': 'Vascular Surgery',
  'embolectomy': 'Vascular Surgery',
  'gingivectomy': 'Dental Surgery',
  'frenectomy': 'Dental Surgery',
  'gingivoplasty': 'Dental Surgery',
  'extraction': 'Dental Surgery'
};

// Categorize complications by timing based on names and descriptions
function categorizeComplication(complication) {
  const name = complication.name.toLowerCase();
  const description = complication.description.toLowerCase();
  
  // Immediate / Intraoperative
  if (name.includes('intraoperative') || name.includes('immediate') || 
      name.includes('hemorrhage') || name.includes('bleeding') ||
      name.includes('anesthetic') || name.includes('airway') ||
      name.includes('embol') || name.includes('during surgery') ||
      description.includes('intraoperative') || description.includes('during') ||
      description.includes('during surgery') || description.includes('right after')) {
    return 'immediate';
  }
  
  // Early Post-Operative (first 30 days)
  if (name.includes('wound') || name.includes('infection') || name.includes('kidney') ||
      name.includes('post-operative') || name.includes('early') ||
      name.includes('30 days') || name.includes('abscess') ||
      description.includes('first 30 days') || description.includes('early') ||
      description.includes('post-operative') || description.includes('temporary')) {
    return 'early';
  }
  
  // Late / Long-Term
  if (name.includes('chronic') || name.includes('long-term') || name.includes('persistent') ||
      name.includes('permanent') || name.includes('recurrence') ||
      name.includes('hernia') || name.includes('adhesion') ||
      description.includes('months') || description.includes('years') || description.includes('late') ||
      description.includes('over time') || description.includes('gradual')) {
    return 'late';
  }
  
  // Default to early for procedure-specific complications
  return 'early';
}

// Format complication name with patient-friendly title and clinical term
function formatComplication(complication) {
  const name = complication.name;
  const description = complication.description;
  
  // If the name already has clinical terms in parentheses, use as-is
  if (name.includes('(') && name.includes(')')) {
    return name;
  }
  
  // Use the comprehensive database format: "Title (Description)"
  return `${name} (${description})`;
}

// Generate CSV entry for a procedure
function generateCSVEntry(procedureName, complications, specialty = 'General Surgery') {
  const immediate = [];
  const early = [];
  const late = [];
  
  complications.forEach(comp => {
    const category = categorizeComplication(comp);
    const formatted = formatComplication(comp);
    
    if (category === 'immediate') {
      immediate.push(formatted);
    } else if (category === 'early') {
      early.push(formatted);
    } else {
      late.push(formatted);
    }
  });
  
  return `${procedureName};${specialty};"${immediate.join('; ')}";"${early.join('; ')}";"${late.join('; ')}"`;
}

// Read existing CSV to preserve structure
const existingCSV = fs.readFileSync(csvPath, 'utf-8');
const csvLines = existingCSV.split('\n');
const header = csvLines[0];

// Create a map of existing procedures to preserve their specialty and data
const existingProcedures = new Map();
for (let i = 1; i < csvLines.length; i++) {
  const line = csvLines[i].trim();
  if (!line) continue;
  
  // Parse with quote handling
  const parts = [];
  let currentPart = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  parts.push(currentPart); // Add the last part
  
  if (parts.length >= 2) {
    existingProcedures.set(parts[0].trim().toLowerCase(), {
      specialty: parts[1].trim(),
      line: line
    });
  }
}

// Generate updated CSV content
let updatedCSV = header + '\n';

// First, add comprehensive database procedures with improved formatting
Object.keys(comprehensiveClinicalDatabase).forEach(procedureName => {
  const complications = comprehensiveClinicalDatabase[procedureName];
  const specialty = specialtyMapping[procedureName] || 'General Surgery';
  const csvEntry = generateCSVEntry(procedureName, complications, specialty);
  updatedCSV += csvEntry + '\n';
});

// Then add remaining procedures from existing CSV that aren't in comprehensive database
csvLines.slice(1).forEach(line => {
  const procedureName = line.split(';')[0].trim().toLowerCase();
  if (!comprehensiveClinicalDatabase[procedureName] && line.trim()) {
    // Preserve existing procedure data (including specialty and complications)
    updatedCSV += line + '\n';
  }
});

// Write updated CSV
fs.writeFileSync(csvPath, updatedCSV, 'utf-8');
console.log('Updated ProcedureComplications.csv with comprehensive database entries');
console.log(`Total procedures in comprehensive database: ${Object.keys(comprehensiveClinicalDatabase).length}`);
console.log('CSV file updated successfully');