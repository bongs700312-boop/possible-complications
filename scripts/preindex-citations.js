/**
 * Pre-indexing Script for PubMed Citations
 * 
 * This script reads procedures from ProcedureComplications.csv, enriches them with
 * PubMed citations via NCBI E-utilities API, and outputs a preindexed JSON dataset.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const PROCEDURES_CSV_PATH = path.join(__dirname, '../ProcedureComplications.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/data/preindexed_procedures.json');
const PROCEDURES_ASSET_PATH = path.join(__dirname, '../assets/ProcedureComplications.csv');
const MAX_PROCEDURES_TO_PROCESS = parseInt(process.env.MAX_PROCEDURES) || Number.MAX_SAFE_INTEGER; // Default to all procedures
const REQUEST_DELAY_MS = 800; // 800ms delay between requests (conservative rate limiting)
const PROGRESS_LOG_INTERVAL = 50; // Log progress every 50 procedures

// Universal baseline complications (timing-based) - used as fallback when CSV doesn't have specific data
const universalBaselineComplications = {
  '1. Immediate / Intraoperative Complications': [
    {
      name: 'Surgical Mortality / Death during surgery',
      description: 'Risk of fatal intraoperative event or surgical mortality',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Anesthetic Complications',
      description: 'Adverse reactions to general anesthesia, airway/respiratory compromise, cardiac arrhythmias, or anaphylaxis',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Intraoperative Hemorrhage / Heavy Bleeding',
      description: 'Severe blood loss during surgery requiring blood transfusion or intervention',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Accidental Surrounding Tissue / Organ / Neurovascular Damage',
      description: 'Accidental injury to nearby tissues, organs, blood vessels, or nerves during the procedure',
      category: 'Severe',
      source: 'PubMed Literature'
    }
  ],
  '2. Early Post-Operative Complications': [
    {
      name: 'Surgical Site Infection',
      description: 'Infection at the procedure site that may require antibiotics',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Deep Vein Thrombosis (DVT)',
      description: 'Blood clots forming in legs due to immobility after procedure',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Pulmonary Embolism (PE)',
      description: 'Blood clot traveling to lungs causing breathing difficulties',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Early Wound Dehiscence or Acute Bleeding',
      description: 'Wound separation or sudden bleeding requiring intervention in first 30 days',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Post-Operative Respiratory Failure / Atelectasis',
      description: 'Breathing difficulties or partial lung collapse after procedure due to anesthesia effects',
      category: 'Severe',
      source: 'PubMed Literature'
    }
  ],
  '3. Late / Long-Term Complications': [
    {
      name: 'Chronic Pain',
      description: 'Long-term pain at the procedure site',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Nerve Entrapment',
      description: 'Nerves trapped in scar tissue causing chronic discomfort',
      category: 'Severe',
      source: 'PubMed Literature'
    },
    {
      name: 'Recurrence or Re-operation Risks',
      description: 'Need for additional procedure if condition returns or complications develop',
      category: 'Severe',
      source: 'PubMed Literature'
    }
  ]
};

/**
 * Read and parse CSV file
 */
function readCSV(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return parseCSVContent(content);
    }
  } catch (error) {
    console.log(`Failed to read ${filePath}:`, error.message);
  }
  
  // Try alternative path
  try {
    if (fs.existsSync(PROCEDURES_ASSET_PATH)) {
      const content = fs.readFileSync(PROCEDURES_ASSET_PATH, 'utf-8');
      return parseCSVContent(content);
    }
  } catch (error) {
    console.log(`Failed to read ${PROCEDURES_ASSET_PATH}:`, error.message);
  }
  
  return [];
}

/**
 * Parse CSV content with semicolon delimiter
 * Now handles new format with timing-based complication columns
 */
