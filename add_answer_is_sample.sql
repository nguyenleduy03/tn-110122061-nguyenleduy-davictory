-- Thêm cột is_sample vào bảng answers
ALTER TABLE answers ADD COLUMN is_sample BOOLEAN DEFAULT FALSE;
