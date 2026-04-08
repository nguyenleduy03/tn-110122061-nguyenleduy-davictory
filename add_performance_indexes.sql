-- =====================================================
-- DATABASE INDEXES TỐI ƯU CHO DAVICTORY
-- Chạy script này để cải thiện hiệu suất query
-- =====================================================

-- 1. USERS TABLE
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 2. TESTS TABLE
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_test_type ON tests(test_type);
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON tests(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tests_published_at ON tests(published_at);
CREATE INDEX IF NOT EXISTS idx_tests_status_type ON tests(status, test_type);

-- 3. EXAM_ATTEMPTS TABLE (Quan trọng - query nhiều)
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_test ON exam_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_session ON exam_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_test ON exam_attempts(user_id, test_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_session ON exam_attempts(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_created_at ON exam_attempts(created_at);

-- 4. ATTEMPT_ANSWERS TABLE
CREATE INDEX IF NOT EXISTS idx_attempt_answers_exam_attempt ON attempt_answers(exam_attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON attempt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_exam_question ON attempt_answers(exam_attempt_id, question_id);

-- 5. QUESTIONS TABLE
CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(question_group_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(order_index);

-- 6. QUESTION_GROUPS TABLE
CREATE INDEX IF NOT EXISTS idx_question_groups_part ON question_groups(part_id);
CREATE INDEX IF NOT EXISTS idx_question_groups_type ON question_groups(question_type_id);

-- 7. ASSIGNMENTS TABLE
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_test ON assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- 8. ASSIGNMENT_SUBMISSIONS TABLE
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_user ON assignment_submissions(assignment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at);

-- 9. CLASSES TABLE
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

-- 10. CLASS_STUDENTS TABLE
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_student ON class_students(class_id, student_id);

-- 11. WRITING_SUBMISSIONS TABLE
CREATE INDEX IF NOT EXISTS idx_writing_submissions_user ON student_writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_prompt ON student_writing_submissions(writing_prompt_id);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_submitted_at ON student_writing_submissions(submitted_at);

-- 12. SPEAKING_ATTEMPTS TABLE
CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user ON speaking_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_attempts_part ON speaking_attempts(speaking_part);
CREATE INDEX IF NOT EXISTS idx_speaking_attempts_created_at ON speaking_attempts(created_at);

-- 13. MEDIA_FILES TABLE
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(media_type);
CREATE INDEX IF NOT EXISTS idx_media_files_module ON media_files(module);
CREATE INDEX IF NOT EXISTS idx_media_files_checksum ON media_files(checksum);

-- 14. TEST_SHARE_LINKS TABLE
CREATE INDEX IF NOT EXISTS idx_test_share_links_test ON test_share_links(test_id);
CREATE INDEX IF NOT EXISTS idx_test_share_links_code ON test_share_links(share_code);
CREATE INDEX IF NOT EXISTS idx_test_share_links_expires_at ON test_share_links(expires_at);

-- 15. GUEST_EXAM_ATTEMPTS TABLE
CREATE INDEX IF NOT EXISTS idx_guest_exam_attempts_test ON guest_exam_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_guest_exam_attempts_session_token ON guest_exam_attempts(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_exam_attempts_created_at ON guest_exam_attempts(created_at);

-- 16. FULL_TEST_PROGRESS TABLE
CREATE INDEX IF NOT EXISTS idx_full_test_progress_user ON full_test_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_full_test_progress_test ON full_test_progress(test_id);
CREATE INDEX IF NOT EXISTS idx_full_test_progress_user_test ON full_test_progress(user_id, test_id);

-- 17. USER_SESSIONS TABLE
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 18. COMPOSITE INDEXES cho queries phức tạp
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_test_created ON exam_attempts(user_id, test_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tests_status_published ON tests(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_class_due ON assignments(class_id, due_date);

-- =====================================================
-- ANALYZE TABLES để cập nhật statistics
-- =====================================================
ANALYZE TABLE users;
ANALYZE TABLE tests;
ANALYZE TABLE exam_attempts;
ANALYZE TABLE attempt_answers;
ANALYZE TABLE questions;
ANALYZE TABLE question_groups;
ANALYZE TABLE assignments;
ANALYZE TABLE assignment_submissions;
ANALYZE TABLE classes;
ANALYZE TABLE class_students;

-- =====================================================
-- KIỂM TRA INDEXES ĐÃ TẠO
-- =====================================================
-- Chạy query này để xem tất cả indexes:
-- SELECT 
--     TABLE_NAME,
--     INDEX_NAME,
--     COLUMN_NAME,
--     SEQ_IN_INDEX,
--     INDEX_TYPE
-- FROM information_schema.STATISTICS
-- WHERE TABLE_SCHEMA = 'DAVictory'
-- ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Chạy script này trong giờ thấp điểm (ít traffic)
-- 2. Backup database trước khi chạy
-- 3. Monitor query performance sau khi tạo indexes
-- 4. Có thể mất 5-30 phút tùy kích thước database
-- 5. Indexes sẽ tăng kích thước database ~20-30%
-- =====================================================
