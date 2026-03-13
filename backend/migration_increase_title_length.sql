-- Migration: Tăng độ dài cột title trong bảng question_groups
-- Ngày: 2026-03-13
-- Lý do: Fix lỗi "Data too long for column 'title'" khi lưu đề thi

USE DAVictory;

-- Tăng độ dài cột title từ 200 lên 500 ký tự
ALTER TABLE question_groups 
MODIFY COLUMN title VARCHAR(500) NOT NULL 
COMMENT 'Tiêu đề nhóm câu hỏi';

-- Kiểm tra kết quả
DESCRIBE question_groups;
