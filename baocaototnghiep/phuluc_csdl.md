## Phụ lục: Chi tiết cấu trúc 37 bảng dữ liệu đang sử dụng

### 1. answers
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| question_id | bigint | FK | Liên kết câu hỏi |
| answer_text | text | | Nội dung đáp án |
| alternative_answers | text | | Đáp án thay thế (JSON) |
| blank_index | int | | Vị trí trong câu điền |
| is_case_sensitive | bit | | Phân biệt hoa thường |
| is_sample | bit | | Có phải bài mẫu |
| word_limit | varchar(50) | | Giới hạn từ |
| created_at | datetime | | Thời gian tạo |
| updated_at | datetime | | Cập nhật |

### 2. assignment_submissions
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| assignment_id | bigint | FK | Bài tập |
| user_id | bigint | FK | Học viên nộp |
| exam_attempt_id | bigint | FK | Bài thi liên quan |
| attempt_number | int | | Lần nộp thứ mấy |
| submission_text | text | | Nội dung nộp |
| attachment_url | varchar(500) | | File đính kèm |
| score | double | | Điểm |
| feedback | text | | Nhận xét |
| status | varchar(20) | | Trạng thái |
| submitted_at | datetime | | Thời gian nộp |
| graded_at | datetime | | Thời gian chấm |
| graded_by | bigint | FK | Giáo viên chấm |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 3. assignments
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| class_id | bigint | FK | Lớp học |
| created_by | bigint | FK | Giáo viên tạo |
| test_id | bigint | FK | Đề thi liên quan |
| title | varchar(200) | | Tiêu đề |
| description | text | | Mô tả |
| assignment_type | varchar(30) | | Loại (TEST/MANUAL) |
| max_score | double | | Điểm tối đa |
| max_attempts | int | | Số lần nộp tối đa |
| due_date | datetime | | Hạn nộp |
| allow_late_submission | tinyint(1) | | Cho phép nộp muộn |
| status | varchar(255) | | Trạng thái |
| is_active | bit | | Còn hoạt động |
| is_required | bit | | Bắt buộc |
| attachment_url | varchar(500) | | File đính kèm |
| notes | text | | Ghi chú |
| assigned_at | datetime | | Ngày giao |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 4. attempt_answers
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| exam_attempt_id | bigint | FK | Bài làm |
| question_id | bigint | FK | Câu hỏi |
| selected_option_label | text | | Đáp án chọn (A/B/C/D) |
| text_answer | text | | Câu trả lời dạng text |
| matching_answer | text | | Câu trả lời dạng nối (JSON) |
| is_answered | bit | | Đã trả lời |
| is_correct | bit | | Đúng/sai |
| points_earned | double | | Điểm đạt được |
| is_flagged | bit | | Đánh dấu xem lại |
| correction_note | text | | Ghi chú sửa lỗi |
| answered_at | datetime | | Thời gian trả lời |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 5. attempt_question_times
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| exam_attempt_id | bigint | FK | Bài làm |
| question_id | bigint | FK | Câu hỏi |
| time_spent_seconds | int | | Thời gian làm câu hỏi (giây) |
| visit_count | int | | Số lần xem lại |
| first_visit_at | datetime | | Lần đầu truy cập |
| last_visit_at | datetime | | Lần cuối truy cập |
| created_at | datetime | | Tạo lúc |

