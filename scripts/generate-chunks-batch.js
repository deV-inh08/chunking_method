/**
 * scripts/generate-chunks-batch.js
 *
 * Batch-generate chunks (và writing exercises) cho từ vựng trong bảng vocab_words.
 * Chạy NGOÀI app, dùng service role key.
 *
 * Cách chạy:
 *   node scripts/generate-chunks-batch.js [options]
 *
 * Options:
 *   --topic "Business & Work"   Chỉ xử lý 1 topic (bỏ qua để xử lý tất cả)
 *   --limit 100                 Giới hạn số từ xử lý (test trước khi chạy full)
 *   --delay 4000                Delay (ms) giữa các Gemini call (default: 4000)
 *   --batch-size 20             Số từ/batch cho chunk generation (default: 20)
 *   --skip-exercises            Chỉ sinh chunk, không sinh writing exercises
 *   --resume                    Chỉ xử lý từ có status='pending' (bỏ qua 'generated')
 *
 * Ví dụ:
 *   node scripts/generate-chunks-batch.js --topic "Business & Work" --limit 50
 *   node scripts/generate-chunks-batch.js --resume --delay 5000
 *
 * Env vars cần trong .env:
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   GEMINI_API_KEY=...
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
    process.exit(1);
}
if (!GEMINI_API_KEY) {
    console.error('❌ Thiếu GEMINI_API_KEY trong .env');
    process.exit(1);
}

// ─── CLI Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
    const idx = args.indexOf(name);
    if (idx === -1) return defaultVal;
    return args[idx + 1] ?? defaultVal;
}
const TOPIC_FILTER   = getArg('--topic', null);
const LIMIT          = parseInt(getArg('--limit', '99999'), 10);
const DELAY_MS       = parseInt(getArg('--delay', '4000'), 10);
const BATCH_SIZE     = parseInt(getArg('--batch-size', '20'), 10);
const SKIP_EXERCISES = args.includes('--skip-exercises');
const RESUME_ONLY    = args.includes('--resume');

// ─── Gemini call ──────────────────────────────────────────────────────────────
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Models theo thứ tự ưu tiên (giống app)
const MODEL_CANDIDATES = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
];

let _cachedModel = null;

async function resolveModel() {
    for (const model of MODEL_CANDIDATES) {
        const res = await fetch(`${BASE_URL}/models/${model}?key=${GEMINI_API_KEY}`);
        if (res.ok) { _cachedModel = model; return model; }
    }
    throw new Error('Không tìm được model Gemini khả dụng.');
}

async function callGemini(systemPrompt, userMessage, retries = 3) {
    if (!_cachedModel) await resolveModel();
    for (let attempt = 0; attempt < retries; attempt++) {
        const res = await fetch(
            `${BASE_URL}/models/${_cachedModel}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                    generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
                }),
            }
        );

        if (res.status === 429) {
            const wait = DELAY_MS * 3;
            console.warn(`   ⚠️  Rate limit. Chờ ${wait / 1000}s...`);
            await sleep(wait);
            // Try next model on persistent rate limits
            if (attempt > 0) {
                const idx = MODEL_CANDIDATES.indexOf(_cachedModel);
                if (idx < MODEL_CANDIDATES.length - 1) {
                    _cachedModel = MODEL_CANDIDATES[idx + 1];
                    console.warn(`   🔄 Thử model: ${_cachedModel}`);
                }
            }
            continue;
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/(\{[\s\S]*\})/) ||
                      text.match(/(\[[\s\S]*\])/);
        if (!match) throw new Error('Gemini response không chứa JSON hợp lệ');
        return JSON.parse(match[1]);
    }
    throw new Error('Vượt quá số lần retry.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function makeChunkId(wordId, idx) {
    return `chunk_vocab_${wordId}_${idx}_${Date.now()}`;
}
function makeExerciseId(chunkId, idx) {
    return `ex_${chunkId}_${idx}`;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
function buildChunkBatchPrompt(words) {
    const wordList = words.map(w =>
        `- id: "${w.id}", word: "${w.word}", meaning: "${w.meaning_vi}", pos: "${w.part_of_speech || 'unknown'}", topic: "${w.topic}"`
    ).join('\n');

    const systemPrompt = `Bạn là chuyên gia giảng dạy tiếng Anh, chuyên tạo chunk (cụm từ) có giá trị giao tiếp cao.
Nhiệm vụ: Với mỗi từ vựng được cung cấp, sinh 2-3 chunk (cụm từ/cấu trúc) thực tế dùng từ đó.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

    const userMessage = `Sinh 2-3 chunk cho mỗi từ trong danh sách sau:

${wordList}

Trả về JSON (mảng, mỗi phần tử cho 1 từ):
\`\`\`json
[
  {
    "wordId": "id-của-từ",
    "chunks": [
      {
        "phrase": "cụm từ tiếng Anh thực tế dùng word (ví dụ: nếu word là 'run' thì phrase có thể là 'run a meeting')",
        "meaningVi": "Nghĩa tiếng Việt đầy đủ, tự nhiên của cụm từ này",
        "usageNote": "Giải thích ngắn bằng tiếng Việt: cách dùng, ngữ cảnh điển hình (1-2 câu)",
        "anotherExample": "Một câu ví dụ hoàn chỉnh, tự nhiên, dùng đúng chunk này",
        "type": "collocation",
        "formality": "neutral"
      }
    ]
  }
]
\`\`\`

Quy tắc bắt buộc:
- Mỗi từ có đúng 2-3 chunk (không ít hơn 2, không nhiều hơn 3)
- phrase: cụm từ thực tế hay dùng (KHÔNG chỉ là từ đơn lẻ), phải chứa từ gốc hoặc dạng biến thể
- KHÔNG có field "originalSentence" (đây là từ vựng, không có transcript gốc)
- type: "collocation" | "functional" | "connector"
  - collocation: cụm hay đi cùng nhau (run a meeting, make a decision)
  - functional: cụm giao tiếp có chức năng (Could you please..., I'd like to...)
  - connector: cụm liên kết (as a result of, in terms of)
- formality: "formal" | "informal" | "neutral"
- anotherExample: câu hoàn chỉnh, 1 tình huống thực tế khác nhau cho mỗi chunk`;

    return { systemPrompt, userMessage };
}

function buildExercisePrompt(chunk, topic) {
    const systemPrompt = `Bạn là chuyên gia thiết kế bài luyện dịch tiếng Anh cho người học.
Nhiệm vụ: Tạo 2-3 bài luyện dịch Việt → Anh theo các TÌNH HUỐNG THỰC TẾ KHÁC NHAU (không phải theo độ khó), giúp người học dùng chunk tự nhiên trong cuộc sống.
Trả về JSON hợp lệ, không có text nào khác ngoài JSON.`;

    const userMessage = `Tạo 2-3 bài luyện dịch theo tình huống thực tế cho chunk sau:

CHUNK: "${chunk.phrase}"
NGHĨA: ${chunk.meaningVi}
CHỦ ĐỀ: ${topic}

Trả về JSON:
\`\`\`json
{
  "exercises": [
    {
      "id": "ex_1",
      "level": 1,
      "levelLabel": "Tại văn phòng",
      "vietnameseSentence": "Câu tiếng Việt có dấu đầy đủ, tự nhiên, bắt buộc dùng chunk. Bối cảnh: văn phòng/công việc.",
      "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
      "tenseUsed": "Present Simple",
      "tenseExplanation": "Dùng thì này vì… (1 câu tiếng Việt)",
      "vocabHints": [{"vi": "từ khó", "en": "English"}],
      "sentenceBreakdown": [
        {"phrase": "cụm trong sampleTranslation", "vi": "nghĩa", "note": "giải thích ngắn"}
      ]
    },
    {
      "id": "ex_2",
      "level": 2,
      "levelLabel": "Khi đi du lịch",
      "vietnameseSentence": "Câu tiếng Việt bối cảnh du lịch/cuộc sống hàng ngày.",
      "sampleTranslation": "Câu tiếng Anh có chunk mục tiêu.",
      "tenseUsed": "Past Simple",
      "tenseExplanation": "Dùng thì này vì…",
      "vocabHints": [],
      "sentenceBreakdown": []
    }
  ]
}
\`\`\`

Quy tắc:
- levelLabel: tên TÌNH HUỐNG (Tại văn phòng / Khi đi du lịch / Tại nhà hàng / Khi mua sắm / Trong lớp học / Khi đi khám bệnh) — KHÔNG phải tên độ khó
- sampleTranslation: BẮT BUỘC chứa chunk "${chunk.phrase}" (có thể chia động từ)
- 2-3 câu với 2-3 tình huống KHÁC NHAU
- sentenceBreakdown: phân tích 2-4 cụm quan trọng, KHÔNG phân tích bản thân chunk mục tiêu`;

    return { systemPrompt, userMessage };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const FAILED_LOG = 'scripts/failed_words.json';

async function loadFailedLog() {
    if (existsSync(FAILED_LOG)) {
        try { return JSON.parse(readFileSync(FAILED_LOG, 'utf-8')); } catch { return []; }
    }
    return [];
}

async function appendFailedLog(entry) {
    const existing = await loadFailedLog();
    existing.push({ ...entry, timestamp: new Date().toISOString() });
    writeFileSync(FAILED_LOG, JSON.stringify(existing, null, 2), 'utf-8');
}

async function main() {
    console.log('🚀 generate-chunks-batch.js bắt đầu...');
    console.log(`   Model: tự động chọn | Delay: ${DELAY_MS}ms | Batch size: ${BATCH_SIZE}`);
    if (TOPIC_FILTER) console.log(`   Topic filter: "${TOPIC_FILTER}"`);
    if (LIMIT < 99999) console.log(`   Limit: ${LIMIT} từ`);
    console.log('');

    // 1. Lấy danh sách từ cần xử lý
    let query = supabase
        .from('vocab_words')
        .select('*')
        .eq('status', 'pending');

    if (TOPIC_FILTER) query = query.eq('topic', TOPIC_FILTER);
    if (LIMIT < 99999) query = query.limit(LIMIT);

    const { data: words, error: fetchErr } = await query;
    if (fetchErr) {
        console.error('❌ Lỗi fetch vocab_words:', fetchErr.message);
        process.exit(1);
    }
    if (!words || words.length === 0) {
        console.log('✅ Không có từ nào cần xử lý (status=pending). Done!');
        return;
    }
    console.log(`📚 Tìm thấy ${words.length} từ cần xử lý.`);

    // 2. Group theo topic
    const byTopic = {};
    for (const w of words) {
        if (!byTopic[w.topic]) byTopic[w.topic] = [];
        byTopic[w.topic].push(w);
    }
    console.log(`   Topics: ${Object.keys(byTopic).join(', ')}\n`);

    let totalDone = 0;
    let totalFailed = 0;

    // 3. Xử lý từng topic
    for (const [topic, topicWords] of Object.entries(byTopic)) {
        console.log(`\n📂 Topic: "${topic}" — ${topicWords.length} từ`);

        // Chia theo batch
        for (let i = 0; i < topicWords.length; i += BATCH_SIZE) {
            const batch = topicWords.slice(i, i + BATCH_SIZE);
            console.log(`\n   🔄 Batch ${Math.floor(i / BATCH_SIZE) + 1}: từ #${i + 1} đến #${i + batch.length}`);

            // 3a. Sinh chunks cho cả batch
            let chunkResults = [];
            try {
                const { systemPrompt, userMessage } = buildChunkBatchPrompt(batch);
                chunkResults = await callGemini(systemPrompt, userMessage);
                console.log(`   ✅ Gemini trả về ${chunkResults.length} kết quả chunk`);
            } catch (err) {
                console.error(`   ❌ Lỗi sinh chunk cho batch: ${err.message}`);
                for (const w of batch) {
                    await appendFailedLog({ wordId: w.id, word: w.word, stage: 'chunk', error: err.message });
                    totalFailed++;
                }
                await sleep(DELAY_MS);
                continue;
            }

            // 3b. Lưu chunk + sinh exercises
            for (const result of chunkResults) {
                const wordData = batch.find(w => w.id === result.wordId);
                if (!wordData) {
                    console.warn(`   ⚠️  Không tìm thấy từ với wordId: ${result.wordId}`);
                    continue;
                }
                if (!result.chunks || result.chunks.length === 0) {
                    console.warn(`   ⚠️  Từ "${wordData.word}" không có chunk, bỏ qua.`);
                    await appendFailedLog({ wordId: wordData.id, word: wordData.word, stage: 'chunk', error: 'empty chunks array' });
                    totalFailed++;
                    continue;
                }

                // Chuẩn bị chunk rows
                const chunkRows = result.chunks.map((c, idx) => ({
                    id: makeChunkId(wordData.id, idx),
                    phrase: c.phrase || '',
                    meaning_vi: c.meaningVi || '',
                    usage_note: c.usageNote || '',
                    another_example: c.anotherExample || '',
                    original_sentence: '',          // vocab không có
                    type: c.type || 'collocation',
                    formality: c.formality || 'neutral',
                    source_type: 'vocab',
                    source_word_id: wordData.id,
                    topic: wordData.topic,
                    group_id: `vocab_${wordData.id}`,
                    group_name: wordData.word,      // group theo từ gốc
                    transcript_id: null,
                    user_id: null,                  // shared content, no user_id
                }));

                // Upsert chunks
                const { error: chunkErr } = await supabase
                    .from('chunks')
                    .upsert(chunkRows, { onConflict: 'id' });
                if (chunkErr) {
                    console.error(`   ❌ Lỗi lưu chunks cho "${wordData.word}": ${chunkErr.message}`);
                    await appendFailedLog({ wordId: wordData.id, word: wordData.word, stage: 'chunk_save', error: chunkErr.message });
                    totalFailed++;
                    continue;
                }

                // 3c. Sinh writing exercises cho từng chunk (nếu không bị skip)
                if (!SKIP_EXERCISES) {
                    for (const chunkRow of chunkRows) {
                        await sleep(DELAY_MS);
                        try {
                            const chunkObj = {
                                phrase: chunkRow.phrase,
                                meaningVi: chunkRow.meaning_vi,
                            };
                            const { systemPrompt, userMessage } = buildExercisePrompt(chunkObj, wordData.topic);
                            const exResult = await callGemini(systemPrompt, userMessage);
                            const exercises = (exResult.exercises || []).map((ex, exIdx) => ({
                                id: makeExerciseId(chunkRow.id, exIdx),
                                chunk_id: chunkRow.id,
                                level: ex.level,
                                level_label: ex.levelLabel || `Tình huống ${exIdx + 1}`,
                                vietnamese_sentence: ex.vietnameseSentence || '',
                                sample_translation: ex.sampleTranslation || '',
                                tense_used: ex.tenseUsed || '',
                                tense_explanation: ex.tenseExplanation || '',
                                vocab_hints: JSON.stringify(ex.vocabHints || []),
                                sentence_breakdown: JSON.stringify(ex.sentenceBreakdown || []),
                                user_id: null,
                            }));

                            const { error: exErr } = await supabase
                                .from('situations')
                                .upsert(exercises, { onConflict: 'id' });
                            if (exErr) {
                                console.warn(`      ⚠️  Lỗi lưu exercises cho chunk "${chunkRow.phrase}": ${exErr.message}`);
                            }
                        } catch (exErr) {
                            console.warn(`      ⚠️  Lỗi sinh exercises cho chunk "${chunkRow.phrase}": ${exErr.message}`);
                            await appendFailedLog({
                                wordId: wordData.id,
                                word: wordData.word,
                                chunkId: chunkRow.id,
                                stage: 'exercise',
                                error: exErr.message,
                            });
                        }
                    }
                }

                // Update word status → 'generated'
                await supabase
                    .from('vocab_words')
                    .update({ status: 'generated' })
                    .eq('id', wordData.id);

                totalDone++;
                console.log(`   ✅ "${wordData.word}" → ${chunkRows.length} chunks${SKIP_EXERCISES ? '' : ' + exercises'}`);
            }

            // Delay giữa batches
            if (i + BATCH_SIZE < topicWords.length) {
                console.log(`\n   ⏸  Chờ ${DELAY_MS / 1000}s trước batch tiếp...`);
                await sleep(DELAY_MS);
            }
        }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`✅ Hoàn tất!`);
    console.log(`   Thành công: ${totalDone} từ`);
    console.log(`   Thất bại:   ${totalFailed} từ${totalFailed > 0 ? ` (xem: ${FAILED_LOG})` : ''}`);
}

main().catch(err => {
    console.error('\n💥 Lỗi không xử lý được:', err);
    process.exit(1);
});
