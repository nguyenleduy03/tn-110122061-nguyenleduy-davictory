-- Add new fields to assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS max_attempts INT NULL,
ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN DEFAULT false;

-- Update existing assignments to MANUAL type
UPDATE assignments SET type = 'MANUAL' WHERE type IS NULL;

-- Add new fields to assignment_submissions table
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS exam_attempt_id BIGINT NULL,
ADD COLUMN IF NOT EXISTS graded_by BIGINT NULL,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP NULL;

-- Add foreign key for exam_attempt_id
ALTER TABLE assignment_submissions
ADD CONSTRAINT fk_submission_exam_attempt 
FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id) ON DELETE SET NULL;

-- Add foreign key for graded_by
ALTER TABLE assignment_submissions
ADD CONSTRAINT fk_submission_graded_by 
FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update status enum if needed
-- ALTER TABLE assignment_submissions MODIFY COLUMN status VARCHAR(20);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_user 
ON assignment_submissions(assignment_id, user_id);

CREATE INDEX IF NOT EXISTS idx_submissions_status 
ON assignment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_attempt 
ON assignment_submissions(exam_attempt_id);
