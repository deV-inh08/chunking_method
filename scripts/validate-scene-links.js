import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const vocabPath = path.join(rootDir, 'data', 'vocab_5000.json');
const scenesDir = path.join(rootDir, 'src', 'data', 'scenes');

console.log('🔍 Validating scene links with vocab_5000.json...\n');

if (!fs.existsSync(vocabPath)) {
  console.error(`❌ vocab_5000.json not found at ${vocabPath}`);
  process.exit(1);
}

const vocabList = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
const vocabById = new Map();
const vocabIdRegex = /^word_\d{4,}$/;

for (const v of vocabList) {
  if (!v.id) {
    console.error(`❌ Entry missing id: ${JSON.stringify(v)}`);
    process.exit(1);
  }
  if (!vocabIdRegex.test(v.id)) {
    console.error(`❌ Invalid id format: ${v.id}`);
    process.exit(1);
  }
  if (vocabById.has(v.id)) {
    console.error(`❌ Duplicate id in vocab_5000.json: ${v.id}`);
    process.exit(1);
  }
  vocabById.set(v.id, v);
}

console.log(`✅ Loaded ${vocabById.size} unique vocab entries.\n`);

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
let errors = [];

for (const file of sceneFiles) {
  const filePath = path.join(scenesDir, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Scene file missing: ${file}`);
    continue;
  }

  const scene = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let sceneHotspotCount = 0;

  for (const zone of scene.zones || []) {
    for (const item of zone.items || []) {
      totalHotspots++;
      sceneHotspotCount++;

      if (!item.vocabId) {
        errors.push(`[${file} - ${zone.zoneId}] Item missing vocabId: ${JSON.stringify(item)}`);
        continue;
      }

      const vocab = vocabById.get(item.vocabId);
      if (!vocab) {
        errors.push(`[${file} - ${zone.zoneId}] vocabId "${item.vocabId}" not found in vocab_5000.json`);
        continue;
      }

      if (!vocab.imageable) {
        errors.push(`[${file} - ${zone.zoneId}] vocabId "${item.vocabId}" (${vocab.term}) does not have imageable: true`);
      }

      if (!vocab.visualType) {
        errors.push(`[${file} - ${zone.zoneId}] vocabId "${item.vocabId}" (${vocab.term}) is missing visualType`);
      }

      if (!item.hotspot || typeof item.hotspot.x !== 'number' || typeof item.hotspot.y !== 'number') {
        errors.push(`[${file} - ${zone.zoneId}] vocabId "${item.vocabId}" has invalid hotspot coordinates: ${JSON.stringify(item.hotspot)}`);
      }
    }
  }

  console.log(`✓ ${file}: ${scene.zones?.length || 0} zones, ${sceneHotspotCount} hotspots validated.`);
}

console.log(`\nTotal scenes validated: ${sceneFiles.length}`);
console.log(`Total hotspots validated: ${totalHotspots}`);

if (errors.length > 0) {
  console.error(`\n❌ Found ${errors.length} validation errors:`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL SCENE LINKS VALID! 100% integrity with vocab_5000.json.\n');
  process.exit(0);
}