### 6. attempt_sections
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| exam_attempt_id | bigint | FK | Bài làm |
| part_id | bigint | FK | Phần thi |
| status | varchar(20) | | Trạng thái |
| started_at | datetime | | Bắt đầu |
| completed_at | datetime | | Hoàn thành |
| time_spent_seconds | int | | Thời gian (giây) |
| answered_count | int | | Số câu đã trả lời |
| correct_count | int | | Số câu đúng |
| section_score | double | | Điểm phần |
| order_index | int | | Thứ tự |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 7. blog_posts
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| created_by | bigint | FK | Người tạo |
| category_id | int | FK | Danh mục |
| title | varchar(500) | | Tiêu đề |
| slug | varchar(500) | UNI | Đường dẫn thân thiện |
| content | longtext | | Nội dung bài viết |
| excerpt | text | | Tóm tắt |
| thumbnail | varchar(1000) | | Ảnh đại diện |
| tags | varchar(500) | | Thẻ |
| meta_description | varchar(500) | | Mô tả SEO |
| status | varchar(20) | | Trạng thái (draft/published) |
| source | varchar(20) | | Nguồn (agent/manual) |
| reading_time | int | | Thời gian đọc (phút) |
| published_at | datetime | | Ngày xuất bản |
| deleted_at | datetime | | Ngày xóa mềm |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 8. categories
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | int | PK | Khóa chính |
| name | varchar(100) | | Tên danh mục |
| slug | varchar(100) | UNI | Đường dẫn |
| color | varchar(20) | | Màu sắc |
| icon | varchar(10) | | Icon |
| sort_order | int | | Thứ tự |
| created_at | datetime | | Tạo lúc |

### 9. class_students
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| class_id | bigint | FK | Lớp học |
| user_id | bigint | FK | Học viên |
| status | varchar(20) | | Trạng thái |
| enrolled_at | date | | Ngày nhập học |
| dropped_at | date | | Ngày rời lớp |
| drop_reason | varchar(255) | | Lý do rời lớp |
| final_band_score | double | | Điểm cuối khóa |
| notes | text | | Ghi chú |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 10. class_teachers
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| class_id | bigint | FK | Lớp học |
| user_id | bigint | FK | Giáo viên |
| role | varchar(20) | | Vai trò |
| is_active | bit | | Đang dạy |
| assigned_at | date | | Ngày phân công |
| released_at | date | | Ngày kết thúc |
| notes | text | | Ghi chú |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 11. classes
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| center_id | bigint | FK | Trung tâm |
| code | varchar(30) | UNI | Mã lớp |
| name | varchar(100) | | Tên lớp |
| level | varchar(30) | | Cấp độ |
| target_band | varchar(20) | | Band mục tiêu |
| class_type | varchar(20) | | Loại (OFFLINE/ONLINE/HYBRID) |
| max_students | int | | Sĩ số tối đa |
| start_date | date | | Ngày bắt đầu |
| end_date | date | | Ngày kết thúc |
| schedule | varchar(50) | | Lịch học |
| status | varchar(20) | | Trạng thái |
| room_location | varchar(255) | | Phòng học |
| is_active | bit | | Còn hoạt động |
| notes | text | | Ghi chú |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 12. difficulty_levels
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| name | varchar(50) | UNI | Tên (Beginner→Advanced) |
| level | int | UNI | Cấp (1-5) |
| band_range | varchar(10) | | Khoảng band (1-3, ..., 7.5-9) |
| color_code | varchar(20) | | Mã màu |
| description | varchar(255) | | Mô tả |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 13. exam_attempt_grade_history
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| exam_attempt_id | bigint | FK | Bài làm |
| edited_by_user_id | bigint | FK | Giáo viên sửa |
| edited_by_username | varchar(255) | | Username |
| edited_by_full_name | varchar(255) | | Họ tên |
| editor_role | varchar(20) | | Vai trò |
| old_total_correct | int | | Số câu đúng cũ |
| new_total_correct | int | | Số câu đúng mới |
| old_band_score | float | | Band cũ |
| new_band_score | float | | Band mới |
| old_feedback | text | | Nhận xét cũ |
| new_feedback | text | | Nhận xét mới |
| edit_reason | text | | Lý do sửa |
| edited_at | datetime | | Thời gian sửa |

