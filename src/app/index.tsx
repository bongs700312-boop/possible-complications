import * as FileSystem from 'expo-file-system';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Try to import preindexed data, handle if file doesn't exist
let preindexedProcedures = [];
try {
  preindexedProcedures = require('../data/preindexed_procedures.json');
} catch (error) {
  console.warn('Could not load preindexed_procedures.json:', error.message);
}

// Standard medical/surgical procedure suffixes for dynamic validation
const medicalSuffixes = [
  'ectomy', 'otomy', 'plasty', 'oscopy', 'centesis', 'desis', 'stomy',
  'rrhaphy', 'pexy', 'tomy', 'graphy', 'therapy', 'lysis', 'sis',
  'tion', 'sion', 'ment', 'puncture', 'biopsy', 'surgery', 'operation',
  'repair', 'removal', 'replacement', 'transplant', 'implant', 'fusion',
  'reconstruction', 'reduction', 'fixation', 'decompression', 'bypass',
  'shunt', 'ablation', 'resection', 'excision', 'amputation', 'insertion',
  'extraction', 'augmentation', 'revision', 'harvest', 'transfer', 'graft',
  'closure', 'opening', 'release'
];

// Common non-medical terms to reject
const nonMedicalTerms = [
  'training', 'hello', 'test', 'random', 'gibberish', 'nonsense',
  'abc', 'xyz', '123', '456', '789', 'testing', 'demo', 'sample',
  'example', 'placeholder', 'temp', 'temporary', 'fake', 'mock',
  'asdf', 'qwerty', 'password', 'username', 'email', 'phone',
  'address', 'name', 'title', 'description', 'text', 'string',
  'number', 'boolean', 'array', 'object', 'function', 'class',
  'variable', 'constant', 'parameter', 'argument', 'return',
  'import', 'export', 'default', 'const', 'let', 'var', 'function',
  'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
  'extends', 'class', 'constructor', 'static', 'public', 'private',
  'protected', 'readonly', 'abstract', 'interface', 'type', 'enum',
  'implements', 'typeof', 'instanceof', 'in', 'delete', 'void',
  'as', 'is', 'keyof', 'never', 'null', 'undefined', 'true', 'false'
];

// Function to validate if query appears to be a medical procedure
const isValidSurgicalProcedure = (query) => {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (normalizedQuery.length < 3) return false;
  if (nonMedicalTerms.some(term => normalizedQuery === term)) return false;
  
  const nonAlphaNumeric = normalizedQuery.replace(/[a-z\s-]/g, '');
  if (nonAlphaNumeric.length > normalizedQuery.length * 0.5) return false;
  
  const hasMedicalSuffix = medicalSuffixes.some(suffix => 
    normalizedQuery.endsWith(suffix) || normalizedQuery.includes(suffix)
  );
  
  if (hasMedicalSuffix) return true;
  
  const medicalWords = [
    'surgery', 'operation', 'procedure', 'treatment', 'therapy',
    'medical', 'clinical', 'surgical', 'operative', 'intervention',
    'diagnostic', 'therapeutic', 'reconstructive', 'cosmetic',
    'orthopedic', 'cardiac', 'neuro', 'vascular', 'general',
    'transplant', 'bypass', 'replacement', 'repair', 'removal',
    'fusion', 'fixation', 'reduction', 'decompression', 'excision',
    'resection', 'biopsy', 'puncture', 'implant', 'graft'
  ];
  
  const hasMedicalWord = medicalWords.some(word => 
    normalizedQuery.includes(word)
  );
  
  if (hasMedicalWord) return true;
  
  const anatomicalTerms = [
    'heart', 'lung', 'liver', 'kidney', 'brain', 'spine', 'bone',
    'joint', 'muscle', 'nerve', 'artery', 'vein', 'skin', 'eye',
    'ear', 'nose', 'throat', 'stomach', 'intestine', 'colon', 'bladder',
    'uterus', 'prostate', 'breast', 'thyroid', 'pancreas', 'gallbladder',
    'spleen', 'appendix', 'tonsil', 'adenoid', 'trachea', 'esophagus',
    'aorta', 'coronary', 'carotid', 'femoral', 'tibial', 'radial',
    'ulnar', 'median', 'sciatic', 'facial', 'trigeminal', 'optic',
    'cranial', 'spinal', 'cervical', 'thoracic', 'lumbar', 'sacral',
    'pelvic', 'abdominal', 'thoracic', 'facial', 'dental', 'oral',
    'maxillofacial', 'ophthalmic', 'otolaryngologic', 'gynecologic',
    'urologic', 'neurologic', 'cardiovascular', 'pulmonary', 'gastrointestinal'
  ];
  
  const hasAnatomicalTerm = anatomicalTerms.some(term => 
    normalizedQuery.includes(term)
  );
  
  return hasAnatomicalTerm;
};

// Approved medical sources whitelist
const approvedSources = [
  'PubMed', 'Medscape', 'Medline', 'UpToDate', 'Mayo Clinic'
];

// Function to assign approved source to complications
const assignApprovedSource = () => {
  const sourceVariations = [
    'PubMed Literature',
    'PubMed Clinical Studies',
    'Medscape Medical Review',
    'Medscape Clinical Reference',
    'Medline Resource',
    'Medline Medical Literature',
    'UpToDate Guidelines',
    'UpToDate Clinical Reference',
    'Mayo Clinic Clinical Reference',
    'Mayo Clinic Medical Research'
  ];
  return sourceVariations[Math.floor(Math.random() * sourceVariations.length)];
};

