COMPACT_SCHEMAS = {
    "users": "Người dùng: id, full_name, email, username, phone_number, is_active, deleted_at",
    "roles": "Vai trò: id, name (STUDENT/TEACHER/MANAGER/ADMIN), description",
    "user_roles": "Phân quyền: user_id(FK→users), role_id(FK→roles)",
    "classes": "Lớp học: id, name, code, level, class_type, target_band, max_students, start_date, end_date, status, schedule, center_id(FK→centers), is_active",
    "class_students": "HS trong lớp: id, user_id(FK→users), class_id(FK→classes), status(ACTIVE/DROPPED), enrolled_at, final_band_score",
    "class_teachers": "GV trong lớp: id, user_id(FK→users), class_id(FK→classes), role(MAIN_TEACHER/SUPPORT_TEACHER), is_active, assigned_at",
    "centers": "Trung tâm: id, name, code, address, city, phone_number, is_active, manager_id(FK→users)",
    "tests": "Đề thi IELTS: id, title, description, test_type(ACADEMIC/GENERAL), status(DRAFT/REVIEWING/PUBLISHED), duration_minutes, is_full_test, target_band, series_label, created_by(FK→users), created_at",
    "test_sessions": "Kỹ năng trong đề: id, test_id(FK→tests), session_id(FK→sessions), order_index, duration_minutes",
    "sessions": "Định nghĩa kỹ năng: id, name, skill_type(LISTENING/READING/WRITING/SPEAKING), test_type, duration_minutes, total_questions",
    "test_parts": "Part trong kỹ năng: id, test_session_id(FK→test_sessions), part_id(FK→parts), order_index, duration_minutes",
    "parts": "Định nghĩa part: id, session_id(FK→sessions), name, order_index, description, total_questions",
    "questions": "Câu hỏi: id, question_group_id(FK→question_groups), question_type_id(FK→question_types), question_text, order_index, points",
    "answers": "Đáp án: id, question_id(FK→questions), answer_text, blank_index, is_case_sensitive",
    "question_options": "Lựa chọn: id, question_id(FK→questions), option_label(A/B/C/D...), option_text, is_correct",
    "question_groups": "Nhóm câu hỏi: id, part_id(FK→parts), title, passage_text, order_index, content_type",
    "question_types": "Loại câu hỏi: id, code(MULTIPLE_CHOICE/FILL_BLANK/MATCHING...), display_name, has_options, has_text_answer",
    "passage_contents": "Bài đọc: id, title, content, topic, word_count, reading_level, created_by(FK→users)",
    "exams": "Kỳ thi: id, title, description, exam_type(CLASS_EXAM/OPEN_EXAM), status(OPEN/SCHEDULED/CLOSED), duration_minutes, class_id(FK→classes), test_id(FK→tests), created_by(FK→users), scheduled_start_time, password",
    "exam_attempts": "Bài làm: id, user_id(FK→users), test_id(FK→tests), exam_id(FK→exams), session_id(FK→sessions), status(IN_PROGRESS/SUBMITTED/GRADED), band_score, total_correct, total_answered, raw_score, started_at, submitted_at, attempt_number, attempt_type",
    "attempt_answers": "Câu trả lời: id, exam_attempt_id(FK→exam_attempts), question_id(FK→questions), selected_option_label, text_answer, is_correct, points_earned",
    "assignments": "Bài tập: id, class_id(FK→classes), title, description, assignment_type(TEST/FREE), status, due_date, max_score, max_attempts, created_by(FK→users), test_id(FK→tests)",
    "assignment_submissions": "Bài nộp: id, assignment_id(FK→assignments), user_id(FK→users), status(PENDING/SUBMITTED/GRADED), score, feedback, submitted_at, graded_by(FK→users)",
    "teacher_profiles": "Hồ sơ GV: id, user_id(FK→users), teacher_code, specialization, qualifications, ielts_score, years_of_experience, hourly_rate, is_available, employment_type",
    "student_profiles": "Hồ sơ HS: id, user_id(FK→users), student_code, date_of_birth, gender, address, target_band, current_level, enrollment_date, learning_goal",
    "student_progress": "Tiến độ HS: id, student_id(FK→users), tracked_date, overall_band_score, listening_score, reading_score, writing_score, speaking_score, tests_completed, questions_correct, tests_attempted, study_minutes",
    "student_skill_scores": "Điểm kỹ năng: id, student_id(FK→users), skill_type(LISTENING/READING/WRITING/SPEAKING), current_score, best_score, target_score, total_attempts, trend",
    "student_writing_submissions": "Bài writing: id, user_id(FK→users), writing_prompt_id(FK→writing_prompts), status, overall_band_score, overall_feedback, word_count, submitted_at, graded_by(FK→users)",
    "writing_prompts": "Đề writing: id, writing_task_id(FK→writing_tasks), title, prompt_text, essay_type, chart_type, topic",
    "writing_tasks": "Dạng bài writing: id, code(TASK_1/TASK_2), display_name, description, duration_minutes, min_words, score_weight",
    "writing_scoring_criteria": "Tiêu chí chấm: id, writing_task_id(FK→writing_tasks), code(TA/CC/GRA/LR), display_name, max_score, weight",
    "writing_scores": "Điểm writing: id, submission_id(FK→student_writing_submissions), criteria_id(FK→writing_scoring_criteria), score, feedback",
    "speaking_attempts": "Bài speaking: id, user_id(FK→users), exam_attempt_id(FK→exam_attempts), status, overall_band_score, speaking_part, started_at, submitted_at, total_duration_seconds",
    "speaking_topics": "Chủ đề speaking: id, title, description, category, part, difficulty_level_id",
    "speaking_cue_cards": "Cue cards: id, speaking_topic_id(FK→speaking_topics), title, task_prompt, bullet_points, follow_up_questions, prep_time_seconds, difficulty_level_id",
    "speaking_recordings": "Ghi âm: id, speaking_attempt_id(FK→speaking_attempts), audio_url, duration_seconds, recording_part, transcript",
    "speaking_scores": "Điểm speaking: id, speaking_attempt_id(FK→speaking_attempts), overall_band_score, fluency_coherence, lexical_resource, grammatical_range_accuracy, pronunciation",
    "blog_posts": "Bài viết blog: id, title, slug, status(DRAFT/PUBLISHED), tags, created_by(FK→users), published_at",
    "difficulty_levels": "Mức độ: id, level, name, band_range, description",
    "test_statistics": "Thống kê đề: id, test_id(FK→tests), total_attempts, completed_attempts, avg_band_score, highest_band_score, unique_students",
    "full_test_progress": "Tiến độ làm full test: id, user_id(FK→users), test_id(FK→tests), status, current_skill, progress_percent",
    "media_files": "File media: id, file_name, file_url, media_type(AUDIO/IMAGE/VIDEO/DOCUMENT), duration, uploaded_by(FK→users)",
}

