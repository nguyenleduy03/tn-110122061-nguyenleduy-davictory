-- Thêm cột allow_option_reuse vào bảng question_groups
ALTER TABLE question_groups 
ADD COLUMN allow_option_reuse BOOLEAN NOT NULL DEFAULT FALSE 
AFTER is_active;
