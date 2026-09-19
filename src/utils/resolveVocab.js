import vocabData from '../../data/vocab_5000.json';

// Build O(1) index map by id
const vocabById = new Map();
for (const v of vocabData) {
  if (v.id) {
    vocabById.set(v.id, v);
  }
}

/**
 * Resolves a lightweight scene item ({ vocabId, hotspot }) into a full vocab item
 * with backward-compatible aliases for all UI components.
 */
export function resolveSceneItem(item) {
  if (!item) return null;
  const vocabId = item.vocabId || item.id;
  const vocab = vocabById.get(vocabId);

  if (!vocab) {
    console.warn(`[resolveVocab] vocabId not found: ${vocabId}`);
    return {
      ...item,
      id: vocabId,
      vocabId,
      word: 'Unknown',
      term: 'Unknown',
      meaningVi: '',
      meaning_vi: '',
      meaning: '',
      pos: 'noun',
      partOfSpeech: 'noun',
      ipa: '',
      example: '',
      collocation: '',
      imageable: false,
      visualType: 'object',
      hotspot: item.hotspot || { x: 0.5, y: 0.5 },
    };
  }

  const term = vocab.term || vocab.word || '';
  const meaningVi = vocab.meaning_vi || vocab.meaningVi || '';
  const pos = vocab.pos || vocab.partOfSpeech || 'noun';

  return {
    ...vocab,
    id: vocabId,
    vocabId,
    word: term,
    term: term,
    meaningVi: meaningVi,
    meaning_vi: meaningVi,
    meaning: meaningVi,
    pos: pos,
    partOfSpeech: pos,
    ipa: vocab.ipa || '',
    example: vocab.example || '',
    collocation: vocab.collocation || '',
    imageable: Boolean(vocab.imageable),
    visualType: vocab.visualType || 'object',
    hotspot: item.hotspot || { x: 0.5, y: 0.5 },
  };
}

/**
 * Resolves all items within a zone.
 */
export function resolveZone(zone) {
  if (!zone) return zone;
  return {
    ...zone,
    items: (zone.items || []).map(resolveSceneItem),
  };
}

/**
 * Resolves all zones and their items within a scene.
 */
export function resolveScene(scene) {
  if (!scene) return scene;
  return {
    ...scene,
    zones: (scene.zones || []).map(resolveZone),
  };
}

export default {
  resolveSceneItem,
  resolveZone,
  resolveScene,
};
