CREATE TABLE IF NOT EXISTS writing_submission_grade_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  writing_submission_id BIGINT NOT NULL,
  edited_by_user_id BIGINT NOT NULL,
  edited_by_username VARCHAR(255) NOT NULL,
  editor_role VARCHAR(20) NOT NULL,
  old_band_score DECIMAL(3,1) NULL,
  new_band_score DECIMAL(3,1) NULL,
  old_feedback TEXT NULL,
  new_feedback TEXT NULL,
  edit_reason TEXT NULL,
  edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wsgh_submission_edited_at (writing_submission_id, edited_at),
  KEY idx_wsgh_editor (edited_by_user_id),
  CONSTRAINT fk_wsgh_submission FOREIGN KEY (writing_submission_id)
    REFERENCES student_writing_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_wsgh_editor FOREIGN KEY (edited_by_user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