### 14. exam_attempts
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| user_id | bigint | FK | Học viên |
| session_id | bigint | FK | Kỹ năng |
| test_id | bigint | FK | Đề thi |
| exam_id | bigint | FK | Kỳ thi |
| status | varchar(20) | | Trạng thái |
| started_at | datetime | | Bắt đầu |
| submitted_at | datetime | | Nộp bài |
| graded_at | datetime | | Chấm xong |
| time_limit_seconds | int | | Giới hạn giờ |
| time_spent_seconds | int | | Thời gian đã dùng |
| total_answered | int | | Đã trả lời |
| total_correct | int | | Đúng |
| raw_score | double | | Điểm thô |
| band_score | float | | Band score |
| attempt_number | int | | Lần thử |
| attempt_type | varchar(50) | | Loại |
| feedback | text | | Nhận xét |
| is_active | bit | | Còn hiệu lực |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 15. exams
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_id | bigint | FK | Đề thi |
| class_id | bigint | FK | Lớp |
| created_by | bigint | FK | Người tạo |
| title | varchar(255) | | Tiêu đề |
| description | text | | Mô tả |
| exam_type | enum | | Loại (CLASS/OPEN) |
| status | enum | | Trạng thái |
| duration_minutes | int | | Thời gian |
| scheduled_start_time | datetime | | Dự kiến bắt đầu |
| scheduled_end_time | datetime | | Dự kiến kết thúc |
| started_at | datetime | | Thực tế bắt đầu |
| closed_at | datetime | | Thực tế kết thúc |
| password | varchar(255) | | Mật khẩu |
| max_attempts | int | | Số lần tối đa |
| late_entry_minutes | int | | Cho phép vào muộn |
| allow_review_after_submit | bit | | Cho xem lại sau nộp |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 16. full_test_progress
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| user_id | bigint | FK | Học viên |
| test_id | bigint | FK | Bài thi |
| status | varchar(20) | | Trạng thái |
| current_section | int | | Phần hiện tại |
| current_skill | varchar(32) | | Kỹ năng hiện tại |
| current_part_index | int | | Part hiện tại |
| progress_percent | int | | % tiến độ |
| mode | varchar(20) | | Chế độ |
| route_path | varchar(255) | | Đường dẫn |
| query_string | varchar(2000) | | Query params |
| session_state_json | text | | Trạng thái session (JSON) |
| snapshot_json | text | | Snapshot toàn bộ (JSON) |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 17. guest_exam_attempts
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| full_name | varchar(100) | | Họ tên khách |
| email | varchar(100) | MUL | Email |
| phone | varchar(20) | | Số điện thoại |
| test_id | bigint | FK | Đề thi |
| session_id | bigint | FK | Kỹ năng |
| status | varchar(20) | | Trạng thái |
| started_at | datetime | | Bắt đầu |
| submitted_at | datetime | | Nộp bài |
| time_limit_seconds | int | | Giới hạn giờ |
| time_spent_seconds | int | | Thời gian dùng |
| total_answered | int | | Đã trả lời |
| total_correct | int | | Đúng |
| raw_score | double | | Điểm thô |
| band_score | float | | Band |
| attempt_type | varchar(50) | | Loại |
| answers_json | text | | Câu trả lời (JSON) |
| created_at | datetime | | Tạo lúc |

### 18. parts (Master data)
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| session_id | bigint | FK | Kỹ năng |
| difficulty_level_id | bigint | FK | Độ khó |
| name | varchar(100) | | Tên (Part 1, Passage 1...) |
| order_index | int | | Thứ tự |
| description | varchar(500) | | Mô tả |
| instructions | text | | Hướng dẫn |
| duration_minutes | int | | Thời gian |
| total_questions | int | | Số câu hỏi |
| score_weight | double | | Tỉ trọng điểm |
| question_format | varchar(100) | | Định dạng câu hỏi |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 19. question_groups
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| part_id | bigint | FK | Phần thi |
| question_type_id | bigint | FK | Loại câu hỏi |
| title | varchar(500) | | Tiêu đề nhóm |
| instructions | text | | Hướng dẫn |
| part_introduction | text | | Giới thiệu phần |
| content_type | varchar(50) | | Kiểu nội dung |
| passage_text | longtext | | Bài đọc/transcript |
| audio_url | varchar(500) | | URL audio |
| audio_play_count | int | | Số lần phát |
| image_url | longtext | | URL hình ảnh |
| image_width | int | | Kích thước ảnh (%) |
| resource_url | varchar(500) | | URL tài nguyên |
| from_question | int | | Câu bắt đầu |
| to_question | int | | Câu kết thúc |
| order_index | int | | Thứ tự |
| is_active | bit | | Còn dùng |
| allow_option_reuse | tinyint(1) | | Cho phép dùng lại đáp án |
| use_shared_options | bit | | Dùng chung đáp án |
| shared_options_json | longtext | | Đáp án chung (JSON) |
| hide_options_table | bit | | Ẩn bảng đáp án |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 20. question_options
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| question_id | bigint | FK | Câu hỏi |
| option_label | varchar(20) | | Nhãn (A/B/C/D) |
| option_text | text | | Nội dung lựa chọn |
| image_url | varchar(500) | | Hình ảnh cho option |
| is_correct | bit | | Là đáp án đúng |
| order_index | int | | Thứ tự |
| created_at | datetime | | Tạo lúc |