function parseCSVContent(content) {
  const lines = content.split('\n');
  const procedures = [];
  
  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by semicolon
    const parts = line.split(';');
    if (parts.length >= 2) {
      const procedure = parts[0].trim();
      const specialty = parts[1].trim();
      
      // Parse complication columns if they exist (new format)
      let immediateComplications = [];
      let earlyComplications = [];
      let lateComplications = [];
      
      if (parts.length >= 5) {
        // Parse Immediate / Intraoperative Complications
        if (parts[2] && parts[2].trim()) {
          immediateComplications = parts[2].trim().split(';').map(c => c.trim()).filter(c => c);
        }
        
        // Parse Early Post-Operative Complications
        if (parts[3] && parts[3].trim()) {
          earlyComplications = parts[3].trim().split(';').map(c => c.trim()).filter(c => c);
        }
        
        // Parse Late Post-Operative Complications
        if (parts[4] && parts[4].trim()) {
          lateComplications = parts[4].trim().split(';').map(c => c.trim()).filter(c => c);
        }
      }
      
      procedures.push({
        procedure: procedure,
        specialty: specialty,
        immediateComplications: immediateComplications,
        earlyComplications: earlyComplications,
        lateComplications: lateComplications
      });
    }
  }
  
  return procedures;
}

/**
 * Make HTTPS request to NCBI E-utilities API with timeout and retry logic
 */
async function fetchAPI(url, timeout = 10000, maxRetries = 5) {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      return await fetchAPIWithTimeout(url, timeout);
    } catch (error) {
      retryCount++;
      
      // Check if error is rate limiting (429) or network error
      if (error.message.includes('429') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET') || error.message.includes('timeout')) {
        const backoffDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 20000); // Exponential backoff, max 20s
        console.log(`  Rate limit or network error, retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        // For other errors, don't retry
        throw error;
      }
    }
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded for request: ${url}`);
}

/**
 * Make a single HTTPS request with timeout
 */