TABLE_SCHEMAS = {
    "users": "Người dùng: id, full_name, email, username, phone_number, is_active, deleted_at, created_at, updated_at, avatar, last_login",
    "roles": "Vai trò: id, name (STUDENT/TEACHER/MANAGER/ADMIN), description, created_at, updated_at",
    "user_roles": "Phân quyền: user_id(FK→users), role_id(FK→roles) (nhiều-nhiều users và roles)",
    "classes": "Lớp học: id, name, code, level, class_type, target_band, max_students, start_date, end_date, status, schedule, center_id(FK→centers), is_active, room_location, notes, created_at, updated_at",
    "class_students": "Học sinh trong lớp: id, user_id(FK→users), class_id(FK→classes), status (ACTIVE/DROPPED), enrolled_at, dropped_at, drop_reason, final_band_score, notes, created_at, updated_at",
    "class_teachers": "Giáo viên trong lớp: id, user_id(FK→users), class_id(FK→classes), role (MAIN_TEACHER/SUPPORT_TEACHER), is_active, assigned_at, released_at, notes, created_at, updated_at",
    "centers": "Trung tâm: id, name, code, address, city, province, phone_number, email, website, logo_url, description, is_active, manager_id(FK→users), created_at, updated_at",
    "tests": "Đề thi IELTS: id, title, description, test_type (ACADEMIC/GENERAL), status (DRAFT/REVIEWING/PUBLISHED), duration_minutes, is_full_test, target_band, series_label, logo_url, created_by(FK→users), reviewed_by(FK→users), published_at, reviewed_at, created_at, updated_at, attempt_count, average_score",
    "test_sessions": "Kỹ năng trong đề: id, test_id(FK→tests), session_id(FK→sessions), order_index, duration_minutes, instructions, is_included, created_at, updated_at",
    "sessions": "Định nghĩa kỹ năng: id, name, skill_type (LISTENING/READING/WRITING/SPEAKING), test_type (ACADEMIC/GENERAL), duration_minutes, total_questions, max_score, order_index, instructions, description, is_active, created_at, updated_at",
    "test_parts": "Part trong kỹ năng của đề: id, test_session_id(FK→test_sessions), part_id(FK→parts), order_index, duration_minutes, is_included, question_count, custom_name, custom_instructions, created_at",
    "parts": "Định nghĩa part kỹ năng: id, session_id(FK→sessions), name, order_index, description, duration_minutes, total_questions, instructions, question_format, score_weight, is_active, created_at, updated_at, difficulty_level_id(FK→difficulty_levels)",
    "questions": "Câu hỏi chi tiết: id, question_group_id(FK→question_groups), question_type_id(FK→question_types), question_text, blank_context, order_index, question_number, points, is_active, image_url, pinx, piny, created_at, updated_at",
    "answers": "Đáp án của câu hỏi: id, question_id(FK→questions), answer_text, blank_index, is_case_sensitive, word_limit, alternative_answers, is_sample, created_at, updated_at",
    "question_options": "Lựa chọn trắc nghiệm: id, question_id(FK→questions), option_label (A/B/C/D), option_text, is_correct, image_url, order_index, created_at, updated_at",
    "question_groups": "Nhóm câu hỏi (dùng chung passage/audio): id, part_id(FK→parts), title, passage_text, instructions, order_index, content_type, audio_url, from_question, to_question, is_active, created_at, updated_at, image_url",
    "question_types": "Loại/định dạng câu hỏi: id, code, display_name, description, instructions, has_options, has_text_answer, has_matching, applicable_skills, is_active, order_index, created_at, updated_at",
    "passage_contents": "Bài đọc Reading: id, title, content, topic, author, source, word_count, reading_level, vocabulary, paragraph_labels, is_verified, created_by(FK→users), verified_by(FK→users), created_at, updated_at",
    "exams": "Kỳ thi: id, title, description, exam_type (CLASS_EXAM/OPEN_EXAM), status (OPEN/SCHEDULED/CLOSED), duration_minutes, password, allow_review_after_submit, max_attempts, late_entry_minutes, scheduled_start_time, scheduled_end_time, started_at, closed_at, class_id(FK→classes), test_id(FK→tests), created_by(FK→users), created_at, updated_at",
    "exam_attempts": "Bài làm của học sinh: id, user_id(FK→users), test_id(FK→tests), exam_id(FK→exams), session_id(FK→sessions), status (IN_PROGRESS/SUBMITTED/GRADED), band_score (float), raw_score (double), total_correct, total_answered, attempt_number, attempt_type, started_at, submitted_at, graded_at, time_limit_seconds, time_spent_seconds, feedback, is_active, created_at, updated_at",
    "attempt_answers": "Câu trả lời của thí sinh: id, exam_attempt_id(FK→exam_attempts), question_id(FK→questions), selected_option_label, text_answer, matching_answer, is_correct, is_answered, is_flagged, points_earned, correction_note, answered_at, created_at, updated_at",
    "assignments": "Bài tập giao cho lớp: id, class_id(FK→classes), title, description, assignment_type (TEST/FREE), status, due_date, max_score, max_attempts, is_required, allow_late_submission, attachment_url, notes, created_by(FK→users), test_id(FK→tests), assigned_at, is_active, created_at, updated_at",
    "assignment_submissions": "Bài nộp của học sinh: id, assignment_id(FK→assignments), user_id(FK→users), status (PENDING/SUBMITTED/GRADED), score, feedback, submission_text, attachment_url, submitted_at, graded_at, graded_by(FK→users), attempt_number, created_at, updated_at",
    "teacher_profiles": "Hồ sơ giáo viên: id, user_id(FK→users, UNIQUE), teacher_code, specialization, qualifications, certifications, education, university, bio, ielts_score, years_of_experience, hourly_rate, employment_type, teaching_style, join_date, is_available, created_at, updated_at",
    "student_profiles": "Hồ sơ học sinh: id, user_id(FK→users, UNIQUE), student_code, date_of_birth, gender, address, city, country, target_band, current_level, enrollment_date, learning_goal, emergency_contact, emergency_contact_name, notes, created_at, updated_at",
    "student_progress": "Tiến độ học tập: id, student_id(FK→users), tracked_date, overall_band_score, listening_score, reading_score, writing_score, speaking_score, tests_completed, tests_attempted, questions_correct, questions_attempted, current_streak, longest_streak, study_minutes, created_at, updated_at",
    "student_skill_scores": "Điểm kỹ năng chi tiết: id, student_id(FK→users), skill_type (LISTENING/READING/WRITING/SPEAKING), current_score, best_score, best_score_achieved_at, target_score, total_attempts, total_questions_attempted, total_questions_correct, total_study_minutes, accuracy_rate, score_change, trend, last_attempt_at, created_at, updated_at",
    "student_writing_submissions": "Bài writing đã nộp: id, user_id(FK→users), writing_prompt_id(FK→writing_prompts), status, submission_text, overall_band_score, overall_feedback, word_count, submitted_at, graded_at, graded_by(FK→users), attempt_number, time_taken_seconds, exam_attempt_id(FK→exam_attempts), created_at, updated_at",
    "writing_prompts": "Đề bài writing: id, writing_task_id(FK→writing_tasks), title, prompt_text, essay_type, chart_type, topic, image_url, order_index, is_active, difficulty_level_id(FK→difficulty_levels), created_at, updated_at",
    "writing_tasks": "Dạng bài writing: id, code (TASK_1/TASK_2), display_name, description, instructions, duration_minutes, min_words, recommended_words, score_weight, order_index, is_active, created_at, updated_at",
    "writing_scoring_criteria": "Tiêu chí chấm writing: id, writing_task_id(FK→writing_tasks), code (TA/CC/GRA/LR), display_name, description, max_score, weight, band_descriptors, order_index, is_active, created_at, updated_at",
    "writing_scores": "Điểm từng tiêu chí: id, submission_id(FK→student_writing_submissions), criteria_id(FK→writing_scoring_criteria), score, feedback, inline_annotations, scored_by(FK→users), scored_at, created_at, updated_at",
    "speaking_attempts": "Bài speaking: id, user_id(FK→users), exam_attempt_id(FK→exam_attempts), speaking_topic_id(FK→speaking_topics), cue_card_id(FK→speaking_cue_cards), status, overall_band_score, speaking_part, started_at, submitted_at, total_duration_seconds, attempt_number, graded_by(FK→users), graded_at, is_active, created_at",
    "speaking_topics": "Chủ đề speaking: id, title, description, category, part, sample_questions, order_index, is_active, difficulty_level_id(FK→difficulty_levels), created_at, updated_at",
    "speaking_cue_cards": "Cue card: id, speaking_topic_id(FK→speaking_topics), title, task_prompt, bullet_points, follow_up_questions, prep_time_seconds, max_speak_seconds, min_speak_seconds, order_index, is_active, difficulty_level_id(FK→difficulty_levels), created_at, updated_at",
    "speaking_recordings": "Ghi âm speaking: id, speaking_attempt_id(FK→speaking_attempts), audio_url, audio_format, duration_seconds, file_size_bytes, recording_part, recording_order, transcript, transcript_status, is_active, created_at, updated_at",
    "speaking_scores": "Điểm speaking: id, speaking_attempt_id(FK→speaking_attempts), overall_band_score, fluency_coherence, lexical_resource, grammatical_range_accuracy, pronunciation, part1_score, part2_score, part3_score, scored_by(FK→users), scored_at, created_at, updated_at",
    "blog_posts": "Bài viết blog: id, title, content, slug, status (DRAFT/PUBLISHED), tags, thumbnail, excerpt, meta_description, reading_time, source, created_by(FK→users), published_at, created_at, updated_at, deleted_at",
    "difficulty_levels": "Mức độ khó: id, level (int), name, band_range, color_code, description, created_at, updated_at",
    "test_statistics": "Thống kê: id, test_id(FK→tests), total_attempts, completed_attempts, abandoned_attempts, unique_students, avg_band_score, highest_band_score, lowest_band_score, avg_completion_minutes, completion_rate, last_attempt_at, created_at, updated_at",
    "full_test_progress": "Tiến độ full test: id, user_id(FK→users), test_id(FK→tests), status, current_skill, current_part_index, current_section, progress_percent, session_state_json, snapshot_json, created_at, updated_at",
    "media_files": "File media: id, file_name, stored_file_name, file_path, file_url, media_type (AUDIO/IMAGE/VIDEO/DOCUMENT), mime_type, file_size, duration, width, height, title, alt_text, description, is_active, uploaded_by(FK→users), created_at, updated_at",
}


def get_schema_text(tables: list[str] | None = None, compact: bool = False) -> str:
    schemas = COMPACT_SCHEMAS if compact else TABLE_SCHEMAS
    if tables:
        return "\n".join(f"- {t}: {schemas[t]}" for t in tables if t in schemas)
    return "\n".join(f"- {t}: {schemas[t]}" for t in schemas)


def find_relevant_tables(query: str, top_n: int = 5) -> list[str]:
    from core.embedding import get_index

    idx = get_index()
    if idx:
        results = idx.search_with_keys(query, list(TABLE_SCHEMAS.keys()), top_n=top_n)
        return [key for key, _ in results]
    return list(TABLE_SCHEMAS.keys())[:top_n]
