# DAVictory Database Structure

**Database Name:** DAVictory  
**Database Type:** MySQL  
**Connection:** localhost:3306  
**Total Tables:** 56

---

## 📊 Database Overview

### Table Statistics
| Table | Rows | Size (MB) |
|-------|------|-----------|
| difficulty_levels | 5 | 0.05 |
| parts | 12 | 0.05 |
| roles | 5 | 0.03 |
| sessions | 8 | 0.02 |
| *Other tables* | 0 | 0.02-0.09 |

---

## 🗂️ Database Groups

### 1️⃣ USER MANAGEMENT (Quản lý người dùng)

#### `users` - Người dùng
- **Primary Key:** id
- **Unique:** username, email
- **Fields:**
  - username (50 chars)
  - email (100 chars)
  - password (hashed)
  - fullName (100 chars)
  - phoneNumber (15 chars)
  - isActive (boolean)
  - avatar (255 chars)
  - lastLogin (datetime)
  - createdAt, updatedAt (timestamps)
- **Relationships:**
  - Many-to-Many → roles (via user_roles)
  - One-to-One → student_profiles
  - One-to-One → teacher_profiles

#### `roles` - Vai trò
- **Primary Key:** id
- **Fields:**
  - roleName (ADMIN, TEACHER, STUDENT, MANAGER)
  - description
  - createdAt, updatedAt

#### `user_roles` - Bảng trung gian User-Role
- user_id → users
- role_id → roles

#### `student_profiles` - Hồ sơ học viên
- **Primary Key:** id
- **Foreign Key:** user_id → users
- **Fields:**
  - targetBandScore (decimal)
  - currentLevel
  - learningGoals
  - center_id → centers

#### `teacher_profiles` - Hồ sơ giảng viên
- **Primary Key:** id
- **Foreign Key:** user_id → users
- **Fields:**
  - specialization
  - yearsOfExperience
  - bio
  - center_id → centers

#### `user_sessions` - Phiên đăng nhập
- **Primary Key:** id
- **Foreign Key:** user_id → users
- **Fields:**
  - sessionToken
  - ipAddress
  - userAgent
  - expiresAt
  - isActive

#### `user_activity_logs` - Nhật ký hoạt động
- **Primary Key:** id
- **Foreign Key:** user_id → users
- **Fields:**
  - activityType
  - description
  - ipAddress
  - createdAt

---

### 2️⃣ CENTER & CLASS MANAGEMENT (Quản lý trung tâm & lớp học)

#### `centers` - Trung tâm
- **Primary Key:** id
- **Fields:**
  - centerName
  - address
  - phoneNumber
  - email
  - isActive

#### `classes` - Lớp học
- **Primary Key:** id
- **Foreign Key:** center_id → centers
- **Fields:**
  - className
  - description
  - startDate, endDate
  - schedule
  - maxStudents
  - isActive

#### `class_teachers` - Giảng viên phụ trách lớp
- **Primary Key:** id
- **Foreign Keys:**
  - class_id → classes
  - teacher_id → teacher_profiles
- **Fields:**
  - isPrimary (boolean)
  - assignedAt

#### `class_students` - Học viên trong lớp
- **Primary Key:** id
- **Foreign Keys:**
  - class_id → classes
  - student_id → student_profiles
- **Fields:**
  - enrolledAt
  - status (ACTIVE, COMPLETED, DROPPED)

---

### 3️⃣ TEST STRUCTURE (Cấu trúc đề thi)

#### `sessions` - Kỳ thi (Listening/Reading/Writing/Speaking)
- **Primary Key:** id
- **Fields:**
  - sessionName (Listening, Reading, Writing, Speaking)
  - sessionType
  - description
  - durationMinutes
  - orderIndex

#### `parts` - Phần thi (Part 1, 2, 3, 4)
- **Primary Key:** id
- **Foreign Key:** session_id → sessions
- **Fields:**
  - partName (Part 1, Part 2, etc.)
  - partNumber
  - description
  - instructions
  - orderIndex

#### `tests` - Đề thi
- **Primary Key:** id
- **Fields:**
  - testName
  - testCode (unique)
  - description
  - difficulty_level_id → difficulty_levels
  - isPublished
  - publishedAt
  - createdBy → users

#### `test_sessions` - Session trong đề thi
- **Primary Key:** id
- **Foreign Keys:**
  - test_id → tests
  - session_id → sessions
