CREATE TABLE IF NOT EXISTS test_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_by_id BIGINT,
    question_count INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_tv_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT fk_tv_user FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tv_test_id ON test_versions(test_id);
