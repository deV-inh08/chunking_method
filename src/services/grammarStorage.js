// ─── Grammar Progress & SRS Integration Service ────────────────────
import * as storage from '../store/storage';
import { recordStudyActivity } from './streakService';

const STORAGE_KEY = 'toeic_grammar_progress';

/**
 * Lấy toàn bộ dữ liệu tiến độ làm bài ngữ pháp
 * @returns {Record<string, { standard?: object, advanced?: object, isMastered?: boolean }>}
 */
export function getGrammarProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load grammar progress:', err);
    return {};
  }
}

/**
 * Lấy tiến độ của một chuyên đề cụ thể
 */
export function getTopicProgress(topicId) {
  const all = getGrammarProgress();
  return all[topicId] || {
    standard: null,
    advanced: null,
    isMastered: false,
  };
}

/**
 * Lưu kết quả sau một lượt làm bài (30 câu standard hoặc 30 câu advanced)
 * @param {string} topicId - ID chuyên đề (vd: 'nouns')
 * @param {'standard' | 'advanced'} level - Chặng làm bài
 * @param {object} param2 - Kết quả: { correctCount, totalCount, wrongIds, timeSpentSec }
 */
export function saveTopicQuizResult(topicId, level, { correctCount, totalCount, wrongIds = [], timeSpentSec = 0 }) {
  const all = getGrammarProgress();
  const currentTopic = all[topicId] || {
    standard: null,
    advanced: null,
    isMastered: false,
  };

  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const levelResult = {
    completed: totalCount,
    correct: correctCount,
    score: accuracy,
    wrongIds,
    timeSpentSec,
    lastPlayedAt: new Date().toISOString(),
  };

  currentTopic[level] = levelResult;

  // Tiêu chí Mastered (Đã làm chủ chuyên đề):
  // Hoàn thành cả 2 chặng với điểm trung bình >= 80% HOẶC Chặng Tiêu chuẩn >= 90% nếu mới chỉ làm Tiêu chuẩn
  const stdScore = currentTopic.standard?.score ?? 0;
  const advScore = currentTopic.advanced?.score ?? 0;
  
  if (currentTopic.advanced && currentTopic.standard) {
    currentTopic.isMastered = stdScore >= 75 && advScore >= 75;
  } else if (currentTopic.standard) {
    currentTopic.isMastered = stdScore >= 90;
  }

  all[topicId] = currentTopic;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    recordStudyActivity();
  } catch (err) {
    console.error('Failed to save grammar progress:', err);
  }

  return currentTopic;
}

/**
 * Thống kê tổng thể quá trình luyện tập Reading
 */
export function getOverallGrammarStats() {
  const all = getGrammarProgress();
  let totalPracticed = 0;
  let totalCorrect = 0;
  let masteredTopicsCount = 0;

  Object.values(all).forEach(topicData => {
    if (topicData.isMastered) masteredTopicsCount += 1;
    if (topicData.standard) {
      totalPracticed += topicData.standard.completed || 0;
      totalCorrect += topicData.standard.correct || 0;
    }
    if (topicData.advanced) {
      totalPracticed += topicData.advanced.completed || 0;
      totalCorrect += topicData.advanced.correct || 0;
    }
  });

  const accuracy = totalPracticed > 0 ? Math.round((totalCorrect / totalPracticed) * 100) : 0;

  return {
    totalPracticed,
    totalCorrect,
    accuracy,
    masteredTopicsCount,
  };
}

// ─── SRS Chunks Integration ───────────────────────────────────────

const GRAMMAR_CHUNKS_KEY_PREFIX = 'grammar_topic_';

/**
 * Kiểm tra xem 1 cụm từ đã được lưu vào kho Chunks hay chưa
 */
export function isGrammarChunkSaved(phrase) {
  if (!phrase) return false;
  const normalized = phrase.trim().toLowerCase();
  const allChunks = storage.getAllChunks();
  return allChunks.some(c => c.phrase && c.phrase.trim().toLowerCase() === normalized);
}

/**
 * Lưu trực tiếp targetChunk của câu hỏi ngữ pháp vào kho Chunks của App để luyện SRS
 * @param {object} targetChunk - { phrase: string, meaningVi: string }
 * @param {string} topicId - 'nouns', 'adjectives', ...
 * @param {string} topicName - Tên hiển thị 'Danh từ'
 * @param {object} question - Toàn bộ dữ liệu câu hỏi
 * @returns {object} chunk vừa tạo
 */
export function saveGrammarChunkToDeck(targetChunk, topicId, topicName, question) {
  if (!targetChunk || !targetChunk.phrase) return null;

  const storageKey = `${GRAMMAR_CHUNKS_KEY_PREFIX}${topicId}`;
  const existingTopicChunks = storage.getChunks(storageKey) || [];

  // Kiểm tra trùng lặp
  const exists = existingTopicChunks.find(
    c => c.phrase.trim().toLowerCase() === targetChunk.phrase.trim().toLowerCase()
  );
  if (exists) {
    return exists;
  }

  const newChunk = {
    id: `gc_${topicId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    phrase: targetChunk.phrase.trim(),
    meaningVi: targetChunk.meaningVi?.trim() || '',
    type: 'collocation',
    sourceType: 'grammar',
    sourceWordId: storageKey,
    sourceWord: topicName,
    topic: `Ngữ pháp: ${topicName}`,
    groupId: storageKey,
    groupName: `Ngữ pháp TOEIC - ${topicName}`,
    example: question?.question ? question.question.replace('______', `[${targetChunk.phrase}]`) : targetChunk.phrase,
    clue: question?.clue || '',
    createdAt: new Date().toISOString(),
  };

  const updatedChunks = [...existingTopicChunks, newChunk];
  storage.saveChunks(storageKey, updatedChunks);

  return newChunk;
}
