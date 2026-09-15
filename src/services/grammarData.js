// ─── Grammar Data Service ─────────────────────────────────────────
// Dynamically discovers and loads grammar question JSON files from data/grammar/
// Defines the standardized 24 TOEIC grammar topics across 4 major categories.

export const GRAMMAR_CATEGORIES = [
  {
    id: 'all',
    label: 'Tất cả 24 Chuyên đề',
    shortLabel: 'Tất cả',
    icon: 'Layers',
    description: 'Toàn bộ 24 chủ điểm ngữ pháp trọng tâm TOEIC Part 5 & 6',
  },
  {
    id: 'word_forms',
    label: 'Từ loại & Cấu tạo từ',
    shortLabel: 'Từ loại',
    icon: 'FileText',
    description: 'Danh từ, Đại từ, Tính từ, Trạng từ, Giới từ, Liên từ',
  },
  {
    id: 'verbs_tenses',
    label: 'Động từ & Thời thì',
    shortLabel: 'Động từ & Thì',
    icon: 'Clock',
    description: 'Các thì cơ bản & nâng cao, Bị động, Hòa hợp S-V, Khiếm khuyết, V-ing/To-V',
  },
  {
    id: 'clauses_syntax',
    label: 'Mệnh đề & Cấu trúc',
    shortLabel: 'Mệnh đề & Cấu trúc',
    icon: 'Network',
    description: 'Phân từ rút gọn, Mệnh đề quan hệ, Câu điều kiện & Giả định, So sánh, Danh ngữ',
  },
  {
    id: 'advanced_traps',
    label: 'Bẫy Điểm Cao 990',
    shortLabel: 'Bẫy 990 & Cụm từ',
    icon: 'Flame',
    description: 'Đảo ngữ, Lượng từ (another/other), Cặp từ dễ nhầm, Cụm động từ & Giới từ cố định',
  },
];