### 21. question_types (Master data)
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| code | varchar(50) | UNI | Mã (MCQ, TFNG...) |
| display_name | varchar(100) | | Tên hiển thị |
| description | text | | Mô tả |
| instructions | text | | Hướng dẫn |
| applicable_skills | varchar(20) | | Kỹ năng áp dụng |
| has_options | bit | | Có đáp án chọn |
| has_text_answer | bit | | Có nhập text |
| has_matching | bit | | Có dạng nối |
| order_index | int | | Thứ tự |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 22. questions
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| question_group_id | bigint | FK | Nhóm câu hỏi |
| question_type_id | bigint | FK | Loại câu hỏi |
| question_number | int | | Số thứ tự |
| question_count | int | | Số câu con |
| group_instruction | varchar(255) | | Hướng dẫn nhóm |
| question_text | text | | Nội dung câu hỏi |
| question_section | varchar(20) | | Vị trí (top/image/bottom) |
| blank_context | text | | Ngữ cảnh chỗ trống |
| pinx | double | | Tọa độ X trên ảnh |
| piny | double | | Tọa độ Y trên ảnh |
| image_url | varchar(500) | | Ảnh minh họa |
| points | double | | Điểm |
| order_index | int | | Thứ tự trong group |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 23. roles (Master data)
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| name | varchar(50) | UNI | GUEST/STUDENT/TEACHER/MANAGER/ADMIN |
| description | varchar(255) | | Mô tả |
| created_at | datetime | | Tạo lúc |

### 24. sessions (Master data)
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| name | varchar(100) | | Tên kỹ năng |
| skill_type | enum | | LISTENING/READING/WRITING/SPEAKING |
| test_type | enum | | ACADEMIC/GENERAL |
| description | varchar(500) | | Mô tả |
| duration_minutes | int | | Thời gian làm bài |
| total_questions | int | | Tổng số câu |
| max_score | double | | Điểm tối đa |
| order_index | int | | Thứ tự |
| instructions | text | | Hướng dẫn |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 25. speaking_generated_questions
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| speaking_attempt_id | bigint | FK | Bài nói |
| part | varchar(30) | | Part 1/2/3 |
| question_index | int | | Thứ tự câu hỏi |
| question_text | text | | Nội dung câu hỏi |
| frame_name | text | | Tên frame |
| combo_title | text | | Tên combo |
| created_at | datetime | | Tạo lúc |