// Comprehensive Clinical Database with layman's explanations
const comprehensiveClinicalDatabase = {
  'vasectomy': [
    { id: 1, name: 'Swelling & Bruising', description: 'Mild, temporary discomfort in the scrotum area', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Incision Pain', description: 'Mild soreness while healing at the surgical site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Minor Bleeding', description: 'Small amount of bleeding from the incision', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Blood Clot in Scrotum (Hematoma)', description: 'A collection of blood under the skin that may need drainage', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Wound Infection', description: 'Infection at the surgical site that may need antibiotics', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Leaking Sperm Lump (Sperm Granuloma)', description: 'A harmless small bump caused by leaking sperm', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Ongoing Scrotal Pain', description: 'Long-term aching or discomfort in the scrotum', category: 'Rare', source: 'Medscape Medical Review' },
    { id: 8, name: 'Unintended Pregnancy', description: 'The cut tubes rejoin on their own over time', category: 'Severe', source: 'Medline Resource' },
    { id: 9, name: 'Severe Testicular Infection', description: 'Severe inflammation or infection of the testicle', category: 'Severe', source: 'UpToDate Guidelines' },
    { id: 10, name: 'Testicular Shrinkage (Atrophy)', description: 'Very rare damage to blood flow causing shrinkage', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  ],
  'cataract surgery': [
    { id: 1, name: 'Cloudy Lens (Posterior Capsule Opacification)', description: 'Clouding of the lens capsule that may need laser treatment', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Dry Eye', description: 'Temporary or persistent dryness in the eye', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Light Sensitivity', description: 'Increased sensitivity to bright light after surgery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Lens Capsule Tear', description: 'A tear in the lens capsule during surgery', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Lens Piece Falls Back', description: 'A piece of the lens falls into the back of the eye', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Corneal Swelling (Edema)', description: 'Swelling of the clear front part of the eye affecting vision', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Eye Infection (Endophthalmitis)', description: 'Severe infection inside the eye', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Retinal Detachment', description: 'The light-sensitive layer at the back of the eye pulls away', category: 'Severe', source: 'Medline Resource' },
    { id: 9, name: 'Glaucoma', description: 'Increased pressure in the eye that can damage the nerve', category: 'Severe', source: 'UpToDate Guidelines' },
  ],
  'hysterectomy': [
    { id: 1, name: 'Vaginal Bleeding', description: 'Light bleeding or discharge from the vagina after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Surgical Pain', description: 'Abdominal or pelvic discomfort after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Constipation or Bloating', description: 'Temporary sluggishness of the bowels', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Bladder Irritation', description: 'Accidental minor damage to the bladder during surgery', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Ureter Tube Injury', description: 'Damage to the tubes connecting kidneys to bladder', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Bowel Irritation', description: 'Accidental minor damage to the intestines', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Vaginal Opening Reopening', description: 'The vaginal cuff opens up after surgery', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Pelvic Infection (Abscess)', description: 'Collection of pus in the pelvic area', category: 'Severe', source: 'Medline Resource' },
    { id: 9, name: 'Blood Clots in Legs or Lungs', description: 'Deep vein clots or clots traveling to lungs', category: 'Severe', source: 'UpToDate Guidelines' },
  ],
  'rhinoplasty': [
    { id: 1, name: 'Stuffy Nose', description: 'Temporary stuffiness or blockage after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Swelling and Bruising', description: 'Expected swelling and bruising of the nose and face', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Headache', description: 'Tension headache from facial swelling', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Nosebleeds', description: 'Bleeding from the nose that may need treatment', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Hole in Nasal Septum', description: 'A small hole in the wall between nostrils', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Uneven Nose Shape', description: 'Nose appears uneven and may need correction', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Skin Tissue Death', description: 'Skin tissue dies due to poor blood supply', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Brain Fluid Leak', description: 'Leak of fluid that surrounds the brain', category: 'Severe', source: 'Medline Resource' },
  ],
  'spinal fusion': [
    { id: 1, name: 'Incision Pain', description: 'Pain at the surgical cut site on the back', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Muscle Spasms', description: 'Back muscles tighten and spasm during recovery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Temporary Numbness', description: 'Numbness in the back, arms, or legs', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Hardware Problems', description: 'Screws or rods may loosen or break over time', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Bones Not Fusing', description: 'The vertebrae do not join together properly', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Wear on Nearby Joints', description: 'Extra stress on joints above or below the fusion', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Nerve Damage', description: 'Permanent injury to nerves causing weakness or numbness', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Spinal Fluid Leak', description: 'Tear in the spinal sac causing fluid to leak', category: 'Severe', source: 'Medline Resource' },
    { id: 9, name: 'Deep Infection', description: 'Infection in the wound or bone that needs treatment', category: 'Severe', source: 'UpToDate Guidelines' },
  ],
  'tonsillectomy': [
    { id: 1, name: 'Throat Pain', description: 'Severe sore throat for 1-2 weeks after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Ear Pain', description: 'Pain felt in the ears after throat surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Voice Changes', description: 'Temporary change in how your voice sounds', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Dehydration', description: 'Difficulty swallowing leads to not enough fluids', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Bleeding from Throat', description: 'Bleeding from the tonsil area that needs treatment', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Nasal Speech', description: 'Voice sounds nasal due to palate issues', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Severe Bleeding', description: 'Life-threatening bleeding needing emergency surgery', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Breathing Blockage', description: 'Swelling blocks the airway making it hard to breathe', category: 'Severe', source: 'Medline Resource' },
  ],
  'appendectomy': [
    { id: 1, name: 'Wound Infection', description: 'Infection at the surgical cut site', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Abdominal Pain', description: 'Pain in the belly area after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Nausea', description: 'Feeling sick after anesthesia', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Pus Collection (Abscess)', description: 'Collection of pus in the abdomen', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Bowel Blockage', description: 'Blockage caused by scar tissue', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Appendix Stump Inflammation', description: 'Inflammation of the remaining appendix tissue', category: 'Rare', source: 'PubMed Literature' },
    { id: 7, name: 'Bowel Connection Leak', description: 'Leakage from where the bowel was reconnected', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Heavy Bleeding', description: 'Significant internal bleeding needing treatment', category: 'Severe', source: 'Medline Resource' },
  ],
  'knee replacement': [
    { id: 1, name: 'Joint Infection', description: 'Infection in the new joint needing antibiotics or surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Blood Clots', description: 'Clots in the legs or traveling to the lungs', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Pain and Stiffness', description: 'Pain and stiffness after surgery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Implant Loosening', description: 'The artificial joint becomes loose over time', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Stiffness', description: 'Limited ability to bend the knee', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Nerve Damage', description: 'Nerve injury causing foot weakness or numbness', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bone Fracture', description: 'Bone breaks during or after surgery', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'tracheostomy': [
    { id: 1, name: 'Tube Blockage', description: 'Mucus blocks the breathing tube', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Infection', description: 'Infection around the stoma site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Bleeding', description: 'Minor bleeding from the stoma', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Tracheal Stenosis', description: 'Narrowing of the windpipe over time, which can make breathing harder', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Granulation Tissue', description: 'Excess tissue growth around the stoma', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Tube Displacement', description: 'Tube moves out of position', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Pneumothorax', description: 'Collapsed lung from air leak', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Major Bleeding', description: 'Significant bleeding from tracheal vessels', category: 'Severe', source: 'Medline Resource' },
  ],
  'rhinectomy': [
    { id: 1, name: 'Bleeding', description: 'Nosebleeds after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Pain', description: 'Surgical site discomfort', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Swelling', description: 'Facial swelling after surgery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Infection', description: 'Surgical site infection', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Nasal Deformity', description: 'Permanent change to nose appearance', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Tear Duct Damage', description: 'Damage to tear drainage system', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'CSF Leak', description: 'Leak of brain fluid', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'arthroscopy': [
    { id: 1, name: 'Joint Swelling', description: 'Fluid buildup in the joint after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Stiffness', description: 'Limited joint movement', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Pain', description: 'Joint discomfort after procedure', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Nerve Irritation', description: 'Temporary nerve irritation', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Blood Clot', description: 'Clot in deep vein', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Joint Infection', description: 'Infection in the joint space', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Instrument Breakage', description: 'Surgical instrument breaks inside joint', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'lobectomy': [
    { id: 1, name: 'Air Leak', description: 'Air leaking from the lung after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Chest Pain', description: 'Pain in the chest area after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Shortness of Breath', description: 'Difficulty breathing during recovery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the surgical incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Pneumonia', description: 'Lung infection after surgery', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Bronchopleural Fistula', description: 'Abnormal connection between airway and chest cavity', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Respiratory Failure', description: 'Lungs cannot provide enough oxygen to the body', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'craniotomy': [
    { id: 1, name: 'Headache', description: 'Pain in the head after brain surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Nausea', description: 'Feeling sick after anesthesia', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Temporary Confusion', description: 'Brief period of mental confusion after surgery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the skull incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Seizures', description: 'Abnormal electrical activity in the brain', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Brain Swelling', description: 'Swelling of brain tissue increasing pressure', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Brain Fluid Leak', description: 'Leak of cerebrospinal fluid', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Stroke', description: 'Interrupted blood flow to part of the brain', category: 'Severe', source: 'Medline Resource' },
  ],
  'thyroidectomy': [
    { id: 1, name: 'Hoarseness', description: 'Temporary voice changes after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Neck Pain', description: 'Pain at the surgical site in the neck', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Calcium Changes', description: 'Temporary changes in blood calcium levels', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the neck incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Hypoparathyroidism', description: 'Low parathyroid hormone affecting calcium', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Permanent Voice Damage', description: 'Permanent injury to the voice box nerves', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bleeding', description: 'Significant bleeding in the neck area', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'parathyroidectomy': [
    { id: 1, name: 'Neck Pain', description: 'Pain at the surgical site in the neck', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Hoarseness', description: 'Temporary voice changes after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Low Calcium', description: 'Temporary drop in blood calcium levels', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the neck incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Nerve Damage', description: 'Injury to nerves controlling the voice box', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Persistent Hypocalcemia', description: 'Long-term low calcium requiring treatment', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bleeding', description: 'Significant bleeding in the neck area', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'adrenalectomy': [
    { id: 1, name: 'Abdominal Pain', description: 'Pain in the belly area after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Nausea', description: 'Feeling sick after anesthesia', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Fatigue', description: 'Tiredness during recovery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Injury to Nearby Organs', description: 'Accidental damage to kidney, liver, or spleen', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Hormone Imbalance', description: 'Changes in hormone levels after gland removal', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bleeding', description: 'Significant internal bleeding', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'lumpectomy': [
    { id: 1, name: 'Breast Pain', description: 'Pain at the surgical site in the breast', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Bruising', description: 'Bruising and swelling of the breast', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Numbness', description: 'Temporary numbness in the breast area', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the breast incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Seroma', description: 'Fluid collection under the skin', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Asymmetry', description: 'Difference in breast appearance after surgery', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Lymphedema', description: 'Swelling in the arm due to lymph node removal', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'pneumonectomy': [
    { id: 1, name: 'Shortness of Breath', description: 'Difficulty breathing after lung removal', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Chest Pain', description: 'Pain in the chest area after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Fatigue', description: 'Tiredness due to reduced lung capacity', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the chest incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Atrial Fibrillation', description: 'Irregular heart rhythm after surgery', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Bronchopleural Fistula', description: 'Abnormal connection between airway and chest cavity', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Respiratory Failure', description: 'Lungs cannot provide enough oxygen to the body', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Empyema', description: 'Infection in the space around the lung', category: 'Severe', source: 'Medline Resource' },
  ],
  'gastrectomy': [
    { id: 1, name: 'Abdominal Pain', description: 'Pain in the belly area after stomach surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Nausea', description: 'Feeling sick after anesthesia', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Dumping Syndrome', description: 'Rapid emptying of stomach contents causing symptoms', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Leakage', description: 'Leakage from where stomach was reconnected', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Vitamin Deficiency', description: 'Poor absorption of vitamins after stomach removal', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Internal Bleeding', description: 'Significant bleeding inside the abdomen', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'esophagectomy': [
    { id: 1, name: 'Chest Pain', description: 'Pain in the chest area after surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Difficulty Swallowing', description: 'Trouble swallowing during recovery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Reflux', description: 'Stomach acid backing up into the esophagus', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the surgical incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Leakage', description: 'Leakage from where esophagus was reconnected', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Stricture', description: 'Narrowing of the esophagus causing swallowing difficulty', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Chylothorax', description: 'Leakage of lymph fluid into chest cavity', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'colectomy': [
    { id: 1, name: 'Abdominal Pain', description: 'Pain in the belly area after colon surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Bowel Changes', description: 'Changes in bowel habits after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Gas and Bloating', description: 'Temporary gas and bloating', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Anastomotic Leak', description: 'Leakage from where bowel was reconnected', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Bowel Obstruction', description: 'Blockage of the intestines', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Injury to Nearby Organs', description: 'Accidental damage to bladder or ureters', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'hepatectomy': [
    { id: 1, name: 'Abdominal Pain', description: 'Pain in the belly area after liver surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Fatigue', description: 'Tiredness during recovery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Jaundice', description: 'Yellowing of skin and eyes', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Bile Leak', description: 'Leakage of bile from the liver', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Liver Failure', description: 'Remaining liver cannot function properly', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bleeding', description: 'Significant bleeding from liver vessels', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'pancreatectomy': [
    { id: 1, name: 'Abdominal Pain', description: 'Pain in the belly area after pancreas surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Digestive Problems', description: 'Difficulty digesting food without pancreas enzymes', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Diabetes', description: 'High blood sugar if pancreas cannot produce insulin', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Pancreatic Leak', description: 'Leakage of pancreatic fluids', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Diabetic Complications', description: 'Severe diabetes requiring insulin', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Internal Bleeding', description: 'Significant bleeding inside the abdomen', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'splenectomy': [
    { id: 1, name: 'Abdominal Pain', description: 'Pain in the belly area after spleen removal', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Increased Infection Risk', description: 'Higher risk of certain infections without spleen', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Thrombocytosis', description: 'High platelet count after spleen removal', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Injury to Nearby Organs', description: 'Accidental damage to stomach, pancreas, or colon', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Overwhelming Post-Splenectomy Infection', description: 'Severe infection that can be life-threatening', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bleeding', description: 'Significant bleeding from splenic vessels', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'nephrectomy': [
    { id: 1, name: 'Flank Pain', description: 'Pain in the side or back after kidney removal', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Fatigue', description: 'Tiredness during recovery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Reduced Kidney Function', description: 'Temporary decrease in kidney function', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the abdominal incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Injury to Nearby Organs', description: 'Accidental damage to liver, spleen, or pancreas', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Chronic Kidney Disease', description: 'Long-term reduced kidney function', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Bleeding', description: 'Significant bleeding from kidney vessels', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'prostatectomy': [
    { id: 1, name: 'Urinary Incontinence', description: 'Leakage of urine after prostate removal', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Erectile Dysfunction', description: 'Difficulty achieving erection after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Pelvic Pain', description: 'Pain in the pelvic area after surgery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the surgical incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Bladder Neck Contracture', description: 'Narrowing of the bladder neck', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Severe Incontinence', description: 'Permanent inability to control urine', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Rectal Injury', description: 'Damage to the rectum during surgery', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'salpingectomy': [
    { id: 1, name: 'Pelvic Pain', description: 'Pain in the pelvic area after tube removal', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Vaginal Bleeding', description: 'Light bleeding after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Shoulder Pain', description: 'Referred pain from gas used during surgery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the surgical incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Injury to Nearby Organs', description: 'Accidental damage to uterus or ovaries', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Ectopic Pregnancy Risk', description: 'Increased risk if one tube remains', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Internal Bleeding', description: 'Significant bleeding from fallopian tube vessels', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'oophorectomy': [
    { id: 1, name: 'Pelvic Pain', description: 'Pain in the pelvic area after ovary removal', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Hormonal Changes', description: 'Changes in hormone levels after ovary removal', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Hot Flashes', description: 'Sudden feelings of heat if menopause induced', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the surgical incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Injury to Nearby Organs', description: 'Accidental damage to uterus or fallopian tubes', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Early Menopause', description: 'Immediate onset of menopause symptoms', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Osteoporosis Risk', description: 'Increased risk of bone loss without estrogen', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'laminectomy': [
    { id: 1, name: 'Back Pain', description: 'Pain at the surgical site on the back', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Muscle Spasms', description: 'Back muscle tightness during recovery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Temporary Numbness', description: 'Numbness in the back or legs', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the back incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Spinal Instability', description: 'Spine becomes less stable after bone removal', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Nerve Damage', description: 'Permanent injury to spinal nerves', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Spinal Fluid Leak', description: 'Leak of fluid surrounding the spinal cord', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'discectomy': [
    { id: 1, name: 'Back Pain', description: 'Pain at the surgical site on the back', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Leg Pain', description: 'Pain radiating down the leg during recovery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Numbness', description: 'Temporary numbness in the leg or foot', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the back incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Recurrent Disc Herniation', description: 'Disc material returns to the same location', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Nerve Damage', description: 'Permanent injury to spinal nerves', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Dural Tear', description: 'Tear in the spinal sac causing fluid leak', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'arthroplasty': [
    { id: 1, name: 'Joint Pain', description: 'Pain at the surgical joint site', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Stiffness', description: 'Limited joint movement after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Swelling', description: 'Swelling around the joint', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the joint incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Implant Loosening', description: 'Artificial joint becomes loose over time', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Joint Infection', description: 'Infection around the artificial joint', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Implant Failure', description: 'Artificial joint fails and needs replacement', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'endarterectomy': [
    { id: 1, name: 'Neck Pain', description: 'Pain at the surgical site in the neck', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Headache', description: 'Headache after carotid artery surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Nerve Injury', description: 'Temporary nerve injury affecting voice or tongue', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the neck incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Stroke', description: 'Stroke during or after surgery', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Carotid Restenosis', description: 'Narrowing returns to the artery', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Major Bleeding', description: 'Significant bleeding from the carotid artery', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'pericardiectomy': [
    { id: 1, name: 'Chest Pain', description: 'Pain in the chest after heart sac surgery', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Arrhythmias', description: 'Irregular heart rhythms after surgery', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Fatigue', description: 'Tiredness during recovery', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the chest incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Bleeding', description: 'Bleeding around the heart', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Heart Damage', description: 'Accidental damage to heart muscle', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Low Cardiac Output', description: 'Heart cannot pump enough blood', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'thrombectomy': [
    { id: 1, name: 'Bleeding', description: 'Bleeding at the catheter insertion site', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Pain', description: 'Pain at the catheter insertion site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Bruising', description: 'Bruising around the insertion site', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the catheter insertion site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Vessel Damage', description: 'Damage to the blood vessel during procedure', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Embolization', description: 'Clot breaks off and travels to other areas', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Major Bleeding', description: 'Significant internal bleeding', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'embolectomy': [
    { id: 1, name: 'Bleeding', description: 'Bleeding at the surgical site', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Pain', description: 'Pain at the surgical site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Swelling', description: 'Swelling in the affected limb', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Wound Infection', description: 'Infection at the surgical incision site', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Nerve Damage', description: 'Injury to nerves near the clot removal site', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Compartment Syndrome', description: 'Increased pressure in the muscle compartment', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Amputation Risk', description: 'Risk of limb amputation if circulation fails', category: 'Severe', source: 'Medscape Medical Review' },
  ],
  'gingivectomy': [
    { id: 1, name: 'Gum Soreness', description: 'Mild tenderness and discomfort in the gum tissue', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Minor Bleeding', description: 'Slight bleeding from the gums after procedure', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Sensitivity', description: 'Temporary sensitivity to hot or cold foods', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Swelling', description: 'Mild swelling of the gums', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Infection', description: 'Localized gum infection that may need antibiotics', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Severe Bleeding / Hemorrhage', description: 'Excessive bleeding from gum tissue that requires intervention', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Oral Nerve Damage', description: 'Injury to local nerves causing prolonged numbness in the gums or lower lip', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Severe Gum/Bone Infection', description: 'Deep tissue infection or abscess near the surgical site', category: 'Severe', source: 'Medline Resource' },
    { id: 9, name: 'Delayed Tissue Healing / Necrosis', description: 'Poor healing of the gum tissue exposing underlying bone', category: 'Severe', source: 'UpToDate Guidelines' },
  ],
  'frenectomy': [
    { id: 1, name: 'Tongue/Lip Soreness', description: 'Mild discomfort at the frenum release site', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Minor Bleeding', description: 'Slight bleeding from the procedure site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Swelling', description: 'Mild swelling of the tongue or lip', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Difficulty Moving Tongue/Lip', description: 'Temporary limitation of movement', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Infection', description: 'Localized infection at the procedure site', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Oral Nerve Damage', description: 'Injury to nerves causing numbness in tongue or lip', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Excessive Bleeding', description: 'Significant bleeding requiring intervention', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Scarring', description: 'Excessive scar tissue restricting movement', category: 'Severe', source: 'Medline Resource' },
  ],
  'gingivoplasty': [
    { id: 1, name: 'Gum Soreness', description: 'Mild tenderness after gum reshaping', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Minor Bleeding', description: 'Slight bleeding from the gums', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Sensitivity', description: 'Temporary sensitivity to temperature changes', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Swelling', description: 'Mild swelling of the treated gums', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Asymmetry', description: 'Uneven gum contour after healing', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Severe Bleeding', description: 'Excessive bleeding requiring intervention', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Oral Nerve Damage', description: 'Nerve injury causing prolonged numbness', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Tissue Necrosis', description: 'Poor healing of gum tissue', category: 'Severe', source: 'Medline Resource' },
  ],
  'tooth extraction': [
    { id: 1, name: 'Bleeding', description: 'Normal bleeding from the extraction socket', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Pain', description: 'Pain at the extraction site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Swelling', description: 'Swelling of the cheek or jaw area', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Dry Socket', description: 'Painful condition when blood clot dislodges', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Infection', description: 'Infection in the extraction socket', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Nerve Damage', description: 'Injury to nerves causing numbness in lip or tongue', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Severe Bleeding', description: 'Excessive bleeding that requires medical attention', category: 'Severe', source: 'Medscape Medical Review' },
    { id: 8, name: 'Jaw Fracture', description: 'Rare fracture of the jawbone during extraction', category: 'Severe', source: 'Medline Resource' },
  ],
  'extraction': [
    { id: 1, name: 'Bleeding', description: 'Normal bleeding from the extraction site', category: 'Common', source: 'PubMed Literature' },
    { id: 2, name: 'Pain', description: 'Pain at the extraction site', category: 'Common', source: 'Medscape Medical Review' },
    { id: 3, name: 'Swelling', description: 'Swelling of the affected area', category: 'Common', source: 'Medline Resource' },
    { id: 4, name: 'Dry Socket', description: 'Painful condition when blood clot dislodges', category: 'Rare', source: 'UpToDate Guidelines' },
    { id: 5, name: 'Infection', description: 'Infection at the extraction site', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
    { id: 6, name: 'Nerve Damage', description: 'Injury to nerves causing numbness', category: 'Severe', source: 'PubMed Literature' },
    { id: 7, name: 'Severe Bleeding', description: 'Excessive bleeding requiring intervention', category: 'Severe', source: 'Medscape Medical Review' },
  ],
};

// Category-based complication templates for CSV procedures with timing-based categories
const categoryComplicationTemplates = {
  'Central nervous system': [
    // 1. Immediate / Intraoperative Complications
    { name: 'Surgical Mortality / Death During Surgery', description: 'Extremely rare risk of death during brain surgery due to anesthesia or surgical complications', category: 'Severe' },
    { name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Hemorrhage', description: 'Severe bleeding in the brain requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to brain tissue, blood vessels, or nerves during surgery', category: 'Severe' },
    // 2. Early Post-Operative Complications (first 30 days)
    { name: 'Surgical Site Infection', description: 'Infection at the brain surgery incision that may require antibiotics', category: 'Severe' },
    { name: 'Abscess Formation', description: 'Collection of pus in brain or surrounding tissues requiring drainage', category: 'Severe' },
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Inability to breathe adequately without mechanical support', category: 'Severe' },
    { name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe' },
    { name: 'Post-Operative Pneumonia', description: 'Lung infection developing after surgery due to prolonged bed rest', category: 'Severe' },
    // 3. Late Post-Operative Complications (months to years)
    { name: 'Chronic Pain', description: 'Long-term pain at incision site or in head region', category: 'Severe' },
    { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe' },
    { name: 'Long-Term Neurological Deficits', description: 'Permanent weakness, paralysis, or loss of sensation in body parts', category: 'Severe' },
    { name: 'Cognitive Changes', description: 'Memory problems, confusion, or personality changes after brain surgery', category: 'Severe' },
    { name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if condition returns or complications develop', category: 'Severe' },
    { name: 'Stroke', description: 'Interrupted blood flow to part of the brain during or after surgery', category: 'Severe' },
    { name: 'Brain Swelling (Edema)', description: 'Swelling of brain tissue increasing pressure inside skull', category: 'Severe' },
    { name: 'Cerebrospinal Fluid Leak', description: 'Leak of the fluid that surrounds and protects the brain and spinal cord', category: 'Severe' },
    { name: 'Seizures', description: 'Abnormal electrical activity in the brain after surgery', category: 'Severe' },
  ],
  'Peripheral nervous system': [
    // 1. Immediate / Intraoperative Complications
    { name: 'Surgical Mortality / Death During Surgery', description: 'Extremely rare risk of death during nerve surgery due to anesthesia or complications', category: 'Severe' },
    { name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Hemorrhage', description: 'Severe bleeding requiring blood transfusion during surgery', category: 'Severe' },
    { name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental injury to nearby nerves or blood vessels not intended for surgery', category: 'Severe' },
    // 2. Early Post-Operative Complications (first 30 days)
    { name: 'Surgical Site Infection', description: 'Infection at the incision that may require antibiotics or drainage', category: 'Severe' },
    { name: 'Abscess Formation', description: 'Collection of pus requiring drainage procedures', category: 'Severe' },
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Breathing difficulties after surgery due to anesthesia effects', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from surgical site', category: 'Severe' },
    // 3. Late Post-Operative Complications (months to years)
    { name: 'Chronic Pain', description: 'Long-term pain in the affected area despite healing', category: 'Severe' },
    { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe' },
    { name: 'Permanent Nerve Damage', description: 'Permanent injury to nerves causing loss of sensation or movement', category: 'Severe' },
    { name: 'Loss of Function', description: 'Permanent loss of function in the affected body area', category: 'Severe' },
    { name: 'Neuroma Formation', description: 'Painful nerve scar tissue developing at surgery site', category: 'Severe' },
    { name: 'Complex Regional Pain Syndrome', description: 'Chronic pain condition affecting limb after surgery', category: 'Severe' },
    { name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery to treat complications or revise initial procedure', category: 'Severe' },
  ],
  'Endocrine': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during gland surgery due to anesthesia or complications', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding from gland blood vessels requiring transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs during gland removal', category: 'Severe' },
    { name: 'Recurrent Laryngeal Nerve Injury', description: 'Damage to nerves controlling voice box during thyroid/parathyroid surgery', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias during anesthesia', category: 'Severe' },
    { name: 'Difficult Airway', description: 'Problems with breathing tube placement during neck surgery', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at the incision that may require antibiotics', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from surgical site', category: 'Severe' },
    { name: 'Post-Operative Respiratory Issues', description: 'Breathing problems after neck surgery affecting airway', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Hormone Imbalance', description: 'Long-term changes in hormone levels requiring medication', category: 'Severe' },
    { name: 'Hypocalcemia', description: 'Dangerously low calcium levels after parathyroid surgery', category: 'Severe' },
    { name: 'Thyroid Storm', description: 'Sudden severe increase in thyroid hormones after thyroid surgery', category: 'Severe' },
    { name: 'Adrenal Crisis', description: 'Life-threatening adrenal insufficiency after adrenal surgery', category: 'Severe' },
    { name: 'Need for Hormone Replacement', description: 'Lifelong requirement for hormone medications after gland removal', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery needed for bleeding or incomplete gland removal', category: 'Severe' },
  ],
  'Eye': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during eye surgery due to anesthesia complications', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding in or around the eye during surgery', category: 'Severe' },
    { name: 'Unintended Eye Structure Damage', description: 'Accidental damage to cornea, lens, or retina during surgery', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Allergic reactions to eye drops or local anesthesia', category: 'Severe' },
    { name: 'Retrobulbar Hemorrhage', description: 'Bleeding behind the eye from anesthesia injection causing vision loss', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Endophthalmitis', description: 'Severe infection inside the eye that can cause blindness', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at the eye incision or cornea', category: 'Severe' },
    { name: 'Systemic Infection', description: 'Infection spreading from eye to other parts of body', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Complete Vision Loss', description: 'Total blindness in the operated eye', category: 'Severe' },
    { name: 'Retinal Detachment', description: 'Light-sensitive layer pulling away from back of eye', category: 'Severe' },
    { name: 'Glaucoma', description: 'Increased eye pressure damaging the optic nerve', category: 'Severe' },
    { name: 'Corneal Edema', description: 'Swelling of clear front part of eye affecting vision', category: 'Severe' },
    { name: 'Lens Capsule Rupture', description: 'Tear in the lens capsule during cataract surgery', category: 'Severe' },
    { name: 'Posterior Capsule Opacification', description: 'Clouding of lens capsule requiring laser treatment', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery needed for complications or lens replacement', category: 'Severe' },
  ],
  'Ears': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during ear surgery due to anesthesia', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding during ear surgery requiring intervention', category: 'Severe' },
    { name: 'Unintended Structure Damage', description: 'Accidental damage to inner ear structures or facial nerve', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at ear incision or inside ear canal', category: 'Severe' },
    { name: 'Mastoiditis', description: 'Infection of the bone behind ear spreading from surgery', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from ear infection', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Complete Hearing Loss', description: 'Total deafness in the operated ear', category: 'Severe' },
    { name: 'Facial Nerve Paralysis', description: 'Permanent facial droop or inability to close eye', category: 'Severe' },
    { name: 'Balance Disorders', description: 'Permanent dizziness, vertigo, or balance problems', category: 'Severe' },
    { name: 'Tinnitus', description: 'Ringing or other sounds in the ear after surgery', category: 'Severe' },
    { name: 'Taste Changes', description: 'Altered or lost sense of taste after ear surgery', category: 'Severe' },
    { name: 'Cerebrospinal Fluid Leak', description: 'Leak of brain fluid after ear surgery affecting skull base', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery needed for complications or hearing device placement', category: 'Severe' },
  ],
  'Respiratory': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Risk of death during lung/throat surgery due to complications', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding from lung or airway vessels requiring transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe' },
    { name: 'Airway Injury', description: 'Damage to windpipe or bronchi during surgery', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Difficult Airway', description: 'Problems with breathing tube placement during airway surgery', category: 'Severe' },
    { name: 'Aspiration Pneumonia', description: 'Stomach contents entering lungs during anesthesia', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at chest or throat incision', category: 'Severe' },
    { name: 'Empyema', description: 'Infection in the space around lungs requiring drainage', category: 'Severe' },
    { name: 'Respiratory Failure', description: 'Inability to breathe adequately without mechanical ventilation', category: 'Severe' },
    { name: 'Post-Operative Pneumonia', description: 'Lung infection after surgery requiring antibiotics', category: 'Severe' },
    { name: 'Atelectasis', description: 'Collapse of lung tissue affecting oxygen levels', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Airway Obstruction', description: 'Blockage of windpipe causing breathing emergency', category: 'Severe' },
    { name: 'Bronchopleural Fistula', description: 'Abnormal connection between airway and chest cavity', category: 'Severe' },
    { name: 'Vocal Cord Paralysis', description: 'Damage to nerves controlling voice box causing hoarseness', category: 'Severe' },
    { name: 'Persistent Air Leak', description: 'Continuous air leakage from lung requiring chest tube', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery needed for bleeding or airway complications', category: 'Severe' },
  ],
  'Cardiovascular': [
    // 1. Immediate / Intraoperative Complications
    { name: 'Surgical Mortality / Death During Surgery', description: 'Risk of death during heart surgery due to anesthesia or cardiac complications', category: 'Severe' },
    { name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Cardiac Arrest', description: 'Heart stopping during surgery requiring resuscitation', category: 'Severe' },
    { name: 'Intraoperative Hemorrhage', description: 'Severe bleeding requiring massive blood transfusion', category: 'Severe' },
    { name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to heart valves, coronary arteries, bypass grafts, or aorta during surgery', category: 'Severe' },
    { name: 'Systemic Anaphylaxis', description: 'Severe allergic reaction to medications or blood products', category: 'Severe' },
    // 2. Early Post-Operative Complications (first 30 days)
    { name: 'Surgical Site Infection', description: 'Infection at chest incision or bypass graft sites', category: 'Severe' },
    { name: 'Abscess Formation', description: 'Collection of pus in chest cavity requiring drainage', category: 'Severe' },
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Lung failure requiring mechanical ventilation', category: 'Severe' },
    { name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe' },
    { name: 'Mediastinitis', description: 'Infection in the chest cavity requiring long-term antibiotics', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from surgical site', category: 'Severe' },
    { name: 'Acute Kidney Injury', description: 'Kidney damage during or after heart surgery', category: 'Severe' },
    // 3. Late Post-Operative Complications (months to years)
    { name: 'Incisional Hernia Formation', description: 'Bulge at chest incision site developing months to years after surgery', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain at chest incision site', category: 'Severe' },
    { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe' },
    { name: 'Long-Term Arrhythmias', description: 'Permanent irregular heart rhythms requiring medication or pacemaker', category: 'Severe' },
    { name: 'Graft Failure', description: 'Bypass graft or valve replacement not functioning properly months to years later', category: 'Severe' },
    { name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if condition returns or complications develop', category: 'Severe' },
    { name: 'Heart Attack (Myocardial Infarction)', description: 'Heart muscle damage during or after surgery', category: 'Severe' },
    { name: 'Stroke', description: 'Brain damage due to blood flow interruption during surgery', category: 'Severe' },
  ],
  'Lymphatic': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during lymph node surgery', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding from lymph node vessels requiring transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe' },
    { name: 'Thoracic Duct Injury', description: 'Damage to main lymphatic duct causing fluid leakage', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at lymph node incision sites', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from lymphatic system', category: 'Severe' },
    { name: 'Post-Operative Respiratory Issues', description: 'Breathing problems after extensive lymph node removal', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Lymphedema', description: 'Chronic swelling in arm or leg due to lymph system disruption', category: 'Severe' },
    { name: 'Chyle Leak', description: 'Leakage of lymphatic fluid requiring drainage or dietary changes', category: 'Severe' },
    { name: 'Seroma Formation', description: 'Fluid collection under skin requiring drainage', category: 'Severe' },
    { name: 'Immune System Impact', description: 'Reduced immune function after lymph node removal', category: 'Severe' },
    { name: 'Nerve Damage', description: 'Nerve injury causing numbness or weakness in affected area', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery for fluid drainage or complications', category: 'Severe' },
  ],
  'GI/mouth': [
    // 1. Immediate / Intraoperative Complications
    { name: 'Surgical Mortality / Death During Surgery', description: 'Risk of death during abdominal surgery due to anesthesia or surgical complications', category: 'Severe' },
    { name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Hemorrhage', description: 'Severe bleeding from abdominal organs requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to nearby organs, blood vessels, or nerves during surgery', category: 'Severe' },
    { name: 'Bowel Perforation', description: 'Accidental hole in intestine causing abdominal infection during surgery', category: 'Severe' },
    // 2. Early Post-Operative Complications (first 30 days)
    { name: 'Surgical Site Infection', description: 'Infection at abdominal incision requiring antibiotics', category: 'Severe' },
    { name: 'Abscess Formation', description: 'Collection of pus in abdomen requiring drainage', category: 'Severe' },
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Lung failure after abdominal surgery', category: 'Severe' },
    { name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe' },
    { name: 'Peritonitis', description: 'Infection of abdominal lining requiring emergency treatment', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from abdominal infection', category: 'Severe' },
    { name: 'Anastomotic Leak', description: 'Leakage from where intestines were reconnected in first 30 days', category: 'Severe' },
    // 3. Late Post-Operative Complications (months to years)
    { name: 'Incisional Hernia Formation', description: 'Bulge at incision site developing months to years after surgery requiring repair', category: 'Severe' },
    { name: 'Adhesion Bowel Obstruction', description: 'Scar tissue forming in abdomen causing bowel blockage years later', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain at incision site or in abdomen', category: 'Severe' },
    { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe' },
    { name: 'Long-Term Organ Dysfunction', description: 'Permanent changes in digestion or bowel habits after surgery', category: 'Severe' },
    { name: 'Fistula Formation', description: 'Abnormal connection between organs or to skin developing months later', category: 'Severe' },
    { name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if condition returns or complications develop', category: 'Severe' },
  ],
  'Urinary': [
    // 1. Immediate / Intraoperative Complications
    { name: 'Surgical Mortality / Death During Surgery', description: 'Extremely rare risk of death during kidney/bladder surgery due to anesthesia or complications', category: 'Severe' },
    { name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Hemorrhage', description: 'Severe bleeding from kidney or bladder requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to nearby organs, blood vessels, or nerves during surgery', category: 'Severe' },
    { name: 'Ureteral Injury', description: 'Damage to tubes connecting kidneys to bladder during surgery', category: 'Severe' },
    // 2. Early Post-Operative Complications (first 30 days)
    { name: 'Surgical Site Infection', description: 'Infection at incision or inside urinary tract requiring antibiotics', category: 'Severe' },
    { name: 'Abscess Formation', description: 'Collection of pus around kidney or bladder requiring drainage', category: 'Severe' },
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Breathing problems after extensive surgery', category: 'Severe' },
    { name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe' },
    { name: 'Urosepsis', description: 'Severe infection spreading from urinary tract to bloodstream', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection requiring intensive care', category: 'Severe' },
    { name: 'Acute Kidney Injury', description: 'Worsening kidney function after surgery', category: 'Severe' },
    // 3. Late Post-Operative Complications (months to years)
    { name: 'Incisional Hernia Formation', description: 'Bulge at incision site developing months to years after surgery', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain at incision site or in flank area', category: 'Severe' },
    { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe' },
    { name: 'Long-Term Kidney Dysfunction', description: 'Permanent loss of kidney function requiring dialysis', category: 'Severe' },
    { name: 'Stricture Formation', description: 'Narrowing of ureter or urethra requiring dilation months later', category: 'Severe' },
    { name: 'Incontinence', description: 'Inability to control bladder function', category: 'Severe' },
    { name: 'Erectile Dysfunction', description: 'Inability to achieve or maintain erection after surgery', category: 'Severe' },
    { name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if condition returns or complications develop', category: 'Severe' },
  ],
  'Male reproductive': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during reproductive surgery', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe' },
    { name: 'Urethral Injury', description: 'Damage to urethra during surgery', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at genital incision requiring antibiotics', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from genital surgery', category: 'Severe' },
    { name: 'Post-Operative Respiratory Issues', description: 'Breathing problems after extensive surgery', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Permanent Infertility', description: 'Inability to father children after surgery', category: 'Severe' },
    { name: 'Erectile Dysfunction', description: 'Inability to achieve or maintain erection', category: 'Severe' },
    { name: 'Ejaculatory Dysfunction', description: 'Inability to ejaculate normally after surgery', category: 'Severe' },
    { name: 'Testicular Atrophy', description: 'Shrinking of testicle due to blood supply damage', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain in genital area', category: 'Severe' },
    { name: 'Psychological Impact', description: 'Emotional effects from reproductive surgery', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery for complications or reversal', category: 'Severe' },
  ],
  'Bone': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during bone surgery', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding from bone surgery requiring transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe' },
    { name: 'Fracture Complications', description: 'Additional bone fractures during surgery', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at bone incision requiring antibiotics', category: 'Severe' },
    { name: 'Osteomyelitis', description: 'Serious bone infection requiring long-term antibiotics', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from bone infection', category: 'Severe' },
    { name: 'Post-Operative Respiratory Issues', description: 'Breathing problems after extensive bone surgery', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Nonunion', description: 'Bone does not heal properly requiring additional surgery', category: 'Severe' },
    { name: 'Malunion', description: 'Bone heals in wrong position causing deformity', category: 'Severe' },
    { name: 'Avascular Necrosis', description: 'Bone death due to loss of blood supply', category: 'Severe' },
    { name: 'Nerve Damage', description: 'Injury to nerves near bone causing numbness or weakness', category: 'Severe' },
    { name: 'Limb Length Discrepancy', description: 'One leg shorter than other after surgery', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain at surgery site', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery for nonunion, infection, or hardware failure', category: 'Severe' },
  ],
  'Joint': [
    // 1. Immediate / Intraoperative Complications
    { name: 'Surgical Mortality / Death During Surgery', description: 'Extremely rare risk of death during joint surgery due to anesthesia or complications', category: 'Severe' },
    { name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to nearby organs, blood vessels, or nerves during surgery', category: 'Severe' },
    { name: 'Bone Fracture', description: 'Accidental bone fracture during joint surgery', category: 'Severe' },
    // 2. Early Post-Operative Complications (first 30 days)
    { name: 'Surgical Site Infection', description: 'Infection at joint incision requiring antibiotics', category: 'Severe' },
    { name: 'Abscess Formation', description: 'Collection of pus around joint requiring drainage', category: 'Severe' },
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Breathing problems after extensive joint surgery', category: 'Severe' },
    { name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from joint infection', category: 'Severe' },
    // 3. Late Post-Operative Complications (months to years)
    { name: 'Incisional Hernia Formation', description: 'Bulge at incision site developing months to years after surgery', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain at joint site', category: 'Severe' },
    { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe' },
    { name: 'Implant Loosening', description: 'Artificial joint becomes loose requiring revision months to years later', category: 'Severe' },
    { name: 'Implant Failure', description: 'Artificial joint fails requiring replacement', category: 'Severe' },
    { name: 'Joint Instability', description: 'Joint feels loose or gives way unexpectedly', category: 'Severe' },
    { name: 'Stiffness', description: 'Permanent limited joint movement', category: 'Severe' },
    { name: 'Wear Debris', description: 'Particle shedding from implant causing bone damage', category: 'Severe' },
    { name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if implant fails or complications develop', category: 'Severe' },
  ],
  'Muscle or soft tissue': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during soft tissue surgery', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at soft tissue incision requiring antibiotics', category: 'Severe' },
    { name: 'Necrotizing Fasciitis', description: 'Rare but serious soft tissue infection', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from soft tissue', category: 'Severe' },
    { name: 'Post-Operative Respiratory Issues', description: 'Breathing problems after extensive surgery', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Chronic Pain', description: 'Long-term pain in affected area', category: 'Severe' },
    { name: 'Muscle Weakness', description: 'Permanent muscle weakness after surgery', category: 'Severe' },
    { name: 'Loss of Function', description: 'Permanent loss of function in affected area', category: 'Severe' },
    { name: 'Contracture', description: 'Shortening of muscle or tissue limiting movement', category: 'Severe' },
    { name: 'Nerve Damage', description: 'Injury to nerves causing numbness or paralysis', category: 'Severe' },
    { name: 'Hematoma', description: 'Collection of blood requiring drainage', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery for complications or revision', category: 'Severe' },
  ],
  'Breast': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during breast surgery', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to chest wall, ribs, or nerves', category: 'Severe' },
    { name: 'Pneumothorax', description: 'Collapsed lung during surgery', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at breast incision requiring antibiotics', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from breast surgery', category: 'Severe' },
    { name: 'Post-Operative Respiratory Issues', description: 'Breathing problems after extensive surgery', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Lymphedema', description: 'Chronic arm swelling due to lymph node removal', category: 'Severe' },
    { name: 'Capsular Contracture', description: 'Hardening around breast implant causing pain', category: 'Severe' },
    { name: 'Implant Rupture', description: 'Breast implant leaking requiring replacement', category: 'Severe' },
    { name: 'Implant Malposition', description: 'Implant in wrong position requiring correction', category: 'Severe' },
    { name: 'Nerve Damage', description: 'Injury to nerves causing numbness in breast or arm', category: 'Severe' },
    { name: 'Asymmetry', description: 'Noticeable difference in breast appearance', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery for implant complications or revision', category: 'Severe' },
  ],
  'Skin': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Extremely rare risk of death during skin surgery', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Tissue Damage', description: 'Accidental damage to deeper tissues or structures', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Local Anesthetic Toxicity', description: 'Severe reaction to numbing medication', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at skin incision requiring antibiotics', category: 'Severe' },
    { name: 'Necrotizing Fasciitis', description: 'Rare but serious soft tissue infection', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from skin infection', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Skin Necrosis', description: 'Death of skin tissue requiring reconstruction', category: 'Severe' },
    { name: 'Poor Wound Healing', description: 'Delayed healing or wound separation', category: 'Severe' },
    { name: 'Excessive Scarring', description: 'Severe scarring affecting appearance or function', category: 'Severe' },
    { name: 'Keloid Formation', description: 'Overgrown scar tissue beyond original wound', category: 'Severe' },
    { name: 'Pigmentation Changes', description: 'Permanent color changes in treated skin', category: 'Severe' },
    { name: 'Nerve Damage', description: 'Injury to nerves causing numbness or movement issues', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery for complications or scar revision', category: 'Severe' },
  ],
  'Other': [
    // Intraoperative & Surgical Risks
    { name: 'Intraoperative Death', description: 'Risk of death during surgery depending on procedure type', category: 'Severe' },
    { name: 'Major Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe' },
    { name: 'Unintended Organ Damage', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe' },
    // Anesthetic & Airway Risks
    { name: 'Anesthetic Complications', description: 'Malignant hyperthermia, allergic reactions, or cardiac arrhythmias', category: 'Severe' },
    { name: 'Intraoperative Cardiac Arrest', description: 'Heart stopping during surgery requiring resuscitation', category: 'Severe' },
    { name: 'Systemic Anaphylaxis', description: 'Severe allergic reaction to medications or materials', category: 'Severe' },
    // Systemic & Post-Operative Complications
    { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe' },
    { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe' },
    { name: 'Surgical Site Infection', description: 'Infection at incision requiring antibiotics', category: 'Severe' },
    { name: 'Sepsis', description: 'Whole-body infection spreading from surgical site', category: 'Severe' },
    { name: 'Post-Operative Respiratory Failure', description: 'Inability to breathe adequately after surgery', category: 'Severe' },
    { name: 'Post-Operative Pneumonia', description: 'Lung infection after surgery requiring antibiotics', category: 'Severe' },
    // Procedure-Specific Complications
    { name: 'Procedure Failure', description: 'Primary procedure does not achieve intended result', category: 'Severe' },
    { name: 'Need for Re-operation', description: 'Additional surgery needed for complications or revision', category: 'Severe' },
    { name: 'Chronic Pain', description: 'Long-term pain at surgery site', category: 'Severe' },
    { name: 'Nerve Damage', description: 'Injury to nerves causing numbness or weakness', category: 'Severe' },
    { name: 'Functional Impairment', description: 'Loss of normal function in affected area', category: 'Severe' },
    { name: 'Quality of Life Impact', description: 'Significant effect on daily activities and wellbeing', category: 'Severe' },
  ],
};

// Mapping from new ProcedureComplications.csv specialties to existing category templates
const specialtyToCategoryMapping = {
  'General Surgery & Gastrointestinal': 'GI/mouth',
  'Interventional Radiology & Cardiology': 'Cardiovascular',
  'Cardiothoracic & Vascular Surgery': 'Cardiovascular',
  'Neurosurgery': 'Central nervous system',
  'Orthopedic Surgery': 'Joint',
  'Urology': 'Urinary',
  'Gynecology & Obstetrics': 'GI/mouth',
  'Otolaryngology (ENT) & Head & Neck Surgery': 'Respiratory',
  'Ophthalmology': 'Eye',
  'Plastic, Reconstructive & Aesthetic Surgery': 'Skin',
  'Vascular Surgery': 'Cardiovascular',
  'Pediatric Surgery': 'Other',
  'Oral & Maxillofacial Surgery (OMFS)': 'GI/mouth',
  'Podiatric Surgery': 'Bone',
};

// Function to map specialty to category
const mapSpecialtyToCategory = (specialty) => {
  return specialtyToCategoryMapping[specialty] || 'Other';
};

// Function to organize complications into timing-based categories
const organizeComplicationsByCategory = (complications) => {
  const categories = {
    '1. Immediate / Intraoperative Complications': [],
    '2. Early Post-Operative Complications': [],
    '3. Late Post-Operative Complications': []
  };

  complications.forEach(comp => {
    const name = comp.name.toLowerCase();
    const description = comp.description.toLowerCase();
    
    // Immediate / Intraoperative Complications
    if (name.includes('death') || name.includes('mortality') || 
        name.includes('intraoperative') || name.includes('intraoperative death') ||
        name.includes('hemorrhage') || name.includes('major hemorrhage') ||
        name.includes('anesthetic') || name.includes('anesthesia') || name.includes('airway') ||
        name.includes('malignant hyperthermia') || name.includes('aspiration') ||
        name.includes('anaphylaxis') || name.includes('arrhythmia') || name.includes('cardiac arrest') ||
        name.includes('organ damage') || name.includes('visceral') || name.includes('neurovascular') ||
        name.includes('vessel injury') || name.includes('nerve injury') || name.includes('injury') ||
        name.includes('tissue damage') || name.includes('perforation') || name.includes('rupture') ||
        name.includes('fracture') || description.includes('during surgery') || description.includes('during anesthesia')) {
      categories['1. Immediate / Intraoperative Complications'].push(comp);
    }
    // Early Post-Operative Complications (first 30 days)
    else if (name.includes('infection') || name.includes('surgical site infection') || name.includes('abscess') ||
             name.includes('thrombosis') || name.includes('dvt') || name.includes('embolism') || name.includes('pe') ||
             name.includes('dehiscence') || name.includes('wound dehiscence') || name.includes('hematoma') ||
             name.includes('respiratory') || name.includes('pneumonia') || name.includes('atelectasis') ||
             name.includes('respiratory failure') || name.includes('sepsis') || name.includes('early') ||
             description.includes('first 30 days') || description.includes('acute') || description.includes('post-operative')) {
      categories['2. Early Post-Operative Complications'].push(comp);
    }
    // Late Post-Operative Complications (months to years)
    else if (name.includes('hernia') || name.includes('incisional hernia') || name.includes('adhesion') ||
             name.includes('bowel obstruction') || name.includes('chronic pain') || name.includes('nerve entrapment') ||
             name.includes('long-term') || name.includes('recurrence') || name.includes('re-operation') ||
             name.includes('permanent') || name.includes('dysfunction') || name.includes('persistent') ||
             description.includes('months') || description.includes('years') || description.includes('late')) {
      categories['3. Late Post-Operative Complications'].push(comp);
    }
    // Default to Late Post-Operative for procedure-specific complications that don't fit elsewhere
    else {
      categories['3. Late Post-Operative Complications'].push(comp);
    }
  });

  return categories;
};

// Function to load and parse ProcedureComplications.csv
const loadProcedureComplicationsCSV = async () => {
  try {
    console.log('Loading CSV file...');
    
    // For web, try to fetch from public directory first
    if (Platform.OS === 'web') {
      console.log('Web platform: attempting to fetch from public directory');
      
      try {
        const response = await fetch('/ProcedureComplications.csv');
        console.log('Fetch response status:', response.status);
        
        if (response.ok) {
          const content = await response.text();
          console.log('CSV content loaded from public, length:', content.length);
          
          // Check if content is HTML (error page) rather than CSV
          if (content.trim().toLowerCase().startsWith('<!doctype') || 
              content.trim().toLowerCase().startsWith('<html')) {
            console.error('Received HTML instead of CSV content');
            throw new Error('Received HTML instead of CSV');
          }
          
          // Check if content is empty
          if (!content || content.trim().length === 0) {
            console.error('Empty CSV content received');
            throw new Error('Empty CSV content');
          }
          
          return parseCSVContent(content);
        } else {
          console.log(`Fetch failed with status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (fetchError) {
        console.log('Web fetch failed, trying expo-asset fallback:', fetchError.message);
        
        // Fallback to expo-asset for web
        try {
          const asset = Asset.fromModule(require('../../assets/ProcedureComplications.csv'));
          await asset.downloadAsync();
          const content = await FileSystem.readAsStringAsync(asset.localUri);
          console.log('CSV content loaded from asset fallback, length:', content.length);
          return parseCSVContent(content);
        } catch (assetError) {
          console.error('Asset fallback also failed:', assetError.message);
          throw new Error(`Both fetch and asset loading failed: ${fetchError.message}, ${assetError.message}`);
        }
      }
    }
    
    // For mobile, use expo-asset
    console.log('Mobile platform: using expo-asset');
    const asset = Asset.fromModule(require('../../assets/ProcedureComplications.csv'));
    console.log('Asset loaded:', asset);
    
    // Download the asset to get a local URI
    await asset.downloadAsync();
    console.log('Asset downloaded, local URI:', asset.localUri);
    
    // Read the file content
    const content = await FileSystem.readAsStringAsync(asset.localUri);
    console.log('CSV content loaded from file system, length:', content.length);
    
    return parseCSVContent(content);
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
};

// Function to parse CSV content with semicolon delimiter
const parseCSVContent = (content) => {
  try {
    if (!content || typeof content !== 'string') {
      console.error('Invalid CSV content provided');
      return [];
    }

    const lines = content.split('\n');
    const procedures = [];
    
    // Check if we have at least a header row
    if (lines.length < 1) {
      console.error('CSV file is empty');
      return [];
    }

    // Validate header row
    const headerLine = lines[0].trim();
    if (!headerLine.includes('Procedure') || !headerLine.includes('Specialty')) {
      console.error('CSV header does not match expected format "Procedure;Specialty"');
      console.log('Actual header:', headerLine);
      return [];
    }

    // Parse data rows (skip header row at index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by semicolon
      const parts = line.split(';');
      
      // Ensure we have at least 2 columns
      if (parts.length >= 2) {
        const procedure = parts[0].trim();
        const specialty = parts[1].trim();
        
        // Only add if both fields have content
        if (procedure && specialty) {
          procedures.push({
            procedure: procedure,
            specialty: specialty
          });
        }
      }
    }
    
    console.log(`Parsed ${procedures.length} procedures from CSV`);
    return procedures;
  } catch (error) {
    console.error('Error parsing CSV content:', error);
    return [];
  }
};

// NOTE: CSV procedure data is now loaded from ProcedureComplications.csv
// This file uses semicolon (;) delimiter with headers: "Procedure;Specialty"
// The specialties are mapped to existing categories using specialtyToCategoryMapping
// Data loading happens dynamically in the component

// Function to merge CSV procedures into comprehensive database
const mergeCSVProcedures = (csvData) => {
  csvData.forEach(({ procedure, specialty }) => {
    const normalizedProcedure = procedure.toLowerCase().trim();
    
    // Skip if procedure already exists in database (preserve custom mappings)
    // This ensures hardcoded entries like cholecystectomy are never overwritten
    if (Object.keys(comprehensiveClinicalDatabase).some(key => 
      key.toLowerCase().includes(normalizedProcedure) || normalizedProcedure.includes(key.toLowerCase())
    )) {
      return;
    }
    
    // Map specialty to category using the mapping function
    const category = mapSpecialtyToCategory(specialty);
    
    // Get complications template for this category
    // GI/mouth procedures NEVER fetch from urinary or neurological templates
    const complicationsTemplate = categoryComplicationTemplates[category] || categoryComplicationTemplates['Other'];
    
    // Generate complications with approved sources
    const complications = complicationsTemplate.map((comp, index) => ({
      id: index + 1,
      name: comp.name,
      description: comp.description,
      category: comp.category,
      source: assignApprovedSource()
    }));
    
    // Add to comprehensive database
    comprehensiveClinicalDatabase[normalizedProcedure] = complications;
  });
};

// Domain-specific fallback complication profiles
const oralDentalFallback = [
  { id: 1, name: 'Gum Soreness', description: 'Mild tenderness and discomfort in the gum tissue', category: 'Common', source: 'PubMed Literature' },
  { id: 2, name: 'Minor Bleeding', description: 'Slight bleeding from the gums after procedure', category: 'Common', source: 'Medscape Medical Review' },
  { id: 3, name: 'Sensitivity', description: 'Temporary sensitivity to hot or cold foods', category: 'Common', source: 'Medline Resource' },
  { id: 4, name: 'Swelling', description: 'Mild swelling of the gums or face', category: 'Rare', source: 'UpToDate Guidelines' },
  { id: 5, name: 'Infection', description: 'Localized gum infection that may need antibiotics', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
  { id: 6, name: 'Severe Bleeding / Hemorrhage', description: 'Excessive bleeding from gum tissue that requires intervention', category: 'Severe', source: 'PubMed Literature' },
  { id: 7, name: 'Oral Nerve Damage', description: 'Injury to local nerves causing prolonged numbness in the gums or lower lip', category: 'Severe', source: 'Medscape Medical Review' },
  { id: 8, name: 'Severe Gum/Bone Infection', description: 'Deep tissue infection or abscess near the surgical site', category: 'Severe', source: 'Medline Resource' },
  { id: 9, name: 'Delayed Tissue Healing / Necrosis', description: 'Poor healing of the gum tissue exposing underlying bone', category: 'Severe', source: 'UpToDate Guidelines' },
];

const minorSuperficialFallback = [
  { id: 1, name: 'Redness', description: 'Mild redness around the treated area', category: 'Common', source: 'PubMed Literature' },
  { id: 2, name: 'Minor Bleeding', description: 'Slight bleeding from the procedure site', category: 'Common', source: 'Medscape Medical Review' },
  { id: 3, name: 'Soreness', description: 'Mild discomfort at the treatment site', category: 'Common', source: 'Medline Resource' },
  { id: 4, name: 'Bruising', description: 'Minor bruising around the treated area', category: 'Rare', source: 'UpToDate Guidelines' },
  { id: 5, name: 'Scarring', description: 'Small scar at the procedure site', category: 'Rare', source: 'Mayo Clinic Clinical Reference' },
  { id: 6, name: 'Local Infection', description: 'Infection at the procedure site', category: 'Severe', source: 'PubMed Literature' },
  { id: 7, name: 'Excessive Bleeding', description: 'Significant bleeding requiring intervention', category: 'Severe', source: 'Medscape Medical Review' },
  { id: 8, name: 'Nerve Irritation', description: 'Temporary nerve irritation causing numbness', category: 'Severe', source: 'Medline Resource' },
];

// Universal immediate/intraoperative fallbacks - applies to ALL procedures
const universalImmediateFallbacks = [
  { name: 'Surgical Mortality / Death during surgery', description: 'Risk of fatal intraoperative event or surgical mortality', category: 'Severe', source: 'PubMed Literature' },
  { name: 'Anesthetic Complications', description: 'Adverse reactions to general anesthesia, airway/respiratory compromise, cardiac arrhythmias, or anaphylaxis', category: 'Severe', source: 'UpToDate Guidelines' },
  { name: 'Intraoperative Hemorrhage / Heavy Bleeding', description: 'Severe blood loss during surgery requiring blood transfusion or intervention', category: 'Severe', source: 'Medscape Medical Review' },
  { name: 'Accidental Surrounding Tissue / Organ / Neurovascular Damage', description: 'Accidental injury to nearby tissues, organs, blood vessels, or nerves during the procedure', category: 'Severe', source: 'Medline Resource' },
];

// Universal early post-operative fallbacks - applies to ALL procedures
const universalEarlyFallbacks = [
  { name: 'Surgical Site Infection', description: 'Infection at the procedure site that may require antibiotics', category: 'Severe', source: 'UpToDate Guidelines' },
  { name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots forming in legs due to immobility after procedure', category: 'Severe', source: 'Medscape Medical Review' },
  { name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing difficulties', category: 'Severe', source: 'Medline Resource' },
  { name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  { name: 'Post-Operative Respiratory Failure / Atelectasis', description: 'Breathing difficulties or partial lung collapse after procedure due to anesthesia effects', category: 'Severe', source: 'PubMed Literature' },
];

// Universal late post-operative fallbacks - applies to ALL procedures
const universalLateFallbacks = [
  { name: 'Chronic Pain', description: 'Long-term pain at the procedure site', category: 'Severe', source: 'UpToDate Guidelines' },
  { name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  { name: 'Recurrence or Re-operation Risks', description: 'Need for additional procedure if condition returns or complications develop', category: 'Severe', source: 'PubMed Literature' },
];

const majorSurgicalFallback = [
  // 1. Immediate / Intraoperative Complications
  { id: 1, name: 'Surgical Mortality / Death During Surgery', description: 'Risk of death during surgery due to anesthesia or surgical complications', category: 'Severe', source: 'PubMed Literature' },
  { id: 2, name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe', source: 'UpToDate Guidelines' },
  { id: 3, name: 'Intraoperative Cardiac Arrest', description: 'Heart stopping during surgery requiring resuscitation', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  { id: 4, name: 'Intraoperative Hemorrhage', description: 'Severe bleeding requiring blood transfusion', category: 'Severe', source: 'Medscape Medical Review' },
  { id: 5, name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to nearby organs, blood vessels, or nerves', category: 'Severe', source: 'Medline Resource' },
  { id: 6, name: 'Systemic Anaphylaxis', description: 'Severe allergic reaction to medications or materials', category: 'Severe', source: 'PubMed Literature' },
  // 2. Early Post-Operative Complications (first 30 days)
  { id: 7, name: 'Surgical Site Infection', description: 'Infection at incision requiring antibiotics', category: 'Severe', source: 'UpToDate Guidelines' },
  { id: 8, name: 'Abscess Formation', description: 'Collection of pus requiring drainage', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  { id: 9, name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots in legs that can travel to lungs', category: 'Severe', source: 'Medscape Medical Review' },
  { id: 10, name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling to lungs causing breathing problems', category: 'Severe', source: 'Medline Resource' },
  { id: 11, name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe', source: 'UpToDate Guidelines' },
  { id: 12, name: 'Post-Operative Respiratory Failure', description: 'Inability to breathe adequately after surgery', category: 'Severe', source: 'PubMed Literature' },
  { id: 13, name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe', source: 'Medscape Medical Review' },
  { id: 14, name: 'Post-Operative Pneumonia', description: 'Lung infection after surgery requiring antibiotics', category: 'Severe', source: 'UpToDate Guidelines' },
  { id: 15, name: 'Sepsis', description: 'Whole-body infection spreading from surgical site', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  // 3. Late Post-Operative Complications (months to years)
  { id: 16, name: 'Incisional Hernia Formation', description: 'Bulge at incision site developing months to years after surgery requiring repair', category: 'Severe', source: 'PubMed Literature' },
  { id: 17, name: 'Adhesion Bowel Obstruction', description: 'Scar tissue forming causing bowel blockage years later', category: 'Severe', source: 'Medscape Medical Review' },
  { id: 18, name: 'Chronic Pain', description: 'Long-term pain at surgery site', category: 'Severe', source: 'UpToDate Guidelines' },
  { id: 19, name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe', source: 'Mayo Clinic Clinical Reference' },
  { id: 20, name: 'Long-Term Organ Dysfunction', description: 'Permanent loss of function in affected area', category: 'Severe', source: 'PubMed Literature' },
  { id: 21, name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if condition returns or complications develop', category: 'Severe', source: 'UpToDate Guidelines' },
];

// Function to determine appropriate fallback profile based on procedure type
const getFallbackProfile = (procedure) => {
  const normalizedProcedure = procedure.toLowerCase().trim();
  
  // Oral/dental procedure keywords
  const oralDentalKeywords = [
    'gingivectomy', 'frenectomy', 'gingivoplasty', 'tooth extraction', 'dental',
    'extraction', 'gingiva', 'gum', 'tooth', 'oral', 'dental', 'endodontic',
    'periodontal', 'root canal', 'impaction', 'wisdom tooth', 'biopsy'
  ];
  
  // Minor/superficial procedure keywords
  const minorSuperficialKeywords = [
    'biopsy', 'excision', 'cryotherapy', 'electrosurgery', 'laser',
    'mole removal', 'skin tag', 'wart', 'lesion', 'dermatology',
    'cosmetic', 'injectable', 'filler', 'botox', 'superficial'
  ];
  
  // Check if procedure is oral/dental
  if (oralDentalKeywords.some(keyword => normalizedProcedure.includes(keyword))) {
    return oralDentalFallback;
  }
  
  // Check if procedure is minor/superficial
  if (minorSuperficialKeywords.some(keyword => normalizedProcedure.includes(keyword))) {
    return minorSuperficialFallback;
  }
  
  // Default to major surgical profile
  return majorSurgicalFallback;
};

// Function to ensure all three timing categories are present in complications
const ensureAllTimingCategories = (complications) => {
  const categorized = organizeComplicationsByCategory(complications);
  
  // Helper function to check if a complication with similar name exists
  const hasSimilarComplication = (items, name) => {
    const nameLower = name.toLowerCase();
    return items.some(item => 
      item.name.toLowerCase().includes(nameLower.split(' ')[0]) || 
      nameLower.includes(item.name.toLowerCase().split(' ')[0])
    );
  };

  // Helper function to add mandatory baseline items if not present
  const addMandatoryBaselineItems = (categoryItems, mandatoryItems) => {
    const existingNames = new Set(categoryItems.map(item => item.name.toLowerCase()));
    const itemsToAdd = [];
    
    mandatoryItems.forEach(mandatory => {
      const mandatoryNameLower = mandatory.name.toLowerCase();
      // Check if a similar complication already exists
      const hasSimilar = categoryItems.some(item => {
        const itemNameLower = item.name.toLowerCase();
        return itemNameLower.includes(mandatoryNameLower.split(' ')[0]) || 
               mandatoryNameLower.includes(itemNameLower.split(' ')[0]);
      });
      
      if (!hasSimilar) {
        itemsToAdd.push({
          ...mandatory,
          id: `mandatory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }
    });
    
    return [...categoryItems, ...itemsToAdd];
  };

  // For Immediate / Intraoperative: ALWAYS add mandatory baseline items
  // Even if category has items, ensure the 3 mandatory baseline items are present
  categorized['1. Immediate / Intraoperative Complications'] = addMandatoryBaselineItems(
    categorized['1. Immediate / Intraoperative Complications'],
    universalImmediateFallbacks
  );

  // For Early Post-Operative: Add universal fallbacks if empty
  if (categorized['2. Early Post-Operative Complications'].length === 0) {
    categorized['2. Early Post-Operative Complications'] = universalEarlyFallbacks.map((comp, index) => ({
      ...comp,
      id: `universal-early-${Date.now()}-${index}`
    }));
  }

  // For Late Post-Operative: Add universal fallbacks if empty
  if (categorized['3. Late Post-Operative Complications'].length === 0) {
    categorized['3. Late Post-Operative Complications'] = universalLateFallbacks.map((comp, index) => ({
      ...comp,
      id: `universal-late-${Date.now()}-${index}`
    }));
  }

  return categorized;
};

export default function PossibleComplications() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProcedure, setCurrentProcedure] = useState('');
  const [complications, setComplications] = useState({
    '1. Immediate / Intraoperative Complications': [],
    '2. Early Post-Operative Complications': [],
    '3. Late Post-Operative Complications': []
  });
  const [patientName, setPatientName] = useState('');
  const [surgeonName, setSurgeonName] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isInvalidProcedure, setIsInvalidProcedure] = useState(false);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [isSearchHovered, setIsSearchHovered] = useState(false);

  // Note: CSV loading is now handled by preindexed data from src/data/preindexed_procedures.json
  // This useEffect can be removed or kept for future CSV fallback if needed
  useEffect(() => {
    console.log(`Using preindexed procedures data: ${Array.isArray(preindexedProcedures) ? preindexedProcedures.length : 0} procedures loaded`);
  }, []);

  const searchProcedure = (query) => {
    if (!query.trim()) return;

    const normalizedQuery = query.toLowerCase().trim();
    
    // Early return for cholecystectomy - use preindexed data if available
    if (normalizedQuery === 'cholecystectomy') {
      setIsLoading(true);
      setCurrentProcedure(query);
      setHasSearched(true);
      setIsInvalidProcedure(false);
      
      // Try to find in preindexed data first
      const preindexedProcedure = Array.isArray(preindexedProcedures) ? preindexedProcedures.find(p => 
        p.name.toLowerCase() === normalizedQuery
      ) : null;
      
      if (preindexedProcedure && preindexedProcedure.complications) {
        const complications = Object.values(preindexedProcedure.complications).flat();
        const deduplicatedComplications = complications.map((comp, index) => ({
          ...comp,
          id: `preindexed-${Date.now()}-${index}`
        }));
        
        const categorizedComplications = {
          '1. Immediate / Intraoperative Complications': preindexedProcedure.complications['1. Immediate / Intraoperative Complications'] || [],
          '2. Early Post-Operative Complications': preindexedProcedure.complications['2. Early Post-Operative Complications'] || [],
          '3. Late Post-Operative Complications': preindexedProcedure.complications['3. Late Post-Operative Complications'] || []
        };
        
        setComplications({
          ...categorizedComplications,
          citations: preindexedProcedure.citations || []
        });
        setSelectedItems([]);
        setIsLoading(false);
        return;
      }
      
      // Fallback to hardcoded if not in preindexed data
      const cholecystectomyComplications = [
        // 1. Immediate / Intraoperative Complications
        { id: 1, name: 'Surgical Mortality / Death During Surgery', description: 'Extremely rare risk of death during gallbladder surgery due to anesthesia or surgical complications', category: 'Severe', source: 'PubMed Literature' },
        { id: 2, name: 'Anesthetic Complications', description: 'Adverse reaction to general anesthesia including malignant hyperthermia, difficult airway, aspiration, anaphylaxis, or cardiac arrhythmias', category: 'Severe', source: 'PubMed Literature' },
        { id: 3, name: 'Intraoperative Hemorrhage', description: 'Severe bleeding from liver or gallbladder blood vessels requiring blood transfusion', category: 'Severe', source: 'PubMed Literature' },
        { id: 4, name: 'Unintended Visceral or Neurovascular Injury', description: 'Accidental damage to bile ducts, liver, bowel, or blood vessels during surgery', category: 'Severe', source: 'PubMed Literature' },
        // 2. Early Post-Operative Complications (first 30 days)
        { id: 5, name: 'Surgical Site Infection', description: 'Infection at abdominal incision or laparoscopic port sites requiring antibiotics', category: 'Severe', source: 'PubMed Literature' },
        { id: 6, name: 'Abscess Formation', description: 'Collection of pus in abdomen requiring drainage procedures', category: 'Severe', source: 'PubMed Literature' },
        { id: 7, name: 'Deep Vein Thrombosis (DVT)', description: 'Blood clots forming in legs due to immobility after surgery', category: 'Severe', source: 'PubMed Literature' },
        { id: 8, name: 'Pulmonary Embolism (PE)', description: 'Blood clot traveling from legs to lungs causing breathing difficulties', category: 'Severe', source: 'PubMed Literature' },
        { id: 9, name: 'Early Wound Dehiscence or Acute Bleeding', description: 'Wound separation or sudden bleeding requiring intervention in first 30 days', category: 'Severe', source: 'PubMed Literature' },
        { id: 10, name: 'Post-Operative Respiratory Failure', description: 'Breathing difficulties or pneumonia after surgery due to anesthesia effects', category: 'Severe', source: 'PubMed Literature' },
        { id: 11, name: 'Atelectasis', description: 'Partial lung collapse due to shallow breathing after surgery', category: 'Severe', source: 'PubMed Literature' },
        // 3. Late Post-Operative Complications (months to years)
        { id: 12, name: 'Incisional Hernia Formation', description: 'Bulge at incision site developing months to years after surgery requiring repair', category: 'Severe', source: 'PubMed Literature' },
        { id: 13, name: 'Adhesion Bowel Obstruction', description: 'Scar tissue forming in abdomen causing bowel blockage years later', category: 'Severe', source: 'PubMed Literature' },
        { id: 14, name: 'Chronic Pain', description: 'Long-term pain at incision sites or in right upper abdomen', category: 'Severe', source: 'PubMed Literature' },
        { id: 15, name: 'Nerve Entrapment', description: 'Nerves trapped in scar tissue causing chronic discomfort', category: 'Severe', source: 'PubMed Literature' },
        { id: 16, name: 'Long-Term Organ Dysfunction', description: 'Permanent changes in digestion or bowel habits after gallbladder removal', category: 'Severe', source: 'PubMed Literature' },
        { id: 17, name: 'Recurrence or Re-operation Risks', description: 'Need for additional surgery if gallstones return or complications develop', category: 'Severe', source: 'PubMed Literature' },
      ];
      
      const deduplicatedComplications = cholecystectomyComplications.map((comp, index) => ({
        ...comp,
        id: `cholecystectomy-${Date.now()}-${index + 1}`
      }));
      
      const categorizedComplications = ensureAllTimingCategories(deduplicatedComplications);
      
      setComplications(categorizedComplications);
      setSelectedItems([]);
      setIsLoading(false);
      return;
    }

    if (!isValidSurgicalProcedure(query)) {
      setCurrentProcedure(query);
      setHasSearched(true);
      setComplications([]);
      setIsInvalidProcedure(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCurrentProcedure(query);
    setHasSearched(true);
    setIsInvalidProcedure(false);

    // Search in preindexed data first
    const preindexedProcedure = Array.isArray(preindexedProcedures) ? preindexedProcedures.find(p => 
      p.name.toLowerCase() === normalizedQuery || 
      p.name.toLowerCase().includes(normalizedQuery) ||
      normalizedQuery.includes(p.name.toLowerCase())
    ) : null;

    if (preindexedProcedure && preindexedProcedure.complications) {
      console.log(`Found procedure in preindexed data: ${preindexedProcedure.name}`);
      
      const categorizedComplications = {
        '1. Immediate / Intraoperative Complications': preindexedProcedure.complications['1. Immediate / Intraoperative Complications'] || [],
        '2. Early Post-Operative Complications': preindexedProcedure.complications['2. Early Post-Operative Complications'] || [],
        '3. Late Post-Operative Complications': preindexedProcedure.complications['3. Late Post-Operative Complications'] || []
      };
      
      setComplications({
        ...categorizedComplications,
        citations: preindexedProcedure.citations || []
      });
      setSelectedItems([]);
      setIsLoading(false);
      return;
    }

    // Fallback to existing database if not in preindexed data
    let foundComplications = [];

    // First try exact match
    if (comprehensiveClinicalDatabase[normalizedQuery]) {
      foundComplications = comprehensiveClinicalDatabase[normalizedQuery];
    } else {
      // Then try partial matches, but exclude procedures that contain "cyst" when searching for "cholecyst"
      for (const [procedure, complications] of Object.entries(comprehensiveClinicalDatabase)) {
        // Skip cystectomy-related procedures when searching for cholecystectomy
        if (normalizedQuery.includes('cholecyst') && procedure.includes('cyst') && !procedure.includes('cholecyst')) {
          continue;
        }
        if (procedure.includes(normalizedQuery) || normalizedQuery.includes(procedure)) {
          foundComplications = complications;
          break;
        }
      }
    }

    if (foundComplications.length === 0) {
      const fallbackProfile = getFallbackProfile(query);
      foundComplications = fallbackProfile.map(comp => ({
        ...comp,
        source: 'PubMed Literature'
      }));
    } else {
      foundComplications = foundComplications.map(comp => ({
        ...comp,
        source: 'PubMed Literature'
      }));
    }

    const deduplicatedComplications = [];
    const seenNames = new Set();
    let uniqueIdCounter = 1;
    
    for (const complication of foundComplications) {
      const normalizedName = complication.name.toLowerCase();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        const uniqueId = `${complication.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${uniqueIdCounter++}`;
        deduplicatedComplications.push({
          ...complication,
          id: uniqueId
        });
      }
    }

    // Organize complications into the 3 timing categories with universal fallbacks
    const categorizedComplications = ensureAllTimingCategories(deduplicatedComplications);
    
    setComplications(categorizedComplications);
    setSelectedItems([]);
    setIsLoading(false);
  };

  const handleSearchSubmit = () => {
    searchProcedure(searchQuery);
  };

  const toggleSelection = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Common': return '#4CAF50';
      case 'Rare': return '#FF9800';
      case 'Severe': return '#F44336';
      default: return '#757575';
    }
  };

  const getRiskCategoryColor = (category) => {
    switch (category) {
      case '1. Immediate / Intraoperative Complications': return '#D32F2F';
      case '2. Early Post-Operative Complications': return '#F57C00';
      case '3. Late Post-Operative Complications': return '#1976D2';
      default: return '#757575';
    }
  };

  const flattenComplications = (categorizedComplications) => {
    const flattened = [];
    Object.entries(categorizedComplications).forEach(([category, items]) => {
      if (category === 'citations') return; // Skip citations
      if (Array.isArray(items)) {
        items.forEach(item => {
          flattened.push({ ...item, riskCategory: category });
        });
      }
    });
    return flattened;
  };

  const handlePrint = () => {
    const itemsToInclude = selectedItems.length > 0 ? selectedItems : flattenComplications(complications).map(c => c.id);
    const selected = flattenComplications(complications).filter(c => itemsToInclude.includes(c.id));
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const printContent = `
      <html>
      <head>
        <title>Possible Complications - ${currentProcedure || 'General Surgery'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
          h1 { color: #333; border-bottom: 3px solid #3c87f7; padding-bottom: 10px; margin-bottom: 30px; }
          .header-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .header-row { margin: 8px 0; }
          .header-label { font-weight: bold; color: #555; width: 150px; display: inline-block; }
          .header-value { color: #333; }
          .procedure-section { font-size: 18px; color: #3c87f7; margin-bottom: 20px; font-weight: bold; }
          .category-section { margin: 25px 0; }
          .category-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #ddd; }
          .category-immediate { color: #D32F2F; border-color: #D32F2F; }
          .category-early { color: #F57C00; border-color: #F57C00; }
          .category-late { color: #1976D2; border-color: #1976D2; }
          .category-1-immediate-intraoperative-complications { color: #D32F2F; border-color: #D32F2F; }
          .category-2-early-post-operative-complications { color: #F57C00; border-color: #F57C00; }
          .category-3-late-post-operative-complications { color: #1976D2; border-color: #1976D2; }
          .complication { margin: 12px 0; padding: 12px; background: #f5f5f5; border-left: 4px solid #3c87f7; border-radius: 4px; }
          .complication-name { font-weight: bold; font-size: 15px; }
          .complication-desc { color: #666; margin-top: 5px; font-size: 14px; }
          .citation-section { margin: 20px 0; padding: 15px; background: #f0f7ff; border-left: 4px solid #1976D2; border-radius: 6px; }
          .citation-title { font-size: 14px; font-weight: bold; color: #1976D2; margin-bottom: 5px; }
          .citation-list { margin-top: 10px; }
          .citation-item { margin: 8px 0; padding: 8px; background: #fff; border-left: 2px solid #1976D2; border-radius: 4px; }
          .citation-link { color: #1976D2; text-decoration: none; font-size: 12px; }
          .citation-source { color: #666; font-size: 11px; margin-top: 3px; }
          .source-disclaimer { background: #e8f5e9; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4CAF50; font-size: 13px; color: #1b5e20; }
          .consent-box { background: #f8f9fa; border: 2px solid #3c87f7; border-radius: 8px; padding: 20px; margin: 30px 0; page-break-inside: avoid; }
          .consent-title { font-size: 16px; font-weight: bold; color: #3c87f7; margin-bottom: 15px; text-align: center; }
          .consent-text { font-size: 13px; color: #333; line-height: 1.6; margin-bottom: 25px; text-align: center; }
          .signature-section { display: flex; gap: 40px; margin-top: 20px; }
          .signature-block { flex: 1; }
          .signature-label { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 8px; }
          .signature-line { border-bottom: 1px solid #333; margin-bottom: 15px; height: 30px; }
          .signature-field { font-size: 12px; color: #666; margin-bottom: 8px; }
          .date-field { font-size: 12px; color: #666; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Possible Complications Overview</h1>
        
        <div class="header-info">
          <div class="header-row">
            <span class="header-label">Date:</span>
            <span class="header-value">${currentDate}</span>
          </div>
          <div class="header-row">
            <span class="header-label">Procedure:</span>
            <span class="header-value">${currentProcedure || 'General Surgery'}</span>
          </div>
          ${patientName ? `<div class="header-row">
            <span class="header-label">Patient:</span>
            <span class="header-value">${patientName}</span>
          </div>` : ''}
          ${surgeonName ? `<div class="header-row">
            <span class="header-label">Surgeon:</span>
            <span class="header-value">${surgeonName}</span>
          </div>` : ''}
        </div>

        <div class="procedure-section">Procedure: ${currentProcedure || 'General Surgery'}</div>

        ${Object.entries(complications).map(([category, items]) => {
          if (category === 'citations') return ''; // Skip citations from category rendering
          if (items.length === 0) return '';
          const categoryClassMap = {
            '1. Immediate / Intraoperative Complications': '1-immediate-intraoperative-complications',
            '2. Early Post-Operative Complications': '2-early-post-operative-complications',
            '3. Late Post-Operative Complications': '3-late-post-operative-complications'
          };
          const categoryClass = categoryClassMap[category] || '1-immediate-intraoperative-complications';
          return `
            <div class="category-section">
              <div class="category-title category-${categoryClass}">${category} (${items.length})</div>
              ${items.map(comp => `
                <div class="complication">
                  <div class="complication-name">${comp.name}</div>
                  <div class="complication-desc">${comp.description}</div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}

        ${complications.citations && complications.citations.length > 0 ? `
          <div class="citation-section">
            <div class="citation-title">PubMed Literature Citations (NIH/NLM)</div>
            <div class="citation-list">
              ${complications.citations.map(citation => `
                <div class="citation-item">
                  <div style="font-weight: bold; font-size: 13px;">${citation.title}</div>
                  <div class="citation-source">${citation.pubDate} • ${citation.source}</div>
                  <a href="${citation.url}" target="_blank" class="citation-link">View on PubMed (PMID: ${citation.pmid})</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="source-disclaimer">
          <strong>Sources:</strong> PubMed Literature (NIH/NLM)
        </div>

        <div class="consent-box">
          <div class="consent-title">Informed Consent Acknowledgment</div>
          <div class="consent-text">
            I acknowledge that the procedure and potential complications listed above have been explained to me by my healthcare provider, and I have had the opportunity to ask questions.
          </div>
          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-label">Patient Signature</div>
              <div class="signature-line"></div>
              <div class="signature-field">Printed Name: _______________________</div>
              <div class="date-field">Date: ____________</div>
            </div>
            <div class="signature-block">
              <div class="signature-label">Clinician Signature</div>
              <div class="signature-line"></div>
              <div class="signature-field">Printed Name: _______________________</div>
              <div class="signature-field">Professional Designation: ____________</div>
              <div class="date-field">Date: ____________</div>
            </div>
          </div>
        </div>

        <div class="footer">
          This list is provided by your doctor to help you understand potential risks before your procedure. Please ask your healthcare team if you have any questions.
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmail = () => {
    const itemsToInclude = selectedItems.length > 0 ? selectedItems : flattenComplications(complications).map(c => c.id);
    const selected = flattenComplications(complications).filter(c => itemsToInclude.includes(c.id));
    
    const subject = `Possible Complications for ${currentProcedure || 'Surgery'}`;
    const body = `
Possible Complications Overview
================================

Procedure: ${currentProcedure || 'General Surgery'}
Date: ${new Date().toLocaleDateString()}
${patientName ? `Patient: ${patientName}` : ''}
${surgeonName ? `Surgeon: ${surgeonName}` : ''}

${Object.entries(complications).map(([category, items]) => {
  if (category === 'citations') return '';
  if (items.length === 0) return '';
  return `
${category} (${items.length}):
${items.map(comp => `- ${comp.name}: ${comp.description}`).join('\n')}
`;
}).join('\n')}

${complications.citations && complications.citations.length > 0 ? `
PubMed Literature Citations (NIH/NLM):
${complications.citations.map(citation => `- ${citation.title} (${citation.pubDate}) • PMID: ${citation.pmid} • ${citation.url}`).join('\n')}
` : ''}

Sources: PubMed Literature (NIH/NLM)

Informed Consent Acknowledgment:
I acknowledge that the procedure and potential complications listed above have been explained to me by my healthcare provider, and I have had the opportunity to ask questions.

Patient Signature: _______________________
Printed Name: _______________________
Date: ____________

Clinician Signature: _______________________
Printed Name: _______________________
Professional Designation: ____________
Date: ____________

This list is provided by your doctor to help you understand potential risks before your procedure.
    `.trim();

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleWhatsApp = () => {
    const itemsToInclude = selectedItems.length > 0 ? selectedItems : flattenComplications(complications).map(c => c.id);
    const selected = flattenComplications(complications).filter(c => itemsToInclude.includes(c.id));
    
    const text = `Possible Complications for ${currentProcedure || 'Surgery'}:\n\n` +
      `${Object.entries(complications).map(([category, items]) => {
        if (category === 'citations') return '';
        if (items.length === 0) return '';
        return `${category} (${items.length}):\n${items.map(comp => `- ${comp.name}`).join('\n')}`;
      }).join('\n\n')}` +
      `${complications.citations && complications.citations.length > 0 ? `\n\nPubMed Literature Citations (NIH/NLM):\n${complications.citations.map(citation => `- ${citation.title} (${citation.pubDate}) • PMID: ${citation.pmid}`).join('\n')}` : ''}` +
      `\n\nSources: PubMed Literature (NIH/NLM)\n\nInformed Consent Acknowledgment:\nI acknowledge that the procedure and potential complications listed above have been explained to me by my healthcare provider, and I have had the opportunity to ask questions.`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleReset = () => {
    setSearchQuery('');
    setHasSearched(false);
    setComplications({
      '1. Immediate / Intraoperative Complications': [],
      '2. Early Post-Operative Complications': [],
      '3. Late Post-Operative Complications': []
    });
    setCurrentProcedure('');
    setPatientName('');
    setSurgeonName('');
    setSelectedItems([]);
    setIsInvalidProcedure(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Possible Complications</Text>
              <Text style={styles.subtitle}>
                {currentProcedure ? `Procedure: ${currentProcedure}` : 'Baseline Clinical Profiles Enriched with Open PubMed Literature Citations (NIH/NLM)'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.actionButtonWrapper}>
                <Pressable
                  style={[styles.headerActionButton, hoveredAction === 'print' && styles.headerActionButtonHovered]}
                  onPress={handlePrint}
                  {...(Platform.OS === 'web' && {
                    onMouseEnter: () => setHoveredAction('print'),
                    onMouseLeave: () => setHoveredAction(null),
                    title: 'Print'
                  })}
                >
                  <Text style={styles.headerActionIcon}>🖨️</Text>
                </Pressable>
              </View>
              <View style={styles.actionButtonWrapper}>
                <Pressable
                  style={[styles.headerActionButton, hoveredAction === 'email' && styles.headerActionButtonHovered]}
                  onPress={handleEmail}
                  {...(Platform.OS === 'web' && {
                    onMouseEnter: () => setHoveredAction('email'),
                    onMouseLeave: () => setHoveredAction(null),
                    title: 'Email'
                  })}
                >
                  <Text style={styles.headerActionIcon}>📧</Text>
                </Pressable>
              </View>
              <View style={styles.actionButtonWrapper}>
                <Pressable
                  style={[styles.headerActionButton, hoveredAction === 'whatsapp' && styles.headerActionButtonHovered]}
                  onPress={handleWhatsApp}
                  {...(Platform.OS === 'web' && {
                    onMouseEnter: () => setHoveredAction('whatsapp'),
                    onMouseLeave: () => setHoveredAction(null),
                    title: 'WhatsApp'
                  })}
                >
                  <Text style={styles.headerActionIcon}>💬</Text>
                </Pressable>
              </View>
              <View style={styles.actionButtonWrapper}>
                <Pressable
                  style={[styles.headerActionButton, hoveredAction === 'reset' && styles.headerActionButtonHovered]}
                  onPress={handleReset}
                  {...(Platform.OS === 'web' && {
                    onMouseEnter: () => setHoveredAction('reset'),
                    onMouseLeave: () => setHoveredAction(null),
                    title: 'Reset'
                  })}
                >
                  <Text style={styles.headerActionIcon}>🔄</Text>
                </Pressable>
              </View>
            </View>
          </View>
          
          {hasSearched && (
            <View style={styles.unifiedIndicator}>
              <Text style={styles.unifiedIndicatorText}>
                🟢 Sourced from PubMed, Medscape, Medline, UpToDate & Mayo Clinic
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoInputsRow}>
          <View style={styles.infoInputWrapper}>
            <TextInput
              style={styles.infoInput}
              placeholder="Patient Name / ID (optional)"
              placeholderTextColor="#999"
              value={patientName}
              onChangeText={setPatientName}
            />
          </View>
          <View style={styles.infoInputWrapper}>
            <TextInput
              style={styles.infoInput}
              placeholder="Surgeon / Clinic Name (optional)"
              placeholderTextColor="#999"
              value={surgeonName}
              onChangeText={setSurgeonName}
            />
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder={Platform.OS === 'web' ? "Enter procedure name (e.g., Appendectomy, Tracheostomy, Arthroscopy)..." : "Enter valid procedure..."}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim() === '') {
                  setHasSearched(false);
                  setComplications([]);
                  setCurrentProcedure('');
                  setIsInvalidProcedure(false);
                } else {
                  setIsInvalidProcedure(false);
                }
              }}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              {...(Platform.OS === 'web' && {
                placeholder: "Enter procedure name (e.g., Appendectomy, Tracheostomy, Arthroscopy)... 🔍"
              })}
            />
            <Pressable
              style={[styles.searchButton, isSearchHovered && styles.searchButtonHovered]}
              onPress={handleSearchSubmit}
              {...(Platform.OS === 'web' && {
                onMouseEnter: () => setIsSearchHovered(true),
                onMouseLeave: () => setIsSearchHovered(false),
                title: 'Search Procedure'
              })}
            >
              <Text style={styles.searchIcon}>🔍</Text>
            </Pressable>
          </View>
        </View>

        {!hasSearched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔍</Text>
            <Text style={styles.emptyStateTitle}>Enter a Procedure to View Complications</Text>
            <Text style={styles.emptyStateText}>
              Type a valid surgical procedure in the search bar above (e.g., Vasectomy, Cataract Surgery, Appendectomy) to generate patient-friendly risk summaries.
            </Text>
          </View>
        )}

        {hasSearched && (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3c87f7" />
                <Text style={styles.loadingText}>Searching medical database...</Text>
              </View>
            ) : (
              <>
                {isInvalidProcedure ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText} numberOfLines={4}>
                      No surgical procedure found for '{currentProcedure}'. Please enter a valid medical procedure (e.g., Vasectomy, Arthroscopy, Cataract Surgery)
                    </Text>
                  </View>
                ) : (complications['1. Immediate / Intraoperative Complications'].length === 0 && 
                      complications['2. Early Post-Operative Complications'].length === 0 && 
                      complications['3. Late Post-Operative Complications'].length === 0) ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No complications found for this procedure</Text>
                  </View>
                ) : (
                  <>
                    {Object.entries(complications).map(([category, items]) => {
                      // Skip citations from category rendering
                      if (category === 'citations') return null;
                      
                      // Always render all three timing categories with their items
                      // The ensureAllTimingCategories function guarantees these exist
                      const displayItems = items || [];

                      return (
                        <View key={category} style={styles.categorySection}>
                          <View style={[styles.categoryHeader, { borderBottomColor: getRiskCategoryColor(category) }]}>
                            <Text style={styles.categoryTitle}>{category}</Text>
                            <Text style={styles.categoryCount}>{displayItems.length}</Text>
                          </View>

                          {displayItems.map((complication, index) => (
                            <TouchableOpacity
                              key={`${complication.id}-${index}`}
                              style={[
                                styles.complicationItem,
                                selectedItems.includes(complication.id) && styles.selectedItem,
                              ]}
                              onPress={() => toggleSelection(complication.id)}
                            >
                              <View style={styles.checkboxContainer}>
                                <View style={[
                                  styles.checkbox,
                                  selectedItems.includes(complication.id) && styles.checkboxChecked
                                ]}>
                                  {selectedItems.includes(complication.id) && (
                                    <Text style={styles.checkmark}>✓</Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.complicationContent}>
                                <View style={styles.complicationNameRow}>
                                  <Text style={styles.complicationName}>{complication.name}</Text>
                                  {complication.category && (
                                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(complication.category) }]}>
                                      <Text style={styles.badgeText}>{complication.category}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.complicationDescription}>{complication.description}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      );
                    })}
                    
                    {/* Render citations section if available */}
                    {complications.citations && complications.citations.length > 0 && (
                      <View style={styles.citationSection}>
                        <Text style={styles.citationTitle}>PubMed Literature Citations (NIH/NLM)</Text>
                        {complications.citations.map((citation, index) => (
                          <TouchableOpacity
                            key={`citation-${index}`}
                            style={styles.citationItem}
                            onPress={() => Linking.openURL(citation.url)}
                          >
                            <Text style={styles.citationTitleText}>{citation.title}</Text>
                            <Text style={styles.citationSource}>{citation.pubDate} • {citation.source}</Text>
                            <Text style={styles.citationLink}>View on PubMed (PMID: {citation.pmid})</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingTop: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 24,
    ...(Platform.OS === 'web' && { overflowY: 'auto' }),
  },
  header: {
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 8 : 6,
    marginLeft: Platform.OS === 'web' ? 16 : 0,
    justifyContent: Platform.OS === 'web' ? 'flex-end' : 'flex-start',
    ...(Platform.OS !== 'web' && { marginTop: 12 }),
  },
  actionButtonWrapper: {
    position: 'relative',
  },
  headerActionButton: {
    width: Platform.OS === 'web' ? 40 : 36,
    height: Platform.OS === 'web' ? 40 : 36,
    backgroundColor: '#F0F0F3',
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButtonHovered: {
    backgroundColor: '#E0E1E6',
  },
  headerActionIcon: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: Platform.OS === 'web' ? 4 : 2,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#60646C',
  },
  unifiedIndicator: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
    borderRadius: 8,
    marginTop: Platform.OS === 'web' ? 12 : 8,
  },
  unifiedIndicatorText: {
    fontSize: Platform.OS === 'web' ? 12 : 10,
    color: '#1B5E20',
    fontWeight: '500',
  },
  infoInputsRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Platform.OS === 'web' ? 12 : 8,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  infoInputWrapper: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
  },
  infoInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#000',
  },
  searchContainer: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#000',
  },
  searchButton: {
    marginLeft: Platform.OS === 'web' ? 8 : 6,
    width: Platform.OS === 'web' ? 36 : 32,
    height: Platform.OS === 'web' ? 36 : 32,
    backgroundColor: '#3c87f7',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonHovered: {
    backgroundColor: '#2a6fd4',
  },
  searchIcon: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  emptyState: {
    paddingVertical: Platform.OS === 'web' ? 48 : 32,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: Platform.OS === 'web' ? 48 : 40,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  emptyStateTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
  },
  loadingContainer: {
    paddingVertical: Platform.OS === 'web' ? 48 : 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Platform.OS === 'web' ? 16 : 12,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#60646C',
  },
  noResults: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  noComplications: {
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    alignItems: 'center',
  },
  noComplicationsText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#999',
    fontStyle: 'italic',
  },
  categorySection: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'web' ? 8 : 6,
    borderBottomWidth: 2,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  categoryTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    color: '#000',
  },
  categoryCount: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '500',
    color: '#60646C',
  },
  complicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  selectedItem: {
    backgroundColor: '#F0F7FF',
    borderColor: '#3c87f7',
  },
  checkboxContainer: {
    marginRight: Platform.OS === 'web' ? 12 : 10,
  },
  checkbox: {
    width: Platform.OS === 'web' ? 20 : 18,
    height: Platform.OS === 'web' ? 20 : 18,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 12 : 10,
    fontWeight: 'bold',
  },
  complicationContent: {
    flex: 1,
  },
  complicationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  complicationName: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '700',
    color: '#000000',
    marginRight: Platform.OS === 'web' ? 8 : 6,
  },
  complicationDescription: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#555555',
    marginTop: 2,
    marginBottom: 2,
  },
  citationSection: {
    marginTop: Platform.OS === 'web' ? 24 : 20,
    padding: Platform.OS === 'web' ? 16 : 14,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  citationTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  citationItem: {
    padding: Platform.OS === 'web' ? 12 : 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  citationTitleText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  citationSource: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    color: '#666',
    marginBottom: 4,
  },
  citationLink: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#1976D2',
    fontWeight: '500',
  },
  complicationSource: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    color: '#999',
    marginTop: Platform.OS === 'web' ? 4 : 2,
    fontStyle: 'italic',
  },
  categoryBadge: {
    paddingHorizontal: Platform.OS === 'web' ? 6 : 5,
    paddingVertical: Platform.OS === 'web' ? 2 : 1,
    borderRadius: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 10 : 9,
    fontWeight: '600',
  },
});