// Danh mục chuẩn 24 chuyên đề ngữ pháp TOEIC
export const TOPICS_CATALOG = [
  // ── Nhóm 1: Từ loại & Cấu tạo từ (1 - 6) ──
  {
    id: 'nouns',
    topicNumber: 1,
    nameVi: 'Danh từ (Nouns)',
    nameEn: 'Nouns & Compound Nouns',
    category: 'word_forms',
    icon: 'Package',
    description: 'Vị trí danh từ, danh từ ghép, đếm được vs không đếm được, danh từ chỉ người vs vật.',
    tips: 'Trước/sau mạo từ, tính từ sở hữu hoặc làm tân ngữ sau ngoại động từ.',
  },
  {
    id: 'pronouns',
    topicNumber: 2,
    nameVi: 'Đại từ (Pronouns)',
    nameEn: 'Pronouns & Possessives',
    category: 'word_forms',
    icon: 'Users',
    description: 'Đại từ nhân xưng, tân ngữ, tính từ sở hữu, đại từ sở hữu, đại từ phản thân (myself, each other).',
    tips: 'Phân biệt tính từ sở hữu (cần N phía sau) vs đại từ sở hữu (đứng độc lập).',
  },
  {
    id: 'adjectives',
    topicNumber: 3,
    nameVi: 'Tính từ (Adjectives)',
    nameEn: 'Adjectives & Participle Adjectives',
    category: 'word_forms',
    icon: 'Sparkles',
    description: 'Vị trí tính từ, tính từ đuôi -ed / -ing, tính từ đứng sau linking verbs (remain, seem, look).',
    tips: '-ing chỉ bản chất sự vật/sự việc; -ed chỉ cảm xúc hoặc bị tác động.',
  },
  {
    id: 'adverbs',
    topicNumber: 4,
    nameVi: 'Trạng từ (Adverbs)',
    nameEn: 'Adverbs & Positions',
    category: 'word_forms',
    icon: 'Zap',
    description: 'Vị trí trạng từ (đầu câu, chen giữa S-V, giữa trợ ĐT và V-chính, cuối câu), trạng từ chỉ tần suất.',
    tips: 'Cấu trúc kẹp: S + [Adv] + V, hoặc Be + [Adv] + V3/V-ed.',
  },
  {
    id: 'prepositions',
    topicNumber: 5,
    nameVi: 'Giới từ (Prepositions)',
    nameEn: 'Prepositions of Time & Place',
    category: 'word_forms',
    icon: 'Compass',
    description: 'Giới từ thời gian, nơi chốn, phương hướng (at, in, on, during, for, within, throughout).',
    tips: 'during + danh từ thời kỳ vs for + khoảng thời gian cụ thể.',
  },
  {
    id: 'conjunctions',
    aliases: ['conjunctions_transitions'],
    topicNumber: 6,
    nameVi: 'Liên từ & Từ nối (Conjunctions)',
    nameEn: 'Conjunctions & Connectors',
    category: 'word_forms',
    icon: 'GitMerge',
    description: 'Liên từ đẳng lập (and, but, so), liên từ phụ thuộc (although, because), liên từ kép (either...or).',
    tips: 'Phân biệt liên từ (nối 2 mệnh đề có S-V) vs giới từ (chỉ đi kèm N/V-ing).',
  },

  // ── Nhóm 2: Động từ & Thời thì (7 - 12) ──
  {
    id: 'tenses_basic',
    aliases: ['verbs_tenses'],
    topicNumber: 7,
    nameVi: 'Thì Động từ (Verb Tenses)',
    nameEn: 'Present, Past, Future & Perfect Tenses',
    category: 'verbs_tenses',
    icon: 'Clock',
    description: 'Các thì hiện tại, quá khứ, tương lai và hoàn thành. Dấu hiệu nhận biết thời gian trong TOEIC.',
    tips: 'Tìm manh mối thời gian: recently, yesterday, tomorrow, next week, regularly, since, for.',
  },
  {
    id: 'tenses_advanced',
    topicNumber: 8,
    nameVi: 'Thì Động từ Hoàn thành & Tiếp diễn',
    nameEn: 'Perfect & Continuous Tenses',
    category: 'verbs_tenses',
    icon: 'History',
    description: 'Hiện tại hoàn thành (since/for), Quá khứ hoàn thành (before/after), Tương lai hoàn thành (by the time).',
    tips: 'since + mốc thời gian / QK đơn → Mệnh đề chính chia Hiện tại hoàn thành.',
  },
  {
    id: 'passive_voice',
    topicNumber: 9,
    nameVi: 'Thể Chủ động & Bị động (Voice)',
    nameEn: 'Active vs Passive Voice',
    category: 'verbs_tenses',
    icon: 'Shield',
    description: 'Phân biệt chủ động vs bị động (Be + V3/ed). Quy tắc xét có tân ngữ trực tiếp (Object) phía sau.',
    tips: 'Nếu sau chỗ trống KHÔNG có tân ngữ danh từ → 80% chọn Bị động.',
  },
  {
    id: 'subject_verb_agreement',
    topicNumber: 10,
    nameVi: 'Hòa hợp Chủ ngữ & Động từ',
    nameEn: 'Subject-Verb Agreement',
    category: 'verbs_tenses',
    icon: 'Scale',
    description: 'Chia động từ theo chủ ngữ số ít/nhiều, danh từ tập hợp, cụm giới từ chêm vào giữa S và V.',
    tips: 'Bỏ qua các cụm giới từ phụ như (in addition to, along with, of...) để tìm đúng Subject chính.',
  },
  {
    id: 'modal_verbs',
    aliases: ['modals_causatives', 'modals'],
    topicNumber: 11,
    nameVi: 'Động từ Khuyết thiếu & Sai khiến',
    nameEn: 'Modal Verbs & Causatives',
    category: 'verbs_tenses',
    icon: 'Sliders',
    description: 'Can, could, may, might, must, should, would, và cấu trúc nhờ vả have/get/make sb do sth.',
    tips: 'Sau modal verb đi kèm V-bare; have sb do sth vs have sth done (bị động).',
  },
  {
    id: 'gerunds_infinitives',
    aliases: ['to_v_gerund'],
    topicNumber: 12,
    nameVi: 'Danh động từ & Động từ nguyên mẫu',
    nameEn: 'To-V vs V-ing (Gerunds & Infinitives)',
    category: 'verbs_tenses',
    icon: 'Repeat',
    description: 'Các động từ chỉ đi với V-ing (postpone, consider, avoid) vs To-V (decide, plan, hope, aim).',
    tips: 'V-ing làm chủ ngữ mang nghĩa hành động; To-V chỉ mục đích để làm gì.',
  },

  // ── Nhóm 3: Mệnh đề & Cấu trúc (13 - 18) ──
  {
    id: 'participles',
    topicNumber: 13,
    nameVi: 'Phân từ & Rút gọn Mệnh đề',
    nameEn: 'Participle Clauses & Reductions',
    category: 'clauses_syntax',
    icon: 'Scissors',
    description: 'Hiện tại phân từ (V-ing) và Quá khứ phân từ (V-ed/V3) trong rút gọn 2 mệnh đề cùng chủ ngữ.',
    tips: 'Xác định chủ ngữ của vế chính để quyết định vế rút gọn là chủ động (V-ing) hay bị động (V-ed).',
  },
  {
    id: 'relative_clauses',
    topicNumber: 14,
    nameVi: 'Mệnh đề Quan hệ (Relative Clauses)',
    nameEn: 'Relative Pronouns & Adverbs',
    category: 'clauses_syntax',
    icon: 'Link',
    description: 'Who, whom, which, that, whose, where, when. Lược bỏ đại từ quan hệ và rút gọn mệnh đề quan hệ.',
    tips: 'whose + Danh từ đứng liền kề; that không đứng sau dấu phẩy hoặc giới từ.',
  },
  {
    id: 'conditionals_subjunctive',
    topicNumber: 15,
    nameVi: 'Câu Điều kiện & Thức Giả định',
    nameEn: 'Conditionals & Subjunctive Mood',
    category: 'clauses_syntax',
    icon: 'HelpCircle',
    description: 'Loại 1, 2, 3, Mix. Thức giả định với động từ yêu cầu (suggest, recommend, require, insist that S + [should] + V-bare).',
    tips: 'Động từ trong mệnh đề that sau recommend/require luôn giữ nguyên mẫu không chia.',
  },
  {
    id: 'comparisons',
    topicNumber: 16,
    nameVi: 'Cấu trúc So sánh (Comparisons)',
    nameEn: 'Comparative, Superlative & Equalities',
    category: 'clauses_syntax',
    icon: 'TrendingUp',
    description: 'So sánh hơn (-er/more), so sánh nhất (the -est/most), so sánh bằng (as...as), the more...the more.',
    tips: 'Trạng từ nhấn mạnh so sánh hơn: much, far, significantly, substantially, even.',
  },
  {
    id: 'noun_clauses',
    topicNumber: 17,
    nameVi: 'Mệnh đề Danh ngữ & Câu chẻ',
    nameEn: 'Noun Clauses (That / Wh- / If / Whether)',
    category: 'clauses_syntax',
    icon: 'Boxes',
    description: 'Mệnh đề bắt đầu bằng that, whether, why, how đóng vai trò làm Chủ ngữ hoặc Tân ngữ trong câu.',
    tips: 'whether...or not (liệu có hay không); that + S + V trọn vẹn mang nghĩa sự việc rằng.',
  },
  {
    id: 'time_clauses',
    topicNumber: 18,
    nameVi: 'Mệnh đề Trạng ngữ Thời gian & Tương thích thì',
    nameEn: 'Time Clauses & Sequence of Tenses',
    category: 'clauses_syntax',
    icon: 'Calendar',
    description: 'When, while, before, after, as soon as, until. Quy tắc không dùng thì Tương lai (will) trong mệnh đề trạng ngữ chỉ thời gian.',
    tips: 'Trong mệnh đề thời gian (when, after), dùng Hiện tại đơn thay cho Tương lai đơn.',
  },

  // ── Nhóm 4: Bẫy Điểm Cao 990 & Cụm từ (19 - 24) ──
  {
    id: 'inversion',
    topicNumber: 19,
    nameVi: 'Đảo ngữ & Cấu trúc Nhấn mạnh',
    nameEn: 'Inversion & Emphasis',
    category: 'advanced_traps',
    icon: 'RefreshCw',
    description: 'Đảo ngữ với từ phủ định (Hardly, Seldom, Rarely, Never, Only after, Under no circumstances) và Đảo ngữ câu điều kiện (Should / Were / Had).',
    tips: 'Phủ định đứng đầu câu → Đảo Trợ động từ lên trước Chủ ngữ (Seldom do we see...).',
  },
  {
    id: 'quantifiers',
    topicNumber: 20,
    nameVi: 'Lượng từ & Từ Hạn định (Determiners)',
    nameEn: 'Quantifiers (Another, Other, The other, Each, Every)',
    category: 'advanced_traps',
    icon: 'PieChart',
    description: 'Another + N số ít, Other + N số nhiều, Each/Every + N số ít, Few/Little, A few/A little.',
    tips: 'another (một cái khác - số ít) vs other (những cái khác - số nhiều) vs the other (cái còn lại xác định).',
  },
  {
    id: 'causative_verbs',
    topicNumber: 21,
    nameVi: 'Thể Sai khiến & Cấu trúc Nhờ vả',
    nameEn: 'Causative Verbs (Have, Get, Make, Let)',
    category: 'advanced_traps',
    icon: 'Share2',
    description: 'Have sb do sth vs Have sth done (bị động); Get sb to do sth vs Get sth done; Make sb do sth.',
    tips: 'have / get + vật + V3/ed (nhờ/thuê ai đó làm việc gì cho mình).',
  },
  {
    id: 'confusing_words',
    topicNumber: 22,
    nameVi: 'Cặp từ Dễ nhầm lẫn TOEIC',
    nameEn: 'Commonly Confused Words',
    category: 'advanced_traps',
    icon: 'AlertTriangle',
    description: 'Rise vs Raise, Lie vs Lay, Economic vs Economical, Inform vs Announce, Express vs Impress.',
    tips: 'Raise là ngoại động từ (cần tân ngữ đi sau), Rise là nội động từ (không có tân ngữ đi sau).',
  },
  {
    id: 'phrasal_verbs',
    topicNumber: 23,
    nameVi: 'Cụm Động từ TOEIC (Phrasal Verbs)',
    nameEn: 'TOEIC Phrasal Verbs in Context',
    category: 'advanced_traps',
    icon: 'Workflow',
    description: 'Call off (hủy), Put off (hoãn), Look forward to (trông đợi), Turn down (từ chối), Carry out (tiến hành).',
    tips: 'Look forward to + V-ing/Noun (không dùng động từ nguyên mẫu).',
  },
  {
    id: 'collocations',
    topicNumber: 24,
    nameVi: 'Cụm Giới từ Cố định & Collocations',
    nameEn: 'Fixed Collocations & Prepositional Idioms',
    category: 'advanced_traps',
    icon: 'BookOpen',
    description: 'In accordance with, In compliance with, In light of, Take into account, Meet the deadline.',
    tips: 'Các cụm từ đi liền nhau tạo thành khối ngữ nghĩa không thể dịch rời từng từ.',
  },
];

