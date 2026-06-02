-- ============================================================
-- MIGRATION: AI Writing Grading Service
-- Thêm 2 bảng mới + ALTER bảng student_writing_submissions
-- ============================================================

-- 1. Kết quả chấm AI (lưu mỗi lần chấm)
CREATE TABLE IF NOT EXISTS ai_grading_results (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    submission_id   BIGINT NOT NULL,
    provider        VARCHAR(30) COMMENT 'openai, groq',
    model           VARCHAR(50) COMMENT 'model name used',

    overall_band    DOUBLE NOT NULL COMMENT '0.0 - 9.0',

    ta_score        DOUBLE COMMENT 'Task Achievement/Response',
    ta_feedback     TEXT,
    cc_score        DOUBLE COMMENT 'Coherence & Cohesion',
    cc_feedback     TEXT,
    lr_score        DOUBLE COMMENT 'Lexical Resource',
    lr_feedback     TEXT,
    gra_score       DOUBLE COMMENT 'Grammatical Range & Accuracy',
    gra_feedback    TEXT,

    overall_feedback        TEXT,
    strengths               TEXT COMMENT 'JSON array',
    weaknesses              TEXT COMMENT 'JSON array',
    improvement_priority    TEXT COMMENT 'JSON array',

    confidence_score        DOUBLE COMMENT '0.0 - 1.0',
    reference_sample_ids    VARCHAR(500) COMMENT '123,456,789',
    prompt_version          VARCHAR(20),

    prompt_tokens           INT,
    completion_tokens       INT,
    total_tokens            INT,
    latency_ms              BIGINT,

    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, COMPLETED, FAILED, APPROVED, REJECTED',
    error_message   TEXT,

    approved_by     BIGINT COMMENT 'FK -> users (teacher who approved)',
    approved_at     DATETIME,
    teacher_adjustments TEXT COMMENT 'JSON: what teacher changed',

    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_submission (submission_id),
    INDEX idx_status (status),
    INDEX idx_provider_model (provider, model),
    CONSTRAINT fk_ai_result_submission FOREIGN KEY (submission_id)
        REFERENCES student_writing_submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. Audit log (ghi lại toàn bộ prompt + response để debug)
CREATE TABLE IF NOT EXISTS ai_grading_audit_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    submission_id   BIGINT NOT NULL,
    grading_result_id BIGINT,

    provider        VARCHAR(30),
    model           VARCHAR(50),

    system_prompt   LONGTEXT COMMENT 'Full system prompt sent to LLM',
    user_prompt     LONGTEXT COMMENT 'Full user prompt (with rubric + essay)',
    raw_response    LONGTEXT COMMENT 'Raw LLM output',

    prompt_tokens       INT,
    completion_tokens   INT,
    latency_ms          BIGINT,

    success         BOOLEAN NOT NULL DEFAULT TRUE,
    error_message   TEXT,

    triggered_by    VARCHAR(100) COMMENT 'username who triggered',
    trigger_source  VARCHAR(30) DEFAULT 'MANUAL' COMMENT 'MANUAL, BATCH, AUTO',

    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_submission (submission_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. ALTER bảng student_writing_submissions (thêm 2 field cho AI)
ALTER TABLE student_writing_submissions
    ADD COLUMN IF NOT EXISTS ai_graded_by        VARCHAR(30) DEFAULT NULL COMMENT 'openai, groq, null = human graded',
    ADD COLUMN IF NOT EXISTS ai_confidence_score DOUBLE       DEFAULT NULL COMMENT '0.0-1.0 confidence of AI grading';
