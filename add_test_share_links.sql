CREATE TABLE IF NOT EXISTS test_share_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT NOT NULL,
    skill_type VARCHAR(20) NOT NULL,
    token VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refreshed_at DATETIME NULL,

    CONSTRAINT fk_test_share_links_test
        FOREIGN KEY (test_id) REFERENCES tests(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_test_share_links_user
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT,

    UNIQUE KEY uk_test_share_links_token (token),
    KEY idx_test_share_links_lookup (test_id, skill_type, is_active)
);