// Dynamically discover all JSON files placed in ../../data/grammar/*.json using Vite
const rawJsonModules = import.meta.glob('../../data/grammar/*.json', { eager: true });

// Map of topicId -> JSON data
const loadedGrammarData = {};

Object.entries(rawJsonModules).forEach(([filePath, moduleExports]) => {
  try {
    const data = moduleExports.default || moduleExports;
    // Extract topicId from file content or filename
    const filenameMatch = filePath.match(/\/([^/]+)\.json$/);
    const filenameId = filenameMatch ? filenameMatch[1] : null;
    const topicId = data.topicId || filenameId;

    if (topicId && Array.isArray(data.questions)) {
      loadedGrammarData[topicId] = data;
    }
  } catch (err) {
    console.error(`[GrammarData] Failed to parse grammar JSON at ${filePath}:`, err);
  }
});

/**
 * Lấy danh sách 24 chuyên đề, kèm thông tin câu hỏi và trạng thái sẵn sàng.
 * Tự động cập nhật khi có file JSON mới trong thư mục data/grammar/
 */
export function getAllGrammarTopics() {
  return TOPICS_CATALOG.map(catalogTopic => {
    let fileData = loadedGrammarData[catalogTopic.id];
    if (!fileData && catalogTopic.aliases) {
      for (const alias of catalogTopic.aliases) {
        if (loadedGrammarData[alias]) {
          fileData = loadedGrammarData[alias];
          break;
        }
      }
    }

    if (fileData && Array.isArray(fileData.questions) && fileData.questions.length > 0) {
      const questions = fileData.questions;
      const standardQuestions = questions.filter(q => q.level === 'standard');
      const advancedQuestions = questions.filter(q => q.level === 'advanced');

      return {
        ...catalogTopic,
        topicName: fileData.topicName || catalogTopic.nameVi,
        topicNameEn: fileData.topicNameEn || catalogTopic.nameEn,
        description: fileData.description || catalogTopic.description,
        isAvailable: true,
        questions,
        totalQuestions: questions.length,
        standardQuestions,
        advancedQuestions,
        standardCount: standardQuestions.length,
        advancedCount: advancedQuestions.length,
      };
    }

    return {
      ...catalogTopic,
      isAvailable: false,
      questions: [],
      totalQuestions: 0,
      standardQuestions: [],
      advancedQuestions: [],
      standardCount: 0,
      advancedCount: 0,
    };
  });
}