- **Fields:**
  - orderIndex
  - isIncluded
  - durationMinutes (override)
  - instructions (override)

#### `test_parts` - Part trong test session
- **Primary Key:** id
- **Foreign Keys:**
  - test_session_id → test_sessions
  - part_id → parts
- **Fields:**
  - orderIndex
  - isIncluded
  - instructions (override)

#### `test_question_groups` - Nhóm câu hỏi trong test part
- **Primary Key:** id
- **Foreign Keys:**
  - test_part_id → test_parts
  - question_group_id → question_groups
- **Fields:**
  - orderIndex
  - isIncluded

#### `test_settings` - Cài đặt đề thi
- **Primary Key:** id
- **Foreign Key:** test_id → tests
- **Fields:**
  - allowReview
  - shuffleQuestions
  - showResults
  - passingScore

#### `test_statistics` - Thống kê đề thi
- **Primary Key:** id
- **Foreign Key:** test_id → tests
- **Fields:**
  - totalAttempts
  - averageScore
  - highestScore
  - lowestScore

---

### 4️⃣ QUESTION BANK (Ngân hàng câu hỏi)

#### `question_groups` - Nhóm câu hỏi
- **Primary Key:** id
- **Foreign Key:** part_id → parts
- **Fields:**
  - groupName
  - groupNumber
  - instructions
  - orderIndex
  - topic_category_id → topic_categories

#### `question_types` - Loại câu hỏi
- **Primary Key:** id
- **Fields:**
  - typeName (MCQ, Fill Blank, True/False, Matching, etc.)
  - description
  - session_id → sessions

#### `difficulty_levels` - Mức độ khó
- **Primary Key:** id
- **Fields:**
  - levelName (Very Easy, Easy, Medium, Hard, Very Hard)
  - levelValue (1-5)
  - description

#### `questions` - Câu hỏi
- **Primary Key:** id
- **Foreign Keys:**
  - question_group_id → question_groups
  - question_type_id → question_types
  - difficulty_level_id → difficulty_levels
- **Fields:**
  - questionNumber
  - questionText
  - blankContext
  - imageUrl
  - points (default 1.0)
  - orderIndex
  - isActive

#### `question_options` - Lựa chọn (MCQ)
- **Primary Key:** id
- **Foreign Key:** question_id → questions
- **Fields:**
  - optionText
  - optionLabel (A, B, C, D)
  - isCorrect
  - orderIndex

#### `answers` - Đáp án (Fill blank, Short answer)
- **Primary Key:** id
- **Foreign Key:** question_id → questions
- **Fields:**
  - answerText
  - isAcceptable
  - isCaseSensitive
  - orderIndex

#### `matching_pairs` - Cặp ghép (Matching questions)
- **Primary Key:** id
- **Foreign Key:** question_id → questions
- **Fields:**
  - leftItem
  - rightItem
  - orderIndex

#### `question_hints` - Gợi ý
- **Primary Key:** id
- **Foreign Key:** question_id → questions
- **Fields:**
  - hintText
  - hintOrder

#### `question_explanations` - Giải thích đáp án
- **Primary Key:** id
- **Foreign Key:** question_id → questions (One-to-One)
- **Fields:**
  - explanationText
  - videoUrl
  - additionalResources

#### `question_tags` - Tag câu hỏi
- **Primary Key:** id
- **Foreign Keys:**
  - question_id → questions
  - tag_id → tags

#### `tags` - Thẻ tag
- **Primary Key:** id
- **Fields:**
  - tagName
  - description

#### `question_tag_map` - Bảng trung gian Question-Tag
- question_id → questions
- tag_id → tags

#### `question_statistics` - Thống kê câu hỏi
- **Primary Key:** id
- **Foreign Key:** question_id → questions
- **Fields:**
  - totalAttempts
  - correctAttempts
  - averageTimeSeconds
  - difficultyRating

#### `topic_categories` - Danh mục chủ đề
- **Primary Key:** id
- **Fields:**
  - categoryName
  - description
  - parent_id (self-reference)

---

### 5️⃣ MEDIA & CONTENT (Nội dung & Media)

#### `media_files` - File media
- **Primary Key:** id
- **Fields:**
  - fileName
  - fileType (AUDIO, VIDEO, IMAGE, DOCUMENT)
  - fileUrl
  - filePath
  - fileSize
  - duration (for audio/video)
  - uploadedBy → users