function fetchAPIWithTimeout(url, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
    
    https.get(url, (res) => {
      clearTimeout(timeoutId);
      
      // Check for HTTP error status
      if (res.statusCode === 429) {
        reject(new Error('429 Too Many Requests'));
        return;
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Extract key words from procedure name for relevance validation
 */
function extractKeyWords(procedure) {
  // Remove common surgical terms and suffixes
  const stopWords = [
    'surgery', 'surgical', 'procedure', 'operation', 'treatment', 'therapy',
    'repair', 'reconstruction', 'replacement', 'excision', 'resection', 'removal',
    'implantation', 'insertion', 'placement', 'transplantation', 'transplant',
    'bypass', 'graft', 'anastomosis', 'fistula', 'shunt', 'stent',
    'decompression', 'release', 'closure', 'creation', 'formation',
    'biopsy', 'puncture', 'drainage', 'aspiration', 'injection',
    'management', 'control', 'regulation', 'restoration', 'restoration',
    'left', 'right', 'bilateral', 'unilateral', 'partial', 'total', 'complete',
    'primary', 'secondary', 'revision', 'emergency', 'elective',
    'minimal', 'invasive', 'open', 'laparoscopic', 'endoscopic', 'percutaneous',
    'transcatheter', 'endovascular', 'robotic', 'assisted', 'computer-assisted',
    'with', 'and', 'for', 'of', 'in', 'on', 'at', 'by', 'or'
  ];
  
  // Split procedure name into words
  const words = procedure.toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove special characters except hyphens
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // If no meaningful words found, return the first few original words
  if (words.length === 0) {
    return procedure.toLowerCase()
      .split(/\s+/)
      .slice(0, 3)
      .filter(word => word.length > 2);
  }
  
  return words;
}

/**
 * Check if article title is relevant to the procedure
 */
function isArticleRelevant(articleTitle, procedureKeyWords) {
  const titleLower = articleTitle.toLowerCase();
  
  // Check if at least one key word from procedure appears in the title
  for (const keyWord of procedureKeyWords) {
    if (titleLower.includes(keyWord)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fetch PubMed citations for a procedure with strict querying and relevance validation
 */
async function fetchPubMedCitations(procedure, verbose = false) {
  try {
    // Extract key words for relevance validation
    const keyWords = extractKeyWords(procedure);
    
    // Use strict querying with quotes and title/abstract field search
    const strictSearchTerm = `"${procedure}"[Title/Abstract] AND complications`;
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(strictSearchTerm)}&retmode=json&retmax=5`;
    
    if (verbose) {
      console.log(`Fetching citations for: ${procedure}`);
      console.log(`  Key words for relevance: ${keyWords.join(', ')}`);
    }
    
    const searchData = await fetchAPI(searchUrl, 10000); // 10 second timeout
    
    if (!searchData.esearchresult || !searchData.esearchresult.idlist || searchData.esearchresult.idlist.length === 0) {
      if (verbose) {
        console.log(`  No PubMed results found for ${procedure}, using fallback citation`);
      }
      // Return fallback citation with search URL
      return [{
        pmid: null,
        title: `Search PubMed for "${procedure} Complications"`,
        pubDate: 'N/A',
        source: 'PubMed Search',
        url: `https://pubmed.ncbi.nlm.nih.gov/?term="${encodeURIComponent(procedure)}"+complications`
      }];
    }
    
    const pmids = searchData.esearchresult.idlist;
    const allCitations = [];
    const relevantCitations = [];
    
    // Fetch summaries for each PMID
    for (const pmid of pmids) {
      try {
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
        const summaryData = await fetchAPI(summaryUrl, 8000); // 8 second timeout
        
        if (summaryData.result && summaryData.result[pmid]) {
          const article = summaryData.result[pmid];
          const citation = {
            pmid: pmid,
            title: article.title || 'Unknown Title',
            pubDate: article.pubdate || 'Unknown Date',
            source: article.source || 'PubMed',
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          };
          
          allCitations.push(citation);
          
          // Check relevance
          if (isArticleRelevant(citation.title, keyWords)) {
            relevantCitations.push(citation);
            if (verbose) {
              console.log(`  ✓ Relevant article: ${citation.title.substring(0, 60)}...`);
            }
          } else {
            if (verbose) {
              console.log(`  ✗ Irrelevant article: ${citation.title.substring(0, 60)}...`);
            }
          }
        }
      } catch (error) {
        if (verbose) {
          console.log(`  Error fetching summary for PMID ${pmid}:`, error.message);
        }
      }
    }
    
    // If we have relevant citations, return them (max 2)
    if (relevantCitations.length > 0) {
      if (verbose) {
        console.log(`  Found ${relevantCitations.length} relevant citations for ${procedure}`);
      }
      return relevantCitations.slice(0, 2);
    }
    
    // If no relevant citations found, use fallback
    if (verbose) {
      console.log(`  No relevant citations found for ${procedure}, using fallback citation`);
    }
    return [{
      pmid: null,
      title: `Search PubMed for "${procedure} Complications"`,
      pubDate: 'N/A',
      source: 'PubMed Search',
      url: `https://pubmed.ncbi.nlm.nih.gov/?term="${encodeURIComponent(procedure)}"+complications`
    }];
    
  } catch (error) {
    if (verbose) {
      console.log(`Error fetching PubMed citations for ${procedure}:`, error.message);
    }
    // Return fallback citation even on error
    return [{
      pmid: null,
      title: `Search PubMed for "${procedure} Complications"`,
      pubDate: 'N/A',
      source: 'PubMed Search',
      url: `https://pubmed.ncbi.nlm.nih.gov/?term="${encodeURIComponent(procedure)}"+complications`
    }];
  }
}

/**
 * Create complication objects from complication names
 */
function createComplicationObjects(complicationNames, category) {
  return complicationNames.map((name, index) => ({
    id: `csv-${Date.now()}-${index}`,
    name: name,
    description: `${name} - ${category}`,
    category: 'Severe',
    source: 'Clinical Literature'
  }));
}

/**
 * Enrich procedure with specific complications from CSV or fallback to baseline
 */
function enrichProcedure(procedure, citations) {
  let complications;
  
  // Check if CSV has specific complication data
  if (procedure.immediateComplications && procedure.immediateComplications.length > 0 ||
      procedure.earlyComplications && procedure.earlyComplications.length > 0 ||
      procedure.lateComplications && procedure.lateComplications.length > 0) {
    // Use CSV-specific complications
    complications = {
      '1. Immediate / Intraoperative Complications': createComplicationObjects(procedure.immediateComplications || [], 'Immediate'),
      '2. Early Post-Operative Complications': createComplicationObjects(procedure.earlyComplications || [], 'Early'),
      '3. Late / Long-Term Complications': createComplicationObjects(procedure.lateComplications || [], 'Late')
    };
  } else {
    // Use universal baseline as fallback
    complications = universalBaselineComplications;
  }
  
  return {
    name: procedure.procedure,
    specialty: procedure.specialty,
    complications: complications,
    citations: citations,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Main pre-indexing function
 */
async function preindexProcedures() {
  console.log('Starting PubMed citation pre-indexing...');
  
  // Read procedures from CSV
  const procedures = readCSV(PROCEDURES_CSV_PATH);
  
  if (procedures.length === 0) {
    console.error('No procedures found in CSV file');
    process.exit(1);
  }
  
  console.log(`Found ${procedures.length} procedures in CSV`);
  console.log(`Processing ${MAX_PROCEDURES_TO_PROCESS === Number.MAX_SAFE_INTEGER ? 'all' : MAX_PROCEDURES_TO_PROCESS} procedures (set MAX_PROCEDURES environment variable to override)`);
  console.log(`Rate limiting: ${REQUEST_DELAY_MS}ms delay between requests (under NCBI's 3 requests/second limit)`);
  
  // Limit procedures if MAX_PROCEDURES_TO_PROCESS is set
  const proceduresToProcess = MAX_PROCEDURES_TO_PROCESS === Number.MAX_SAFE_INTEGER 
    ? procedures 
    : procedures.slice(0, MAX_PROCEDURES_TO_PROCESS);
  
  // Enrich each procedure with PubMed citations
  const enrichedProcedures = [];
  let successCount = 0;
  let fallbackCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < proceduresToProcess.length; i++) {
    const procedure = proceduresToProcess[i];
    
    // Progress logging - before processing each procedure
    if ((i + 1) % PROGRESS_LOG_INTERVAL === 0 || i === 0) {
      console.log(`Progress: ${i + 1}/${proceduresToProcess.length} procedures processed (${Math.round((i + 1) / proceduresToProcess.length * 100)}%)`);
    }
    
    try {
      // Fetch PubMed citations with rate limiting delay
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
      
      const citations = await fetchPubMedCitations(procedure.procedure, true);
      
      // Check if fallback citation was used
      if (citations.length > 0 && citations[0].pmid === null) {
        fallbackCount++;
      } else {
        successCount++;
      }
      
      const enriched = enrichProcedure(procedure, citations);
      enrichedProcedures.push(enriched);
    } catch (error) {
      errorCount++;
      console.error(`  Error processing ${procedure.procedure}:`, error.message);
      // Still add the procedure with fallback citation even on error
      const fallbackCitations = [{
        pmid: null,
        title: `Search for "${procedure.procedure} complications" on PubMed`,
        pubDate: 'N/A',
        source: 'PubMed Search',
        url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(procedure.procedure + ' complications')}`
      }];
      const enriched = enrichProcedure(procedure, fallbackCitations);
      enrichedProcedures.push(enriched);
    }
  }
  
  // Final progress log
  console.log(`Progress: ${proceduresToProcess.length}/${proceduresToProcess.length} procedures processed (100%)`);
  
  // Write output to JSON
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enrichedProcedures, null, 2), 'utf-8');
  console.log(`\nPre-indexed procedures written to: ${OUTPUT_PATH}`);
  console.log(`Total procedures enriched: ${enrichedProcedures.length}`);
  console.log(`Successful citations: ${successCount}`);
  console.log(`Fallback citations: ${fallbackCount}`);
  console.log(`Errors handled: ${errorCount}`);
  console.log(`Skipped procedures: ${procedures.length - proceduresToProcess.length}`);
}

// Run the pre-indexing
preindexProcedures().catch(error => {
  console.error('Pre-indexing failed:', error);
  process.exit(1);
});
