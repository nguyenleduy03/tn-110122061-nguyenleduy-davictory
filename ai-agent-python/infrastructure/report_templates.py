REPORT_TEMPLATES = [
    # ─── TỔNG QUAN ───────────────────────
    {
        "id": "tong_quan_tuan",
        "category": "tong_quan",
        "period": "week",
        "title": "Báo cáo tổng quan tuần",
        "description": "Đánh giá nhanh hoạt động trung tâm trong tuần: học viên, lớp học, doanh thu",
        "icon": "\U0001f4ca",
        "sections": [
            {
                "heading": "Tổng quan hoạt động",
                "description": "Tổng quan các chỉ số KPI chính trong tuần",
                "data_hints": [
                    {"tool": "GetCenterStats", "params": {"period": "week"}},
                    {"tool": "GetPeriodStats", "params": {"period": "week"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Chỉ số KPI chính",
                        "data_source": {
                            "tool": "GetCenterStats",
                            "fields": [
                                {"label": "Người dùng", "key": "total_users", "max": 100},
                                {"label": "Lớp học", "key": "total_classes", "max": 20},
                                {"label": "Bài kiểm tra", "key": "total_tests", "max": 100},
                                {"label": "Bài nộp", "key": "total_submissions", "max": 50},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TỔNG QUAN HOẠT ĐỘNG cho báo cáo {period_label} ({date_range}).\n\n"
                    "Dữ liệu thống kê:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Viết 3-5 câu tóm tắt tổng quan trung tâm trong kỳ\n"
                    "- Nêu bật: số học viên, lớp học, lượt thi, điểm TB, tỉ lệ hoàn thành\n"
                    "- So sánh tăng/giảm so với kỳ trước nếu có số liệu\n"
                    "- Viết bằng tiếng Việt, chuyên nghiệp\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên, KHÔNG bịa số"
                ),
            },
            {
                "heading": "Kết quả đạt được",
                "description": "Phân tích chi tiết kết quả trong kỳ",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "week"}},
                    {"tool": "GetRevenueData", "params": {"period": "7d"}},
                ],
                "charts": [
                    {
                        "type": "donut",
                        "title": "Tỉ lệ hoàn thành",
                        "data_source": {
                            "tool": "GetPeriodStats",
                            "fields": [
                                {"label": "Hoàn thành", "key": "completed_attempts"},
                                {"label": "Chưa HT", "key": "completed_attempts", "complement_of": "total_exam_attempts"},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần KẾT QUẢ ĐẠT ĐƯỢC cho báo cáo {period_label} ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích chi tiết 5-7 câu\n"
                    "- Nêu số học viên mới, lượt thi, học viên active\n"
                    "- Điểm TB band, tỉ lệ hoàn thành\n"
                    "- Chỉ ra điểm nổi bật nhất trong kỳ\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Kế hoạch tuần tới",
                "description": "Đề xuất kế hoạch cho tuần tiếp theo",
                "data_hints": [],
                "charts": [],
                "llm_prompt": (
                    "Viết phần KẾ HOẠCH {period_label_upper} TỚI cho báo cáo.\n\n"
                    "Dữ liệu kỳ này:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Dựa vào dữ liệu kỳ này, đề xuất 4-5 mục tiêu cho {period_label} tới\n"
                    "- Mỗi mục tiêu: mô tả cụ thể, chỉ số đo lường\n"
                    "- Ưu tiên cải thiện điểm yếu từ dữ liệu\n"
                    "- Viết bằng tiếng Việt, chuyên nghiệp"
                ),
            },
        ]
    },
    {
        "id": "tong_quan_thang",
        "category": "tong_quan",
        "period": "month",
        "title": "Báo cáo tổng quan tháng",
        "description": "Đánh giá toàn diện hoạt động trung tâm trong tháng",
        "icon": "\U0001f4c8",
        "sections": [
            {
                "heading": "Tổng quan tháng",
                "description": "Tổng quan các chỉ số KPI chính trong tháng",
                "data_hints": [
                    {"tool": "GetCenterStats", "params": {"period": "month"}},
                    {"tool": "GetPeriodStats", "params": {"period": "month"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Chỉ số KPI tháng",
                        "data_source": {
                            "tool": "GetPeriodStats",
                            "fields": [
                                {"label": "HV mới", "key": "new_users", "max": 50},
                                {"label": "Lượt thi", "key": "total_exam_attempts", "max": 200},
                                {"label": "HV unique", "key": "unique_students", "max": 100},
                                {"label": "Tỉ lệ HT", "key": "completion_rate", "max": 100},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TỔNG QUAN THÁNG cho báo cáo tháng ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Viết 4-6 câu tổng quan tình hình tháng\n"
                    "- Nêu bật: học viên, lượt thi, điểm TB, tỉ lệ hoàn thành\n"
                    "- Nhận xét xu hướng so với tháng trước\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Phân tích chi tiết",
                "description": "Phân tích sâu từng lĩnh vực",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "month"}},
                    {"tool": "GetRevenueData", "params": {"period": "30d"}},
                    {"tool": "GetWritingStats", "params": {"period": "month"}},
                    {"tool": "GetSpeakingStats", "params": {"period": "month"}},
                ],
                "charts": [],
                "llm_prompt": (
                    "Viết phần PHÂN TÍCH CHI TIẾT cho báo cáo tháng ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích sâu 7-10 câu\n"
                    "- Chia làm các mục: Học viên, Giảng dạy, Writing, Speaking\n"
                    "- Mỗi mục: số liệu + nhận xét\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Xu hướng",
                "description": "Phân tích xu hướng trong kỳ",
                "data_hints": [
                    {"tool": "GetClassScores", "params": {"period": "month"}},
                    {"tool": "GetStudentScores", "params": {"period": "month"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Điểm TB theo lớp",
                        "data_source": {
                            "tool": "GetClassScores",
                            "source_key": "classes",
                            "label_key": "name",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần XU HƯỚNG THÁNG cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích xu hướng 5-7 câu\n"
                    "- So sánh điểm giữa các lớp\n"
                    "- Nhận xét học sinh nổi bật\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },
    {
        "id": "tong_quan_quy",
        "category": "tong_quan",
        "period": "quarter",
        "title": "Báo cáo tổng quan quý II/2026",
        "description": "Đánh giá toàn bộ hoạt động quý, so sánh với cùng kỳ năm trước",
        "icon": "\U0001f4c9",
        "sections": [
            {
                "heading": "Tổng quan quý",
                "description": "Tổng quan các chỉ số KPI chính trong quý",
                "data_hints": [
                    {"tool": "GetCenterStats", "params": {"period": "quarter"}},
                    {"tool": "GetPeriodStats", "params": {"period": "quarter"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Chỉ số KPI quý",
                        "data_source": {
                            "tool": "GetPeriodStats",
                            "fields": [
                                {"label": "HV mới", "key": "new_users", "max": 100},
                                {"label": "Lượt thi", "key": "total_exam_attempts", "max": 300},
                                {"label": "Điểm TB", "key": "avg_band_score", "max": 9},
                                {"label": "HT", "key": "completion_rate", "max": 100},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TỔNG QUAN QUÝ cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Viết 5-7 câu tổng quan quý\n"
                    "- Nêu bật: học viên, doanh thu, điểm số\n"
                    "- So sánh với quý trước nếu có số\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "So sánh cùng kỳ",
                "description": "So sánh với quý cùng kỳ năm trước",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "quarter"}},
                ],
                "charts": [
                    {
                        "type": "donut",
                        "title": "Cơ cấu hoạt động",
                        "data_source": {
                            "tool": "GetPeriodStats",
                            "fields": [
                                {"label": "Lượt thi", "key": "total_exam_attempts"},
                                {"label": "HV mới", "key": "new_users"},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần SO SÁNH CÙNG KỲ cho báo cáo quý ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích 5-7 câu về tăng trưởng\n"
                    "- So sánh các chỉ số với nhau\n"
                    "- Nhận xét về xu hướng phát triển\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Định hướng quý tới",
                "description": "Đề xuất mục tiêu cho quý tiếp theo",
                "data_hints": [],
                "charts": [],
                "llm_prompt": (
                    "Viết phần ĐỊNH HƯỚNG QUÝ TỚI.\n\n"
                    "Dữ liệu quý này:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Đề xuất 4-5 mục tiêu chiến lược\n"
                    "- Mỗi mục tiêu: mô tả + chỉ số đo lường\n"
                    "- Dựa trên điểm yếu từ dữ liệu quý này\n"
                    "- Viết bằng tiếng Việt, chuyên nghiệp"
                ),
            },
        ]
    },
    {
        "id": "tong_quan_nam",
        "category": "tong_quan",
        "period": "year",
        "title": "Báo cáo tổng quan năm 2026",
        "description": "Đánh giá toàn diện hoạt động năm 2026 tại DAVictory",
        "icon": "\U0001f3c6",
        "sections": [
            {
                "heading": "Tổng quan năm",
                "description": "Tổng quan các chỉ số KPI cả năm",
                "data_hints": [
                    {"tool": "GetCenterStats", "params": {"period": "year"}},
                    {"tool": "GetPeriodStats", "params": {"period": "year"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Thống kê cả năm",
                        "data_source": {
                            "tool": "GetCenterStats",
                            "fields": [
                                {"label": "Người dùng", "key": "total_users", "max": 500},
                                {"label": "Lớp học", "key": "total_classes", "max": 30},
                                {"label": "Bài KT", "key": "total_tests", "max": 300},
                                {"label": "Bài nộp", "key": "total_submissions", "max": 200},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TỔNG QUAN NĂM cho báo cáo năm ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Viết 5-7 câu tổng quan cả năm\n"
                    "- Nêu bật thành tựu chính: học viên, lớp học, đề thi\n"
                    "- Nhận xét tổng thể về sự phát triển\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Thành tựu nổi bật",
                "description": "Điểm lại các cột mốc quan trọng trong năm",
                "data_hints": [
                    {"tool": "GetTeacherProductivity", "params": {}},
                    {"tool": "GetTestTypeStats", "params": {"period": "year"}},
                ],
                "charts": [
                    {
                        "type": "donut",
                        "title": "Cơ cấu đề thi",
                        "data_source": {
                            "tool": "GetTestTypeStats",
                            "fields": [
                                {"label": "Full test", "key": "full_tests"},
                                {"label": "Single skill", "key": "single_skill_tests"},
                            ]
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần THÀNH TỰU NỔI BẬT cho báo cáo năm ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích 5-7 câu về thành tựu\n"
                    "- Nêu về giảng viên, đề thi đã tạo\n"
                    "- Cơ cấu đề thi full test vs single skill\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },

    # ─── HỌC TẬP ────────────────────────
    {
        "id": "hoc_tap_tuan",
        "category": "hoc_tap",
        "period": "week",
        "title": "Báo cáo tình hình học tập tuần",
        "description": "Theo dõi tiến độ học tập, chuyên cần và kết quả kiểm tra trong tuần",
        "icon": "\U0001f4da",
        "sections": [
            {
                "heading": "Tình hình học tập trong tuần",
                "description": "Tổng quan tình hình học tập các lớp",
                "data_hints": [
                    {"tool": "GetCenterStats", "params": {"period": "week"}},
                    {"tool": "GetPeriodStats", "params": {"period": "week"}},
                    {"tool": "GetExamScores", "params": {"period": "week"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Lượt thi trong tuần",
                        "data_source": {
                            "tool": "GetExamScores",
                            "source_key": "exams",
                            "label_key": "title",
                            "value_key": "total_attempts",
                            "max_key": "total_attempts",
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TÌNH HÌNH HỌC TẬP TRONG {period_label_upper} cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Tổng quan 3-5 câu về tình hình tuần\n"
                    "- Nêu số lớp, số học viên, lượt thi\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Kết quả kiểm tra",
                "description": "Phân tích kết quả kiểm tra trong kỳ",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "week"}},
                    {"tool": "GetClassScores", "params": {"period": "week"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Điểm TB theo lớp",
                        "data_source": {
                            "tool": "GetClassScores",
                            "source_key": "classes",
                            "label_key": "name",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần KẾT QUẢ KIỂM TRA cho báo cáo {period_label} ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích 5-7 câu về kết quả\n"
                    "- So sánh điểm TB giữa các lớp\n"
                    "- Nhận xét về tỉ lệ hoàn thành\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },
    {
        "id": "hoc_tap_thang",
        "category": "hoc_tap",
        "period": "month",
        "title": "Báo cáo tình hình học tập tháng",
        "description": "Phân tích chi tiết kết quả học tập, tiến bộ của học viên trong tháng",
        "icon": "\U0001f393",
        "sections": [
            {
                "heading": "Đánh giá học tập tháng",
                "description": "Đánh giá tổng thể kết quả học tập trong tháng",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "month"}},
                    {"tool": "GetStudentScores", "params": {"period": "month"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Điểm sinh viên",
                        "data_source": {
                            "tool": "GetStudentScores",
                            "source_key": "students",
                            "label_key": "full_name",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần ĐÁNH GIÁ HỌC TẬP THÁNG cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích 5-7 câu về kết quả học tập\n"
                    "- Điểm TB, số lượt thi, học viên nổi bật\n"
                    "- So sánh với tháng trước\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Kết quả thi thử",
                "description": "Phân tích kết quả thi thử của học viên",
                "data_hints": [
                    {"tool": "GetExamScores", "params": {"period": "month"}},
                    {"tool": "GetWritingStats", "params": {"period": "month"}},
                    {"tool": "GetSpeakingStats", "params": {"period": "month"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Kỳ thi trong tháng",
                        "data_source": {
                            "tool": "GetExamScores",
                            "source_key": "exams",
                            "label_key": "title",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần KẾT QUẢ THI THỬ cho báo cáo tháng ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích 5-7 câu\n"
                    "- Nêu điểm TB các kỳ thi, điểm Writing, Speaking\n"
                    "- So sánh và nhận xét\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },
    {
        "id": "hoc_tap_quy",
        "category": "hoc_tap",
        "period": "quarter",
        "title": "Báo cáo học tập quý II/2026",
        "description": "Đánh giá tổng thể kết quả học tập trong quý",
        "icon": "\U0001f4d6",
        "sections": [
            {
                "heading": "Tổng kết học tập quý",
                "description": "Đánh giá tổng thể kết quả học tập trong quý",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "quarter"}},
                    {"tool": "GetStudentScores", "params": {"period": "quarter"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Phân bố điểm",
                        "data_source": {
                            "tool": "GetStudentScores",
                            "source_key": "students",
                            "label_key": "full_name",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TỔNG KẾT HỌC TẬP QUÝ cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Tổng kết 5-7 câu\n"
                    "- Học viên, điểm TB, học viên xuất sắc\n"
                    "- Xu hướng trong quý\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },

    # ─── THI CỬ ─────────────────────────
    {
        "id": "thi_cu_thang",
        "category": "thi_cu",
        "period": "month",
        "title": "Báo cáo kết quả thi cử tháng",
        "description": "Tổng hợp kết quả thi thử và thi thật của học viên",
        "icon": "\U0001f4dd",
        "sections": [
            {
                "heading": "Kết quả thi tháng",
                "description": "Tổng quan kết quả thi các loại",
                "data_hints": [
                    {"tool": "GetExamScores", "params": {"period": "month"}},
                    {"tool": "GetTestTypeStats", "params": {"period": "month"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Kết quả thi theo loại",
                        "data_source": {
                            "tool": "GetExamScores",
                            "source_key": "exams",
                            "label_key": "title",
                            "value_key": "total_attempts",
                            "max_key": "total_attempts",
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần KẾT QUẢ THI THÁNG cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Tổng quan 3-5 câu\n"
                    "- Nêu các kỳ thi, lượt thi, điểm TB\n"
                    "- Cơ cấu đề thi full vs single skill\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Phân tích chi tiết",
                "description": "Phân tích kết quả từng kỳ thi",
                "data_hints": [
                    {"tool": "GetExamScores", "params": {"period": "month"}},
                    {"tool": "GetStudentScores", "params": {"period": "month"}},
                ],
                "charts": [
                    {
                        "type": "donut",
                        "title": "Phân bố điểm",
                        "data_source": {
                            "tool": "GetStudentScores",
                            "source_key": "students",
                            "label_key": "full_name",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần PHÂN TÍCH CHI TIẾT cho báo cáo thi tháng ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích chi tiết 5-7 câu\n"
                    "- Điểm TB từng kỳ thi, học sinh đạt điểm cao\n"
                    "- Nhận xét chất lượng thi\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },
    {
        "id": "thi_cu_quy",
        "category": "thi_cu",
        "period": "quarter",
        "title": "Báo cáo kết quả thi cử quý II/2026",
        "description": "Phân tích toàn diện kết quả thi thật và thi thử trong quý",
        "icon": "\U0001f3af",
        "sections": [
            {
                "heading": "Tổng kết thi cử quý",
                "description": "Tổng quan kết quả thi trong quý",
                "data_hints": [
                    {"tool": "GetExamScores", "params": {"period": "quarter"}},
                    {"tool": "GetTestTypeStats", "params": {"period": "quarter"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Kết quả thi quý",
                        "data_source": {
                            "tool": "GetExamScores",
                            "source_key": "exams",
                            "label_key": "title",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần TỔNG KẾT THI CỬ QUÝ cho báo cáo ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Tổng quan 4-6 câu\n"
                    "- Kết quả các kỳ thi, điểm TB, số lượt thi\n"
                    "- Cơ cấu đề thi\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
            {
                "heading": "Thống kê tổng hợp",
                "description": "Thống kê chi tiết các chỉ số thi cử",
                "data_hints": [
                    {"tool": "GetPeriodStats", "params": {"period": "quarter"}},
                    {"tool": "GetStudentScores", "params": {"period": "quarter"}},
                ],
                "charts": [
                    {
                        "type": "bar",
                        "title": "Điểm sinh viên",
                        "data_source": {
                            "tool": "GetStudentScores",
                            "source_key": "students",
                            "label_key": "full_name",
                            "value_key": "avg_band",
                            "max": 9
                        }
                    }
                ],
                "llm_prompt": (
                    "Viết phần THỐNG KÊ TỔNG HỢP cho báo cáo thi quý ({date_range}).\n\n"
                    "Dữ liệu:\n{data}\n\n"
                    "Yêu cầu:\n"
                    "- Phân tích sâu 5-7 câu\n"
                    "- Số học viên, lượt thi, điểm TB, tỉ lệ HT\n"
                    "- Học viên xuất sắc, điểm cao nhất\n"
                    "- CHỈ dùng số liệu từ dữ liệu trên"
                ),
            },
        ]
    },
]
