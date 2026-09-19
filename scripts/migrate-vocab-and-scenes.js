import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const vocabPath = path.join(rootDir, 'data', 'vocab_5000.json');
const scenesDir = path.join(rootDir, 'src', 'data', 'scenes');

console.log('--- Starting Migration ---');

// 1. Read existing vocab_5000.json
const rawVocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
console.log(`Read ${rawVocab.length} words from vocab_5000.json`);

// 2. Assign ID word_0001..word_4350 to existing words
let nextIdNum = 1;
const vocabList = [];
const vocabByTermLower = new Map();

for (const entry of rawVocab) {
  const idStr = `word_${String(nextIdNum++).padStart(4, '0')}`;
  const term = entry.term || entry.word;
  const meaningVi = entry.meaning_vi || entry.meaningVi;
  const pos = entry.pos || entry.partOfSpeech || 'noun';

  const normalized = {
    id: idStr,
    term: term,
    word: term,
    meaning_vi: meaningVi,
    meaningVi: meaningVi,
    pos: pos,
    partOfSpeech: pos,
    topic: entry.topic || 'General',
    ipa: entry.ipa || '',
    example: entry.example || '',
    collocation: entry.collocation || '',
    imageable: Boolean(entry.imageable || false),
    visualType: entry.visualType || null,
  };

  vocabList.push(normalized);
  const termKey = term.trim().toLowerCase();
  if (!vocabByTermLower.has(termKey)) {
    vocabByTermLower.set(termKey, normalized);
  }
}

console.log(`Assigned IDs to ${vocabList.length} initial entries.`);

// 3. Process each scene file
const sceneFiles = [
  'job_interview.json',
  'office_rules.json',
  'office_main.json',
  'office_equipment.json',
  'business_meeting.json',
  'leisure_community.json',
  'restaurant_cafe.json',
  'airport_travel.json',
  'conference_hall.json',
  'retail_store.json',
];

let totalHotspots = 0;
let matchedExisting = 0;
let newlyCreated = 0;

for (const filename of sceneFiles) {
  const sceneFilePath = path.join(scenesDir, filename);
  const scene = JSON.parse(fs.readFileSync(sceneFilePath, 'utf8'));

  const updatedZones = [];

  for (const zone of scene.zones || []) {
    const updatedItems = [];

    for (const item of zone.items || []) {
      totalHotspots++;
      const itemWord = (item.term || item.word || '').trim();
      const itemKey = itemWord.toLowerCase();

      let matchedVocab = vocabByTermLower.get(itemKey);

      if (matchedVocab) {
        matchedExisting++;
        // Enrich matched entry
        matchedVocab.imageable = true;
        matchedVocab.visualType = item.visualType || 'object';
        if (item.ipa && !matchedVocab.ipa) matchedVocab.ipa = item.ipa;
        if (item.example && !matchedVocab.example) matchedVocab.example = item.example;
        if (item.collocation && !matchedVocab.collocation) matchedVocab.collocation = item.collocation;
        if (item.meaningVi && !matchedVocab.meaning_vi) {
          matchedVocab.meaning_vi = item.meaningVi;
          matchedVocab.meaningVi = item.meaningVi;
        }
      } else {
        newlyCreated++;
        const newIdStr = `word_${String(nextIdNum++).padStart(4, '0')}`;
        matchedVocab = {
          id: newIdStr,
          term: itemWord,
          word: itemWord,
          meaning_vi: item.meaningVi || '',
          meaningVi: item.meaningVi || '',
          pos: item.pos || 'noun',
          partOfSpeech: item.pos || 'noun',
          topic: scene.topic || scene.category || 'Visual Vocabulary',
          ipa: item.ipa || '',
          example: item.example || '',
          collocation: item.collocation || '',
          imageable: true,
          visualType: item.visualType || 'object',
        };
        vocabList.push(matchedVocab);
        vocabByTermLower.set(itemKey, matchedVocab);
      }

      // Stripped scene item: ONLY vocabId and hotspot
      updatedItems.push({
        vocabId: matchedVocab.id,
        hotspot: item.hotspot,
      });
    }

    updatedZones.push({
      ...zone,
      items: updatedItems,
    });
  }

  const updatedScene = {
    ...scene,
    zones: updatedZones,
  };

  fs.writeFileSync(sceneFilePath, JSON.stringify(updatedScene, null, 2) + '\n', 'utf8');
  console.log(`Updated scene: ${filename}`);
}

// 4. Save updated vocab_5000.json
fs.writeFileSync(vocabPath, JSON.stringify(vocabList, null, 2) + '\n', 'utf8');
console.log(`Saved ${vocabList.length} total entries to vocab_5000.json`);
console.log(`Stats: ${totalHotspots} total hotspots, ${matchedExisting} matched existing vocab, ${newlyCreated} newly created vocab.`);
console.log('--- Migration Completed Successfully ---');