#### `audio_transcripts` - Transcript audio
- **Primary Key:** id
- **Foreign Key:** media_file_id → media_files
- **Fields:**
  - transcriptText
  - language
  - timestampedText (JSON)

#### `passage_contents` - Nội dung đoạn văn (Reading)
- **Primary Key:** id
- **Foreign Key:** question_group_id → question_groups
- **Fields:**
  - passageTitle
  - passageText
  - passageType (ACADEMIC, GENERAL)
  - wordCount
  - readingLevel

---

### 6️⃣ EXAM ATTEMPTS (Làm bài thi)

#### `exam_attempts` - Lần làm bài
- **Primary Key:** id
- **Foreign Keys:**
  - user_id → users
  - session_id → sessions
- **Fields:**
  - status (IN_PROGRESS, SUBMITTED, TIMED_OUT, GRADED)
  - startedAt, submittedAt, gradedAt
  - timeLimitSeconds
  - timeSpentSeconds
  - totalAnswered, totalCorrect
  - rawScore
  - bandScore (0.0-9.0)
  - feedback
  - attemptNumber
  - isActive

#### `attempt_answers` - Câu trả lời
- **Primary Key:** id
- **Foreign Keys:**
  - exam_attempt_id → exam_attempts
  - question_id → questions
- **Fields:**
  - selectedOption_id → question_options
  - answerText
  - isCorrect
  - pointsEarned
  - timeSpentSeconds

#### `attempt_sections` - Trạng thái từng phần
- **Primary Key:** id
- **Foreign Keys:**
  - exam_attempt_id → exam_attempts
  - part_id → parts
- **Fields:**
  - status (NOT_STARTED, IN_PROGRESS, COMPLETED)
  - startedAt, completedAt
  - timeSpentSeconds
  - orderIndex

#### `attempt_question_times` - Thời gian từng câu
- **Primary Key:** id
- **Foreign Keys:**
  - exam_attempt_id → exam_attempts
  - question_id → questions
- **Fields:**
  - timeSpentSeconds
  - visitCount

---

### 7️⃣ WRITING MODULE (Module Writing)

#### `writing_tasks` - Nhiệm vụ Writing
- **Primary Key:** id
- **Fields:**
  - taskType (TASK_1, TASK_2)
  - taskNumber
  - description

#### `writing_prompts` - Đề bài Writing
- **Primary Key:** id
- **Foreign Key:** writing_task_id → writing_tasks
- **Fields:**
  - promptText
  - promptType (ACADEMIC, GENERAL)
  - topic_category_id → topic_categories
  - imageUrl
  - chartData
  - minWords, maxWords
  - timeLimit

#### `writing_sample_answers` - Bài mẫu
- **Primary Key:** id
- **Foreign Key:** writing_prompt_id → writing_prompts
- **Fields:**
  - sampleText
  - bandScore
  - analysis
  - createdBy → users

#### `student_writing_submissions` - Bài làm của học viên
- **Primary Key:** id
- **Foreign Keys:**
  - student_id → student_profiles
  - writing_prompt_id → writing_prompts
- **Fields:**
  - submissionText
  - wordCount
  - submittedAt
  - status (PENDING, GRADED)
  - gradedBy → teacher_profiles
  - gradedAt

#### `writing_scores` - Điểm Writing
- **Primary Key:** id
- **Foreign Key:** submission_id → student_writing_submissions
- **Fields:**
  - taskAchievement
  - coherenceCohesion
  - lexicalResource
  - grammaticalRange
  - overallBandScore
  - feedback

#### `writing_scoring_criteria` - Tiêu chí chấm điểm
- **Primary Key:** id
- **Foreign Key:** writing_task_id → writing_tasks
- **Fields:**
  - criteriaName
  - description
  - maxScore

#### `writing_feedback_templates` - Mẫu feedback
- **Primary Key:** id
- **Fields:**
  - templateName
  - templateText
  - category
  - createdBy → users

---

### 8️⃣ SPEAKING MODULE (Module Speaking)

#### `speaking_topics` - Chủ đề Speaking
- **Primary Key:** id
- **Fields:**
  - topicName
  - description
  - topic_category_id → topic_categories

