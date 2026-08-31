/**
 * scripts/import-vocab.js
 *
 * Import vocab_5000.json → bảng vocab_words trong Supabase.
 * Chạy 1 lần (hoặc mỗi khi có file vocab mới/cập nhật).
 *
 * Cách chạy:
 *   1. Thêm vào file .env ở root project (KHÔNG commit lên git):
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=xxxx   ← lấy trong Supabase Dashboard > Settings > API
 *      (dùng service_role key, KHÔNG dùng anon key — script chạy ngoài RLS của user)
 *   2. node scripts/import-vocab.js ./data/vocab_5000.json
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
    console.error('   Thêm 2 dòng sau vào .env:');
    console.error('   SUPABASE_URL=https://xxxx.supabase.co');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=service_role_key_ở_đây');
    process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
    console.error('❌ Cách dùng: node scripts/import-vocab.js <đường-dẫn-file.json>');
    console.error('   Ví dụ: node scripts/import-vocab.js ./data/vocab_5000.json');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helper: sinh id ổn định từ word + topic (tránh trùng khi chạy lại) ─────
function makeId(word, topic) {
    const slug = (s) =>
        s.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    return `w_${slug(word)}_${slug(topic)}`.slice(0, 100);
}

// ─── Helper: heuristic phát hiện meaningVi có thể không phải tiếng Việt ─────
function looksNonVietnamese(text) {
    if (!text) return false;
    // Tiếng Việt luôn có dấu (á, ề, ơ, ư, đ...) trừ một số từ ngắn.
    const hasVietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    return text.length > 4 && !hasVietnameseDiacritics.test(text);
}

async function main() {
    console.log(`📖 Đang đọc ${filePath}...`);
    const raw = readFileSync(filePath, 'utf-8');
    const words = JSON.parse(raw);

    if (!Array.isArray(words)) {
        console.error('❌ File JSON phải là một mảng (array).');
        process.exit(1);
    }

    console.log(`✅ Đọc được ${words.length} từ.`);

    // ─── Validate + chuẩn bị dữ liệu ───────────────────────────
    const rows = [];
    const errors = [];
    const suspiciousWords = [];
    const seenIds = new Set();

    for (const [i, w] of words.entries()) {
        if (!w.word || !w.meaningVi || !w.topic) {
            errors.push({ index: i, reason: 'Thiếu field bắt buộc (word/meaningVi/topic)', data: w });
            continue;
        }

        const id = makeId(w.word, w.topic);
        if (seenIds.has(id)) {
            errors.push({ index: i, reason: `Trùng id "${id}" (word+topic trùng)`, data: w });
            continue;
        }
        seenIds.add(id);

        if (looksNonVietnamese(w.meaningVi)) {
            suspiciousWords.push({ word: w.word, meaningVi: w.meaningVi });
        }

        rows.push({
            id,
            word: w.word.trim(),
            meaning_vi: w.meaningVi.trim(),
            topic: w.topic.trim(),
            part_of_speech: w.partOfSpeech || null,
            status: 'pending',
        });
    }

    console.log(`\n📊 Kết quả validate:`);
    console.log(`   ✅ Hợp lệ: ${rows.length}`);
    console.log(`   ❌ Lỗi/trùng: ${errors.length}`);
    console.log(`   ⚠️  Nghi ngờ meaningVi không phải tiếng Việt: ${suspiciousWords.length}`);

    if (suspiciousWords.length > 0) {
        console.log(`\n⚠️  10 ví dụ nghi ngờ sai ngôn ngữ:`);
        suspiciousWords.slice(0, 10).forEach(w =>
            console.log(`      "${w.word}" → meaningVi: "${w.meaningVi}"`)
        );
        if (suspiciousWords.length > 200) {
            console.log(`\n   🚨 Tỷ lệ nghi ngờ rất cao (${suspiciousWords.length}/${rows.length}).`);
            console.log(`      Khả năng cao TOÀN BỘ cột meaningVi sai ngôn ngữ nguồn.`);
            console.log(`      Khuyến nghị: DỪNG import, sửa dữ liệu trước.\n`);
        }
    }

    if (errors.length > 0) {
        console.log(`\n❌ 10 lỗi đầu tiên:`);
        errors.slice(0, 10).forEach(e =>
            console.log(`      [${e.index}] ${e.reason}: ${JSON.stringify(e.data)}`)
        );
    }

    if (rows.length === 0) {
        console.error('\n❌ Không có dòng hợp lệ nào để import. Dừng.');
        process.exit(1);
    }

    // ─── Import theo batch (tránh 1 request quá lớn) ───────────
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from('vocab_words')
            .upsert(batch, { onConflict: 'id' }); // upsert: chạy lại script không bị lỗi trùng key

        if (error) {
            console.error(`❌ Lỗi insert batch [${i}-${i + batch.length}]:`, error.message);
            continue;
        }
        inserted += batch.length;
        console.log(`   ⏳ Đã import ${inserted}/${rows.length}...`);
    }

    console.log(`\n✅ Hoàn tất. Đã import ${inserted}/${rows.length} từ vào bảng vocab_words.`);
}

main().catch(err => {
    console.error('💥 Lỗi không xử lý được:', err);
    process.exit(1);
});