CREATE TABLE IF NOT EXISTS exam_attempt_grade_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  exam_attempt_id BIGINT NOT NULL,
  edited_by_user_id BIGINT NOT NULL,
  edited_by_username VARCHAR(255) NOT NULL,
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
  KEY idx_eagh_attempt_edited_at (exam_attempt_id, edited_at),
  CONSTRAINT fk_eagh_attempt FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id),
  CONSTRAINT fk_eagh_editor FOREIGN KEY (edited_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
