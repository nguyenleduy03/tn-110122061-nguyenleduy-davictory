-- Tạo bảng guest_exam_attempts cho khách làm bài không cần đăng nhập
CREATE TABLE IF NOT EXISTS guest_exam_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    test_id BIGINT,
    session_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    started_at DATETIME NOT NULL,
    submitted_at DATETIME,
    time_limit_seconds INT,
    time_spent_seconds INT,
    total_answered INT,
    total_correct INT,
    raw_score DOUBLE,
    band_score DECIMAL(3,1),
    attempt_type VARCHAR(50),
    answers_json TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    
    INDEX idx_guest_email (email),
    INDEX idx_guest_created (created_at),
    INDEX idx_guest_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