### 26. student_profiles
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| user_id | bigint | UNI | Người dùng |
| student_code | varchar(50) | | Mã học viên |
| date_of_birth | date | | Ngày sinh |
| gender | varchar(10) | | Giới tính |
| address | varchar(500) | | Địa chỉ |
| city | varchar(100) | | Thành phố |
| country | varchar(100) | | Quốc gia |
| current_level | varchar(20) | | Trình độ hiện tại |
| target_band | varchar(10) | | Band mục tiêu |
| enrollment_date | date | | Ngày nhập học |
| learning_goal | varchar(50) | | Mục tiêu học tập |
| emergency_contact | varchar(15) | | SĐT khẩn cấp |
| emergency_contact_name | varchar(100) | | Người liên hệ khẩn |
| notes | text | | Ghi chú |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 27. student_writing_submissions
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| user_id | bigint | FK | Học viên |
| writing_prompt_id | bigint | FK | Đề bài |
| question_group_id | bigint | FK | Nhóm câu hỏi |
| exam_attempt_id | bigint | FK | Bài thi |
| graded_by | bigint | FK | Giáo viên chấm |
| submission_text | longtext | | Nội dung bài viết |
| word_count | int | | Số từ |
| time_taken_seconds | int | | Thời gian làm bài |
| status | varchar(20) | | Trạng thái |
| overall_band_score | double | | Band tổng |
| overall_feedback | text | | Nhận xét |
| attempt_number | int | | Lần nộp |
| submitted_at | datetime | | Nộp lúc |
| graded_at | datetime | | Chấm lúc |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 28. test_parts
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_session_id | bigint | FK | Session trong đề |
| part_id | bigint | FK | Part master |
| media_file_id | bigint | FK | File media |
| passage_content_id | bigint | FK | Nội dung passage |
| source_test_id | bigint | | Đề nguồn (khi trộn) |
| source_test_title | varchar(500) | | Tên đề nguồn |
| order_index | int | | Thứ tự |
| is_included | bit | | Có bao gồm |
| question_count | int | | Số câu hỏi |
| duration_minutes | int | | Thời gian |
| custom_name | varchar(200) | | Tên tùy chỉnh |
| custom_instructions | text | | Hướng dẫn tùy chỉnh |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 29. test_question_groups
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_part_id | bigint | FK | Test part |
| question_group_id | bigint | FK | Question group |
| order_index | int | | Thứ tự |
| is_random_order | bit | | Xáo trộn câu hỏi |
| question_from | int | | Câu bắt đầu |
| question_to | int | | Câu kết thúc |
| custom_title | varchar(255) | | Tiêu đề tùy chỉnh |
| custom_instructions | text | | Hướng dẫn tùy chỉnh |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 30. test_sessions
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_id | bigint | FK | Đề thi |
| session_id | bigint | FK | Session master |
| order_index | int | | Thứ tự |
| is_included | bit | | Bao gồm |
| duration_minutes | int | | Thời gian |
| instructions | varchar(255) | | Hướng dẫn |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 31. test_settings
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_id | bigint | UNI | Đề thi |
| use_default_duration | bit | | Dùng thời gian mặc định |
| show_timer | bit | | Hiện timer |
| allow_pause | bit | | Cho phép tạm dừng |
| randomize_questions | bit | | Xáo trộn câu hỏi |
| randomize_sessions | bit | | Xáo trộn session |
| randomize_options | bit | | Xáo trộn đáp án |
| allow_skip | bit | | Bỏ qua câu hỏi |
| allow_go_back | bit | | Quay lại câu trước |
| allow_review | bit | | Xem lại sau nộp |
| show_progress_bar | bit | | Hiện thanh tiến độ |
| show_result_immediately | bit | | Hiện kết quả ngay |
| show_correct_answers | bit | | Hiện đáp án đúng |
| show_explanation | bit | | Hiện giải thích |
| show_band_score | bit | | Hiện band score |
| show_question_number | bit | | Hiện số câu hỏi |
| max_attempts | int | | Số lần tối đa |
| cooldown_minutes | int | | Thời gian chờ giữa các lần |
| available_from | datetime | | Có hiệu lực từ |
| available_to | datetime | | Đến |
| require_camera | bit | | Yêu cầu camera |
| require_full_screen | bit | | Yêu cầu full screen |
| detect_tab_switch | bit | | Phát hiện chuyển tab |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 32. test_share_links
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_id | bigint | FK | Đề thi |
| created_by | bigint | FK | Người tạo |
| skill_type | enum | | Kỹ năng |
| token | varchar(255) | | Token duy nhất |
| is_active | bit | | Còn hiệu lực |
| refreshed_at | datetime | | Làm mới lúc |
| created_at | datetime | | Tạo lúc |

### 33. test_versions
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| test_id | bigint | FK | Đề thi |
| version_number | int | | Số phiên bản |
| snapshot_json | longtext | | Snapshot (JSON) |
| question_count | int | | Số câu hỏi |
| created_by_id | bigint | FK | Người tạo |
| created_at | datetime | | Tạo lúc |