/**
 * Lấy chi tiết 1 chuyên đề theo ID
 */
export function getGrammarTopicById(topicId) {
  const allTopics = getAllGrammarTopics();
  return allTopics.find(t => t.id === topicId || (t.aliases && t.aliases.includes(topicId))) || null;
}

/**
 * Lấy danh sách câu hỏi của chuyên đề theo level ('standard' | 'advanced' | 'all')
 */
export function getTopicQuestions(topicId, level = 'all') {
  const topic = getGrammarTopicById(topicId);
  if (!topic || !topic.isAvailable) return [];

  if (level === 'standard') return topic.standardQuestions;
  if (level === 'advanced') return topic.advancedQuestions;
  return topic.questions;
}

/**
 * Thống kê tổng quan dữ liệu
 */
export function getGrammarCatalogStats() {
  const topics = getAllGrammarTopics();
  const availableTopics = topics.filter(t => t.isAvailable);
  const totalQuestions = availableTopics.reduce((sum, t) => sum + t.totalQuestions, 0);
  const totalStandard = availableTopics.reduce((sum, t) => sum + t.standardCount, 0);
  const totalAdvanced = availableTopics.reduce((sum, t) => sum + t.advancedCount, 0);

  return {
    totalTopics: topics.length,
    availableTopicsCount: availableTopics.length,
    totalQuestions,
    totalStandard,
    totalAdvanced,
  };
}
