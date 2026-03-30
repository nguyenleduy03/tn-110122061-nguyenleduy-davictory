-- Backward-compatible schema fix for grading history tables.
-- Use this once on environments where old table versions already exist.

CREATE TABLE IF NOT EXISTS exam_attempt_grade_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  exam_attempt_id BIGINT NOT NULL,
  edited_by_user_id BIGINT NOT NULL,
  edited_by_username VARCHAR(255) NOT NULL,
  edited_by_full_name VARCHAR(255) NULL,
  editor_role VARCHAR(20) NOT NULL,
  old_total_correct INT NULL,
  new_total_correct INT NULL,
  old_band_score DECIMAL(3,1) NULL,
  new_band_score DECIMAL(3,1) NULL,
  old_feedback TEXT NULL,
  new_feedback TEXT NULL,
  edit_reason TEXT NULL,
  edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_eagh_attempt_edited_at (exam_attempt_id, edited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS writing_submission_grade_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  writing_submission_id BIGINT NOT NULL,
  edited_by_user_id BIGINT NOT NULL,
  edited_by_username VARCHAR(255) NOT NULL,
  edited_by_full_name VARCHAR(255) NULL,
  editor_role VARCHAR(20) NOT NULL,
  old_band_score DECIMAL(3,1) NULL,
  new_band_score DECIMAL(3,1) NULL,
  old_feedback TEXT NULL,
  new_feedback TEXT NULL,
  edit_reason TEXT NULL,
  edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wsgh_submission_edited_at (writing_submission_id, edited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- exam_attempt_grade_history: add missing columns if table already existed with old schema.
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'edited_by_user_id') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN edited_by_user_id BIGINT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'edited_by_username') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN edited_by_username VARCHAR(255) NOT NULL DEFAULT ''''',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'edited_by_full_name') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN edited_by_full_name VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'editor_role') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN editor_role VARCHAR(20) NOT NULL DEFAULT ''TEACHER''',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'old_total_correct') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN old_total_correct INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'new_total_correct') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN new_total_correct INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'old_band_score') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN old_band_score DECIMAL(3,1) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'new_band_score') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN new_band_score DECIMAL(3,1) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'old_feedback') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN old_feedback TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'new_feedback') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN new_feedback TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'edit_reason') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN edit_reason TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_attempt_grade_history' AND COLUMN_NAME = 'edited_at') = 0,
  'ALTER TABLE exam_attempt_grade_history ADD COLUMN edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- writing_submission_grade_history: add missing columns if table already existed with old schema.
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'edited_by_user_id') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN edited_by_user_id BIGINT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'edited_by_username') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN edited_by_username VARCHAR(255) NOT NULL DEFAULT ''''',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'edited_by_full_name') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN edited_by_full_name VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'editor_role') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN editor_role VARCHAR(20) NOT NULL DEFAULT ''TEACHER''',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'old_band_score') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN old_band_score DECIMAL(3,1) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'new_band_score') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN new_band_score DECIMAL(3,1) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'old_feedback') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN old_feedback TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'new_feedback') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN new_feedback TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'edit_reason') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN edit_reason TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writing_submission_grade_history' AND COLUMN_NAME = 'edited_at') = 0,
  'ALTER TABLE writing_submission_grade_history ADD COLUMN edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
