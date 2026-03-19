-- Thêm cột cho dạng câu hỏi MCQ_DROPDOWN (bộ lựa chọn chung theo group)
ALTER TABLE question_groups 
ADD COLUMN shared_options_json LONGTEXT NULL 
AFTER allow_option_reuse,
ADD COLUMN use_shared_options BOOLEAN NOT NULL DEFAULT FALSE 
AFTER shared_options_json;

-- Thêm bản ghi loại câu hỏi mới vào question_types nếu chưa có
INSERT INTO question_types (code, display_name, description, instructions, applicable_skills, has_options, has_text_answer, has_matching, order_index, is_active, created_at, updated_at)
SELECT 'MCQ_DROPDOWN',
       'Multiple Choice (Dropdown)',
       'Nhiều câu dùng chung một bộ lựa chọn, mỗi câu chọn qua dropdown',
       'In what time period ... Write the correct letter, A, B or C, next to each question.',
       'LISTENING_READING',
       TRUE,
       FALSE,
       FALSE,
       999,
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM question_types WHERE code = 'MCQ_DROPDOWN'
);

