/**
 * Data Enrichment Script
 * Reads ProcedureComplications.csv and adds parenthetical explanations to complications
 * that lack parentheses (...) or slash (/) formatting
 */

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../ProcedureComplications.csv');

// Mapping of complication keywords to their patient-friendly explanations
const complicationExplanations = {
  // Bleeding/Hemorrhage
  'hemorrhage': 'Excessive or unexpected bleeding during the procedure',
  'bleeding': 'Blood loss from the surgical site or incision',
  'hematoma': 'A collection of blood causing swelling or bruising',
  'hematoma (h)': 'A collection of blood causing swelling or bruising',
  
  // Infection
  'infection': 'Bacterial, viral, or fungal infection at the surgical site',
  'wound infection': 'Infection at the incision or surgical cut',
  'abscess': 'A collection of pus requiring drainage',
  'sepsis': 'Whole-body infection spreading from surgical site',
  
  // Pain/Discomfort
  'pain': 'Post-operative soreness or discomfort as tissues heal',
  'discomfort': 'Mild soreness or pressure during recovery',
  'ache': 'Dull or throbbing sensation in the affected area',
  'soreness': 'Tenderness at the surgical site',
  
  // Nerve issues
  'nerve': 'Temporary or permanent injury to nerves causing numbness or weakness',
  'neurovascular': 'Injury to nearby nerves or blood vessels',
  'palsy': 'Temporary or permanent weakness in muscle movement',
  'numbness': 'Loss of sensation in the affected area',
  
  // Organ-specific
  'bowel': 'Intestinal complications during or after surgery',
  'intestinal': 'Complications affecting the intestines',
  'stomach': 'Gastric complications during abdominal surgery',
  'liver': 'Liver stress or injury during procedure',
  'kidney': 'Kidney stress or temporary decrease in function',
  'renal': 'Kidney-related complications',
  'lung': 'Lung complications or breathing difficulties',
  'pulmonary': 'Lung or respiratory system complications',
  'heart': 'Cardiac complications during or after surgery',
  'cardiac': 'Heart-related complications',
  'vascular': 'Blood vessel complications',
  'artery': 'Artery injury or damage',
  'vein': 'Vein injury or damage',
  
  // Specific complications
  'perforation': 'Accidental hole or tear in an organ or tissue',
  'leak': 'Fluid escaping from where tissues were closed or connected',
  'obstruction': 'Blockage preventing normal flow in organs or vessels',
  'blockage': 'Obstruction preventing normal function',
  'adhesion': 'Scar tissue forming between organs causing them to stick together',
  'stricture': 'Narrowing of a passage or tube in the body',
  'stenosis': 'Abnormal narrowing of a blood vessel or valve',
  'thrombosis': 'Blood clot formation in a vein or artery',
  'embolism': 'Blood clot or air bubble traveling through blood vessels',
  'edema': 'Swelling due to fluid accumulation',
  'swelling': 'Fluid accumulation causing enlargement',
  'bruising': 'Discoloration from blood under the skin',
  'hematoma': 'Collection of blood causing swelling',
  
  // Surgical complications
  'anesthetic': 'Reaction to anesthesia or numbing medication',
  'anesthesia': 'Complications from general or local anesthesia',
  'incision': 'Complications at the surgical cut site',
  'suture': 'Issues with stitches or surgical closure',
  'staple': 'Complications with surgical staples',
  'wound': 'Healing complications at the surgical site',
  'dehiscence': 'Wound separation or opening after surgery',
  'fistula': 'Abnormal connection between organs or tissues',
  
  // General symptoms
  'nausea': 'Stomach upset from anesthesia or medications',
  'vomiting': 'Forceful stomach emptying after anesthesia',
  'fever': 'Elevated temperature indicating infection or inflammation',
  'inflammation': 'Body\'s immune response causing redness and swelling',
  'redness': 'Sign of infection or irritation at the site',
  'tenderness': 'Pain when pressure is applied to the area',
  
  // Long-term complications
  'hernia': 'Bulge at incision site due to weakened tissue',
  'scar': 'Tissue formation at the healing site',
  'adhesion': 'Scar tissue causing organs to stick together',
  'chronic': 'Long-lasting or persistent symptoms',
  'recurrence': 'Return of the original condition',
  're-operation': 'Need for additional surgery',
  
  // Specific to procedures
  'appendix': 'Complications related to appendix removal',
  'gallbladder': 'Complications from gallbladder surgery',
  'colon': 'Large intestine complications',
  'rectum': 'End of large intestine complications',
  'stomach': 'Stomach or gastric complications',
  'breast': 'Breast tissue complications',
  'thyroid': 'Thyroid gland complications',
  'prostate': 'Prostate gland complications',
  'uterus': 'Uterine complications',
  'ovary': 'Ovarian complications',
  'bladder': 'Bladder complications',
  'kidney': 'Kidney complications',
  'spleen': 'Spleen complications',
  'pancreas': 'Pancreas complications',
  'liver': 'Liver complications',
  'lung': 'Lung complications',
  'heart': 'Heart complications',
  'brain': 'Brain or nervous system complications',
  'spine': 'Spinal complications',
  'joint': 'Joint complications',
  'bone': 'Bone complications',
  'skin': 'Skin complications',
  'eye': 'Eye complications',
  'ear': 'Ear complications',
  'nose': 'Nasal complications',
  'throat': 'Throat complications',
  'mouth': 'Oral complications',
  'dental': 'Dental complications',
  'vascular': 'Blood vessel complications',
};