#### `speaking_cue_cards` - Thẻ gợi ý (Part 2)
- **Primary Key:** id
- **Foreign Key:** speaking_topic_id → speaking_topics
- **Fields:**
  - cueCardText
  - preparationTime
  - speakingTime
  - bulletPoints

#### `speaking_attempts` - Lần thi Speaking
- **Primary Key:** id
- **Foreign Keys:**
  - student_id → student_profiles
  - speaking_cue_card_id → speaking_cue_cards
- **Fields:**
  - attemptDate
  - status (IN_PROGRESS, COMPLETED, GRADED)
  - recordingUrl
  - duration
  - gradedBy → teacher_profiles

#### `speaking_recordings` - File ghi âm
- **Primary Key:** id
- **Foreign Keys:**
  - speaking_attempt_id → speaking_attempts
  - media_file_id → media_files
- **Fields:**
  - partNumber (1, 2, 3)
  - recordingOrder

#### `speaking_scores` - Điểm Speaking
- **Primary Key:** id
- **Foreign Key:** speaking_attempt_id → speaking_attempts
- **Fields:**
  - fluencyCoherence
  - lexicalResource
  - grammaticalRange
  - pronunciation
  - overallBandScore

#### `speaking_feedback` - Feedback Speaking
- **Primary Key:** id
- **Foreign Key:** speaking_attempt_id → speaking_attempts
- **Fields:**
  - feedbackText
  - strengths
  - weaknesses
  - suggestions
  - createdBy → teacher_profiles

---

### 9️⃣ ASSIGNMENTS (Bài tập)

#### `assignments` - Bài tập
- **Primary Key:** id
- **Foreign Keys:**
  - class_id → classes
  - created_by → teacher_profiles
- **Fields:**
  - assignmentTitle
  - description
  - assignmentType (PRACTICE, HOMEWORK, MOCK_TEST)
  - dueDate
  - maxScore
  - isPublished

#### `assignment_submissions` - Bài nộp
- **Primary Key:** id
- **Foreign Keys:**
  - assignment_id → assignments
  - student_id → student_profiles
- **Fields:**
  - submissionText
  - submittedAt
  - status (PENDING, GRADED, LATE)
  - score
  - feedback
  - gradedBy → teacher_profiles
  - gradedAt

---

### 🔟 STUDENT PROGRESS (Tiến độ học viên)

#### `student_progress` - Tiến độ tổng quan
- **Primary Key:** id
- **Foreign Key:** student_id → student_profiles
- **Fields:**
  - session_id → sessions
  - currentLevel
  - targetLevel
  - completedTests
  - averageScore
  - lastUpdated

#### `student_skill_scores` - Điểm kỹ năng
- **Primary Key:** id
- **Foreign Key:** student_id → student_profiles
- **Fields:**
  - session_id → sessions
  - bandScore
  - testDate
  - exam_attempt_id → exam_attempts

---

## 🔗 Key Relationships Summary

### User Relationships
- User ↔ Roles (Many-to-Many via user_roles)
- User → StudentProfile (One-to-One)
- User → TeacherProfile (One-to-One)
- User → ExamAttempts (One-to-Many)

### Test Structure
- Test → TestSessions → TestParts → TestQuestionGroups
- Session → Parts → QuestionGroups → Questions

### Question Bank
- Question → QuestionOptions (One-to-Many)
- Question → Answers (One-to-Many)
- Question → QuestionHints (One-to-Many)
- Question → QuestionExplanation (One-to-One)
- Question ↔ Tags (Many-to-Many)

### Exam Flow
- ExamAttempt → AttemptAnswers (One-to-Many)
- ExamAttempt → AttemptSections (One-to-Many)
- ExamAttempt → AttemptQuestionTimes (One-to-Many)

### Class Management
- Center → Classes (One-to-Many)
- Class ↔ Teachers (Many-to-Many via class_teachers)
- Class ↔ Students (Many-to-Many via class_students)

---

## 📝 Notes

- All tables use `id` as Primary Key with AUTO_INCREMENT
- Most tables have `createdAt` and `updatedAt` timestamps
- Soft delete pattern used with `isActive` boolean field
- Band scores stored as DECIMAL(2,1) for IELTS 0.0-9.0 range
- Foreign keys enforce referential integrity
- Indexes created on foreign keys for performance

---

**Generated:** 2026-03-05  
**Spring Boot Version:** 3.x  
**JPA/Hibernate:** ddl-auto=update