### 34. tests
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| created_by | bigint | FK | Người tạo |
| reviewed_by | bigint | FK | Người duyệt |
| thumbnail_media_id | bigint | FK | Ảnh đại diện |
| title | varchar(255) | | Tiêu đề |
| description | varchar(500) | | Mô tả |
| test_type | enum | | ACADEMIC/GENERAL |
| status | varchar(20) | | DRAFT→PUBLISHED→DELETED |
| is_full_test | bit | | Full test 4 kỹ năng |
| duration_minutes | int | | Thời gian |
| target_band | varchar(50) | | Band mục tiêu |
| series_label | varchar(50) | | Nhãn series |
| logo_url | longtext | | Logo |
| attempt_count | int | | Số lượt thi |
| average_score | double | | Điểm trung bình |
| published_at | datetime | | Ngày xuất bản |
| reviewed_at | datetime | | Ngày duyệt |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 35. user_roles
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| user_id | bigint | PK, FK | Người dùng |
| role_id | bigint | PK, FK | Vai trò |

### 36. users
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| username | varchar(50) | UNI | Tên đăng nhập |
| email | varchar(100) | UNI | Email |
| password | varchar(255) | | Mật khẩu (BCrypt) |
| full_name | varchar(100) | | Họ tên |
| phone_number | varchar(15) | | Số điện thoại |
| avatar | varchar(255) | | Ảnh đại diện |
| is_active | bit | | Kích hoạt |
| last_login | datetime | | Đăng nhập cuối |
| deleted_at | datetime | | Xóa mềm |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 37. writing_prompts
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| writing_task_id | bigint | FK | Writing task |
| difficulty_level_id | bigint | FK | Độ khó |
| title | varchar(200) | | Tiêu đề |
| prompt_text | longtext | | Nội dung đề bài |
| image_url | varchar(500) | | Ảnh kèm (biểu đồ) |
| chart_type | varchar(50) | | Loại biểu đồ |
| topic | varchar(50) | | Chủ đề |
| essay_type | varchar(30) | | Loại essay |
| order_index | int | | Thứ tự |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 38. writing_scoring_criteria
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| writing_task_id | bigint | FK | Writing task |
| code | varchar(30) | | TA/CC/LR/GRA |
| display_name | varchar(100) | | Tên hiển thị |
| description | text | | Mô tả |
| weight | double | | Trọng số |
| max_score | double | | Điểm tối đa |
| band_descriptors | text | | Mô tả band (JSON) |
| order_index | int | | Thứ tự |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 39. writing_sample_answers
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| writing_prompt_id | bigint | FK | Đề bài |
| created_by | bigint | FK | Người tạo |
| band_score | double | | Band score |
| answer_text | longtext | | Bài mẫu |
| word_count | int | | Số từ |
| annotation | text | | Chú thích |
| vocabulary_highlights | text | | Từ vựng nổi bật |
| structure_notes | text | | Ghi chú cấu trúc |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |

### 40. writing_submission_grade_history
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| writing_submission_id | bigint | FK | Bài nộp |
| edited_by_user_id | bigint | FK | Giáo viên |
| edited_by_username | varchar(255) | | Username |
| edited_by_full_name | varchar(255) | | Họ tên |
| editor_role | varchar(20) | | Vai trò |
| old_band_score | decimal(3,1) | | Band cũ |
| new_band_score | decimal(3,1) | | Band mới |
| old_feedback | text | | Feedback cũ |
| new_feedback | text | | Feedback mới |
| edit_reason | text | | Lý do chỉnh sửa |
| edited_at | datetime | | Thời gian sửa |

### 41. writing_tasks
| Field | Type | Key | Mô tả |
|-------|------|-----|-------|
| id | bigint | PK | Khóa chính |
| code | varchar(50) | UNI | Mã (TASK1_ACADEMIC, TASK1_GENERAL, TASK2) |
| display_name | varchar(100) | | Tên hiển thị |
| description | text | | Mô tả |
| instructions | text | | Hướng dẫn |
| min_words | int | | Số từ tối thiểu |
| recommended_words | int | | Số từ khuyến nghị |
| duration_minutes | int | | Thời gian |
| score_weight | double | | Trọng số điểm |
| order_index | int | | Thứ tự |
| is_active | bit | | Còn dùng |
| created_at | datetime | | Tạo lúc |
| updated_at | datetime | | Cập nhật |
