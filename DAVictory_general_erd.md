# DAVictory Student-Teacher ERD

This file focuses on the student/candidate and teacher flows only. It keeps the real tables, but limits the diagram to the smallest useful set so the ERD stays readable.

```mermaid
erDiagram
    %% Student-teacher scope only
    %% Omitted to keep the diagram small: user_roles, test_sections, question_bank, questions, answer history, test versions, share links, guest exam flow, and other support tables

    users {
        bigint id PK
        varchar(255) avatar
        datetime(6) created_at
        varchar(100) email
        varchar(100) full_name
        bit(1) is_active
        datetime(6) last_login
        varchar(255) password
        varchar(15) phone_number
        datetime(6) updated_at
        varchar(50) username
        datetime(6) deleted_at
    }

    student_profiles {
        bigint id PK
        varchar(500) address
        varchar(100) city
        varchar(100) country
        datetime(6) created_at
        varchar(20) current_level
        date date_of_birth
        varchar(15) emergency_contact
        varchar(100) emergency_contact_name
        date enrollment_date
        varchar(10) gender
        varchar(50) learning_goal
        text notes
        varchar(50) student_code
        varchar(10) target_band
        datetime(6) updated_at
        bigint user_id FK
    }

    teacher_profiles {
        bigint id PK
        varchar(500) bio
        text certifications
        datetime(6) created_at
        varchar(100) education
        varchar(50) employment_type
        double hourly_rate
        varchar(20) ielts_score
        bit(1) is_available
        date join_date
        text qualifications
        varchar(100) specialization
        varchar(50) teacher_code
        text teaching_style
        varchar(100) university
        datetime(6) updated_at
        int years_of_experience
        bigint user_id FK
    }

    classes {
        bigint id PK
        varchar(20) class_type
        varchar(30) code
        datetime(6) created_at
        date end_date
        bit(1) is_active
        varchar(30) level
        int max_students
        varchar(100) name
        text notes
        varchar(255) room_location
        varchar(50) schedule
        date start_date
        varchar(20) status
        varchar(20) target_band
        datetime(6) updated_at
        bigint center_id
    }

    class_students {
        bigint id PK
        datetime(6) created_at
        varchar(255) drop_reason
        date dropped_at
        date enrolled_at
        double final_band_score
        text notes
        varchar(20) status
        datetime(6) updated_at
        bigint class_id FK
        bigint user_id FK
    }

    class_teachers {
        bigint id PK
        date assigned_at
        datetime(6) created_at
        bit(1) is_active
        text notes
        date released_at
        varchar(20) role
        datetime(6) updated_at
        bigint class_id FK
        bigint user_id FK
    }

    tests {
        bigint id PK
        int attempt_count
        double average_score
        datetime(6) created_at
        varchar(500) description
        int duration_minutes
        bit(1) is_full_test
        datetime(6) published_at
        datetime(6) reviewed_at
        varchar(20) status
        varchar(50) target_band
        varchar(20) test_type
        varchar(255) title
        datetime(6) updated_at
        bigint created_by
        bigint reviewed_by
        bigint thumbnail_media_id
        longtext logo_url
        varchar(50) series_label
    }

    exam_attempts {
        bigint id PK
        int attempt_number
        float band_score
        datetime(6) created_at
        text feedback
        datetime(6) graded_at
        bit(1) is_active
        double raw_score
        datetime(6) started_at
        varchar(20) status
        datetime(6) submitted_at
        int time_limit_seconds
        int time_spent_seconds
        int total_answered
        int total_correct
        datetime(6) updated_at
        bigint session_id
        bigint user_id FK
        bigint test_id FK
        varchar(50) attempt_type
    }

    student_writing_submissions {
        bigint id PK
        int attempt_number
        datetime(6) created_at
        datetime(6) graded_at
        double overall_band_score
        text overall_feedback
        varchar(20) status
        longtext submission_text
        datetime(6) submitted_at
        int time_taken_seconds
        datetime(6) updated_at
        int word_count
        bigint exam_attempt_id FK
        bigint graded_by
        bigint user_id FK
        bigint writing_prompt_id
        bigint question_group_id
    }

    assignments {
        bigint id PK
        datetime(6) assigned_at
        varchar(30) assignment_type
        varchar(500) attachment_url
        datetime(6) created_at
        text description
        datetime(6) due_date
        bit(1) is_active
        bit(1) is_required
        double max_score
        text notes
        varchar(255) status
        varchar(200) title
        datetime(6) updated_at
        bigint class_id FK
        bigint created_by
        bigint test_id
        int max_attempts
        tinyint(1) allow_late_submission
    }

    assignment_submissions {
        bigint id PK
        varchar(500) attachment_url
        datetime(6) created_at
        text feedback
        datetime(6) graded_at
        double score
        varchar(20) status
        text submission_text
        datetime(6) submitted_at
        datetime(6) updated_at
        bigint assignment_id FK
        bigint graded_by
        bigint user_id FK
        bigint exam_attempt_id
        int attempt_number
    }

    %% Relationships shown only for the student-facing core tables
    users ||--|| student_profiles : profile
    users ||--o{ class_students : member
    users ||--o{ class_teachers : teacher
    classes ||--o{ class_students : includes
    classes ||--o{ class_teachers : taught_by
    users ||--|| teacher_profiles : profile
    users ||--o{ tests : creates
    tests ||--o{ exam_attempts : has_attempts
    users ||--o{ exam_attempts : takes
    exam_attempts ||--o{ student_writing_submissions : writing
    users ||--o{ student_writing_submissions : submits
    users ||--o{ student_writing_submissions : grades
    classes ||--o{ assignments : has
    users ||--o{ assignments : creates
    assignments ||--o{ assignment_submissions : submissions
    users ||--o{ assignment_submissions : submits
    users ||--o{ assignment_submissions : grades
```

Note: this is intentionally smaller than the physical schema so it can be used as a student-teacher ERD for explanation and presentation.
