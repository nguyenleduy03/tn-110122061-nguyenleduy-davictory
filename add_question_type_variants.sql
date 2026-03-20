-- Migration: Thêm các biến thể câu hỏi mới
-- Mục đích: Đa dạng hóa loại câu hỏi với các phiên bản drag-drop và fill-in

-- ============================================================
-- BIẾN THỂ: MATCHING → FILL-IN (điền khuyết)
-- ============================================================

INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'MATCHING_FILLABLE',
       'Matching (Fill-in)',
       'Nối thông tin bằng cách điền khuyết',
       'Điền từ/cụm từ phù hợp vào chỗ trống để nối thông tin.',
       'READING',
       FALSE,
       TRUE,
       FALSE,
       51,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = 'MATCHING_FILLABLE');

INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'MATCHING_HEADINGS_FILLABLE',
       'Matching Headings (Fill-in)',
       'Nối tiêu đề bằng cách điền khuyết vào đoạn văn',
       'Điền tiêu đề phù hợp vào mỗi đoạn văn.',
       'READING',
       FALSE,
       TRUE,
       FALSE,
       52,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = 'MATCHING_HEADINGS_FILLABLE');

-- ============================================================
-- BIẾN THỂ: FILL-IN → DRAG-DROP (kéo thả)
-- ============================================================

INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'FILL_BLANK_DRAG',
       'Fill in the Blank (Drag-drop)',
       'Điền từ/cụm từ vào chỗ trống bằng cách kéo thả',
       'Kéo từ/cụm từ phù hợp vào chỗ trống.',
       'LISTENING_READING',
       FALSE,
       FALSE,
       TRUE,
       31,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = 'FILL_BLANK_DRAG');

INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'SENTENCE_COMPLETION_DRAG',
       'Sentence Completion (Drag-drop)',
       'Hoàn thành câu bằng cách kéo thả từ/cụm từ',
       'Kéo từ/cụm từ từ bài vào để hoàn thành câu.',
       'LISTENING_READING',
       FALSE,
       FALSE,
       TRUE,
       32,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = 'SENTENCE_COMPLETION_DRAG');

INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'SUMMARY_COMPLETION_DRAG',
       'Summary Completion (Drag-drop)',
       'Hoàn thành bản tóm tắt bằng cách kéo thả từ cho sẵn',
       'Kéo từ phù hợp vào chỗ trống trong bản tóm tắt.',
       'LISTENING_READING',
       FALSE,
       FALSE,
       TRUE,
       33,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = 'SUMMARY_COMPLETION_DRAG');

INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'NOTE_COMPLETION_DRAG',
       'Note/Table/Form Completion (Drag-drop)',
       'Hoàn thành ghi chú/bảng/form bằng cách kéo thả',
       'Kéo từ nghe được vào chỗ trống trong ghi chú/bảng/form.',
       'LISTENING',
       FALSE,
       FALSE,
       TRUE,
       34,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = 'NOTE_COMPLETION_DRAG');