/**
 * Generate an explanation for a complication string
 */
function generateExplanation(complicationString) {
  const lowerString = complicationString.toLowerCase();
  
  // Check for existing parentheses or slash
  if (lowerString.includes('(') && lowerString.includes(')')) {
    return null; // Already has parentheses
  }
  if (lowerString.includes('/')) {
    return null; // Already has slash format
  }
  
  // Try to find matching keywords
  for (const [keyword, explanation] of Object.entries(complicationExplanations)) {
    if (lowerString.includes(keyword)) {
      return explanation;
    }
  }
  
  // Return null if no specific match - don't add generic explanations
  return null;
}

/**
 * Parse CSV with quote handling
 */
function parseCSV(content) {
  const lines = content.split('\n');
  const procedures = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line handling quoted fields
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
    
    procedures.push(parts);
  }
  
  return procedures;
}

/**
 * Enrich a complication string with parenthetical explanation
 */
function enrichComplication(complicationString) {
  const explanation = generateExplanation(complicationString);
  if (explanation) {
    return `${complicationString} (${explanation})`;
  }
  return complicationString;
}

/**
 * Main enrichment function
 */
function enrichCSV() {
  console.log('Reading ProcedureComplications.csv...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parsedCSV = parseCSV(csvContent);
  
  const header = parsedCSV[0];
  const dataRows = parsedCSV.slice(1);
  
  let enrichedCount = 0;
  let totalComplications = 0;
  
  const enrichedRows = dataRows.map(row => {
    if (row.length < 5) return row;
    
    const procedure = row[0];
    const specialty = row[1];
    let immediate = row[2] || '';
    let early = row[3] || '';
    let late = row[4] || '';
    
    // Enrich immediate complications
    if (immediate) {
      const immediateParts = immediate.split(';').map(p => p.trim());
      totalComplications += immediateParts.length;
      const enrichedImmediate = immediateParts.map(comp => {
        const enriched = enrichComplication(comp);
        if (enriched !== comp) enrichedCount++;
        return enriched;
      });
      immediate = `"${enrichedImmediate.join('; ')}"`;
    }
    
    // Enrich early complications
    if (early) {
      const earlyParts = early.split(';').map(p => p.trim());
      totalComplications += earlyParts.length;
      const enrichedEarly = earlyParts.map(comp => {
        const enriched = enrichComplication(comp);
        if (enriched !== comp) enrichedCount++;
        return enriched;
      });
      early = `"${enrichedEarly.join('; ')}"`;
    }
    
    // Enrich late complications
    if (late) {
      const lateParts = late.split(';').map(p => p.trim());
      totalComplications += lateParts.length;
      const enrichedLate = lateParts.map(comp => {
        const enriched = enrichComplication(comp);
        if (enriched !== comp) enrichedCount++;
        return enriched;
      });
      late = `"${enrichedLate.join('; ')}"`;
    }
    
    return [procedure, specialty, immediate, early, late];
  });
  
  // Reconstruct CSV
  const enrichedCSV = [
    header.join(';'),
    ...enrichedRows.map(row => row.join(';'))
  ].join('\n');
  
  // Write back to CSV
  fs.writeFileSync(csvPath, enrichedCSV, 'utf-8');
  
  console.log(`✓ Enriched ${enrichedCount} complication strings out of ${totalComplications} total`);
  console.log('✓ Updated ProcedureComplications.csv');
}

// Run the enrichment
enrichCSV();