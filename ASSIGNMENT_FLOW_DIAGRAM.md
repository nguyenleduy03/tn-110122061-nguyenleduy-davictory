# 📊 SƠ ĐỒ LUỒNG BÀI TẬP (ASSIGNMENT FLOW)

## 🎯 TỔNG QUAN HỆ THỐNG

Hệ thống bài tập DAVictory cho phép giáo viên giao bài tập từ ngân hàng đề thi và học viên làm bài trực tiếp trên nền tảng.

---

## 📋 LUỒNG CHÍNH

### 1️⃣ GIÁO VIÊN TẠO BÀI TẬP

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Giáo viên vào LMS → Bài tập → Tạo mới                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Điền thông tin:                                          │
│    - Tiêu đề bài tập                                        │
│    - Mô tả                                                  │
│    - Chọn lớp                                               │
│    - Loại bài tập: TEST (từ ngân hàng đề)                  │
│    - Test ID (ID của đề thi Reading/Listening)             │
│    - Hạn nộp (Due Date)                                     │
│    - Điểm tối đa                                            │
│    - Trạng thái: DRAFT / PUBLISHED                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend xử lý:                                           │
│    POST /api/assignments                                    │
│    → AssignmentController.createAssignment()                │
│    → AssignmentService.createAssignment()                   │
│    → Lưu vào bảng assignments                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Bài tập được tạo với status:                             │
│    - DRAFT: Chưa hiển thị cho học viên                      │
│    - PUBLISHED: Học viên có thể thấy và làm bài             │
└─────────────────────────────────────────────────────────────┘
```

**Files liên quan:**
- Frontend: `LmsTeacherAssignments.jsx`, `AssignmentForm.jsx`
- Backend: `AssignmentController.java`, `AssignmentService.java`
- Entity: `Assignment.java`

---

### 2️⃣ HỌC VIÊN XEM BÀI TẬP

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Học viên đăng nhập → Menu → "Bài tập của tôi"           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend gọi API:                                        │
│    GET /api/assignments/student/class/{classId}             │
│    → Lấy tất cả bài tập của các lớp học viên tham gia      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Hiển thị danh sách bài tập với:                          │
│    - Tiêu đề, mô tả                                         │
│    - Hạn nộp                                                │
│    - Trạng thái:                                            │
│      • Chưa nộp (màu vàng)                                  │
│      • Đã nộp (màu xanh)                                    │
│      • Quá hạn (màu đỏ)                                     │
│      • Sắp hết hạn (màu cam)                                │
│    - Nút "Làm bài" (nếu chưa nộp)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Thống kê:                                                │
│    - Tổng bài tập                                           │
│    - Chưa nộp                                               │
│    - Quá hạn                                                │
└─────────────────────────────────────────────────────────────┘
```

**Files liên quan:**
- Frontend: `StudentAssignments.jsx`
- Backend: `AssignmentController.getAssignmentsForStudent()`
- API: `GET /api/assignments/student/class/{classId}`

---

### 3️⃣ HỌC VIÊN LÀM BÀI

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Học viên click "Làm bài"                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Navigate đến:                                            │
│    /test/reading/{testId}?mode=assignment&assignmentId={id} │
│                                                             │
│    Query params:                                            │
│    - mode=assignment (phân biệt với practice/exam)          │
│    - assignmentId={id} (ID của bài tập)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. IeltsReadingTest.jsx detect assignment mode:            │
│    const mode = searchParams.get('mode')                    │
│    const assignmentId = searchParams.get('assignmentId')    │
│    const isAssignmentMode = mode === 'assignment' &&        │
│                             assignmentId                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. UI hiển thị:                                             │
│    - Header: "📝 Bài tập" (thay vì "Luyện tập"/"Thi thử")  │
│    - Đề thi Reading bình thường                             │
│    - Timer (nếu có)                                         │
│    - Câu hỏi và đáp án                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Học viên làm bài và click "Submit"                       │
└─────────────────────────────────────────────────────────────┘
```

**Files liên quan:**
- Frontend: `IeltsReadingTest.jsx` (line 230, 644, 762)
- Logic: Detect `isAssignmentMode` flag

---

### 4️⃣ NỘP BÀI TỰ ĐỘNG

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Học viên click Submit → handleSubmit()                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Lưu kết quả thi vào ExamAttempt:                         │
│    POST /api/exam-attempts/submit                           │
│    → Tạo ExamAttempt với:                                   │
│      - testId                                               │
│      - userId                                               │
│      - answers (câu trả lời)                                │
│      - score (điểm tự động chấm)                            │
│      - completedAt                                          │
│    → Trả về: examAttemptId                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Nếu isAssignmentMode = true:                             │
│    Tự động nộp bài tập:                                     │
│    POST /api/assignments/submit                             │
│    Body: {                                                  │
│      assignmentId: assignmentId,                            │
│      examAttemptId: examAttemptId,                          │
│      submissionText: null,                                  │
│      attachmentUrl: null                                    │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend xử lý:                                           │
│    AssignmentService.submitAssignment()                     │
│    → Kiểm tra:                                              │
│      • Assignment có tồn tại?                               │
│      • Status = PUBLISHED?                                  │
│      • Học viên có trong lớp?                               │
│      • Đã nộp chưa? (nếu đã chấm thì không cho nộp lại)    │
│    → Tạo/Update AssignmentSubmission:                       │
│      • assignmentId                                         │
│      • userId                                               │
│      • examAttemptId (link đến bài thi)                     │
│      • submittedAt = now()                                  │
│      • status = SUBMITTED / LATE (nếu quá hạn)              │
│    → Lưu vào bảng assignment_submissions                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Redirect đến trang kết quả:                              │
│    navigate(`/student/assignments/${assignmentId}/result`)  │
└─────────────────────────────────────────────────────────────┘
```

**Files liên quan:**
- Frontend: `IeltsReadingTest.jsx` (line 630-650)
- Backend: `AssignmentController.submitAssignment()`
- Service: `AssignmentService.submitAssignment()`
- Entity: `AssignmentSubmission.java`

---

### 5️⃣ XEM KẾT QUẢ

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Trang: /student/assignments/{id}/result                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend gọi API:                                        │
│    GET /api/assignments/{id}                                │
│    GET /api/assignments/{id}/my-submission                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Hiển thị:                                                │
│    ✅ Nộp bài thành công!                                   │
│    - Thời gian nộp                                          │
│    - Trạng thái: SUBMITTED / LATE / GRADED                  │
│                                                             │
│    Nếu đã chấm (status = GRADED):                           │
│    - Điểm: X / Y                                            │
│    - Nhận xét của giáo viên                                 │
│                                                             │
│    Nếu chưa chấm:                                           │
│    - "Vui lòng chờ giáo viên chấm điểm"                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Actions:                                                 │
│    - Nút "Xem lại bài làm" (review mode)                    │
│      → /test/reading/{testId}?review=true&                  │
│         attemptId={examAttemptId}                           │
│    - Nút "Quay lại danh sách"                               │
└─────────────────────────────────────────────────────────────┘
```

**Files liên quan:**
- Frontend: `AssignmentResult.jsx`
- Backend: `AssignmentController.getMySubmission()`

---

### 6️⃣ GIÁO VIÊN CHẤM BÀI

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Giáo viên vào LMS → Bài tập → Chi tiết bài tập          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Xem danh sách bài nộp:                                   │
│    GET /api/assignments/{id}/submissions                    │
│    → Hiển thị:                                              │
│      • Tên học viên                                         │
│      • Thời gian nộp                                        │
│      • Trạng thái (SUBMITTED/LATE/GRADED)                   │
│      • Điểm (nếu đã chấm)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Với bài tập TEST (Reading/Listening):                    │
│    - Điểm đã có sẵn từ ExamAttempt (tự động chấm)           │
│    - Giáo viên có thể:                                      │
│      • Xem lại bài làm của học viên                         │
│      • Thêm feedback/nhận xét                               │
│      • Điều chỉnh điểm (nếu cần)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Click "Chấm điểm" → Mở GradeModal:                       │
│    - Nhập điểm (hoặc giữ điểm tự động)                      │
│    - Nhập feedback                                          │
│    - Click "Lưu"                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend xử lý:                                           │
│    POST /api/assignments/grade                              │
│    Body: {                                                  │
│      submissionId: id,                                      │
│      score: score,                                          │
│      feedback: "Nhận xét..."                                │
│    }                                                        │
│    → AssignmentService.gradeSubmission()                    │
│    → Update AssignmentSubmission:                           │
│      • score = score                                        │
│      • feedback = feedback                                  │
│      • status = GRADED                                      │
│      • gradedBy = currentUser                               │
│      • gradedAt = now()                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Học viên thấy điểm và feedback khi vào lại trang kết quả │
└─────────────────────────────────────────────────────────────┘
```

**Files liên quan:**
- Frontend: `LmsAssignmentDetail.jsx`, `GradeModal.jsx`, `SubmissionList.jsx`
- Backend: `AssignmentController.gradeSubmission()`
- Service: `AssignmentService.gradeSubmission()`

---

## 🗄️ CẤU TRÚC DATABASE

### Bảng `assignments`
```sql
CREATE TABLE assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    class_id BIGINT NOT NULL,
    created_by_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_type VARCHAR(50), -- 'TEST', 'ESSAY', 'FILE'
    test_id BIGINT,              -- Link đến bảng tests
    attachment_url VARCHAR(500),
    assigned_at DATETIME,
    due_date DATETIME,
    is_required BOOLEAN DEFAULT TRUE,
    max_score DECIMAL(5,2),
    status VARCHAR(50),          -- 'DRAFT', 'PUBLISHED', 'CLOSED'
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (test_id) REFERENCES tests(id)
);
```

### Bảng `assignment_submissions`
```sql
CREATE TABLE assignment_submissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assignment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    submission_text TEXT,
    attachment_url VARCHAR(500),
    exam_attempt_id BIGINT,      -- Link đến bảng exam_attempts
    submitted_at DATETIME,
    status VARCHAR(50),          -- 'SUBMITTED', 'LATE', 'GRADED'
    score DECIMAL(5,2),
    feedback TEXT,
    graded_by_id BIGINT,
    graded_at DATETIME,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id),
    FOREIGN KEY (graded_by_id) REFERENCES users(id),
    
    UNIQUE KEY unique_submission (assignment_id, user_id)
);
```

---

## 🔄 QUAN HỆ GIỮA CÁC BẢNG

```
┌──────────────┐
│   classes    │
└──────┬───────┘
       │
       │ 1:N
       ↓
┌──────────────┐      ┌──────────────┐
│ assignments  │──────│    tests     │
└──────┬───────┘ N:1  └──────────────┘
       │
       │ 1:N
       ↓
┌──────────────────────┐      ┌──────────────────┐
│ assignment_          │──────│  exam_attempts   │
│ submissions          │ N:1  └──────────────────┘
└──────────────────────┘
       │
       │ N:1
       ↓
┌──────────────┐
│    users     │
└──────────────┘
```

**Giải thích:**
- 1 lớp có nhiều bài tập
- 1 bài tập link đến 1 đề thi (test)
- 1 bài tập có nhiều bài nộp (submissions)
- 1 bài nộp link đến 1 lần thi (exam_attempt)
- 1 học viên có nhiều bài nộp

---

## 🎨 PHÂN BIỆT CÁC MODE

| Feature | Practice | Exam | Assignment |
|---------|----------|------|------------|
| **URL** | `?mode=practice` | `?mode=exam` | `?mode=assignment&assignmentId=X` |
| **Header** | "Luyện tập" | "Thi thử" | "📝 Bài tập" |
| **Timer** | Optional | Required | Based on test |
| **Submit** | Save to ExamAttempt | Save to ExamAttempt | Save to ExamAttempt + AssignmentSubmission |
| **Redirect** | `/test/complete` | `/test/complete` | `/student/assignments/X/result` |
| **Review** | ✅ | ✅ | ✅ (via result page) |
| **Grading** | Auto | Auto | Auto + Teacher feedback |

---

## 📊 TRẠNG THÁI (STATUS)

### Assignment Status
- `DRAFT`: Bài tập đang soạn, chưa hiển thị cho học viên
- `PUBLISHED`: Đã phát hành, học viên có thể làm bài
- `CLOSED`: Đã đóng, không nhận bài nộp nữa

### Submission Status
- `SUBMITTED`: Đã nộp đúng hạn
- `LATE`: Nộp trễ hạn
- `GRADED`: Đã được giáo viên chấm điểm

---

## 🔐 PHÂN QUYỀN

### Teacher/Manager/Admin
- ✅ Tạo bài tập
- ✅ Sửa bài tập
- ✅ Xóa bài tập (soft delete)
- ✅ Xem danh sách bài nộp
- ✅ Chấm điểm
- ✅ Thêm feedback

### Student
- ✅ Xem bài tập của lớp mình
- ✅ Làm bài tập
- ✅ Nộp bài
- ✅ Xem kết quả và feedback
- ✅ Xem lại bài làm
- ❌ Không nộp lại sau khi đã chấm

---

## 🚀 ƯU ĐIỂM CỦA LUỒNG NÀY

1. **Tái sử dụng 100% UI thi thử** - Không cần code lại giao diện
2. **Tự động nộp bài** - Học viên không cần nộp 2 lần
3. **Tự động chấm điểm** - Reading/Listening có điểm ngay lập tức
4. **Linh hoạt** - Giáo viên có thể thêm feedback và điều chỉnh điểm
5. **Không ảnh hưởng luồng cũ** - Practice và Exam mode vẫn hoạt động bình thường
6. **Dễ mở rộng** - Có thể áp dụng cho Listening, Writing, Speaking

---

## 📝 API ENDPOINTS

### Teacher APIs
```
POST   /api/assignments                      - Tạo bài tập
PUT    /api/assignments/{id}                 - Sửa bài tập
DELETE /api/assignments/{id}                 - Xóa bài tập
GET    /api/assignments/{id}                 - Chi tiết bài tập
GET    /api/assignments/class/{classId}      - Danh sách bài tập theo lớp
GET    /api/assignments/my-assignments       - Bài tập của tôi (teacher)
GET    /api/assignments/{id}/submissions     - Danh sách bài nộp
POST   /api/assignments/grade                - Chấm điểm
GET    /api/assignments/class/{classId}/pending - Bài chờ chấm
```

### Student APIs
```
GET    /api/assignments/student/class/{classId} - Bài tập của lớp
POST   /api/assignments/submit                   - Nộp bài
GET    /api/assignments/{id}/my-submission       - Bài nộp của tôi
```

---

## 🎯 TỔNG KẾT

Luồng bài tập DAVictory được thiết kế:
- ✅ **Đơn giản**: Học viên chỉ cần click "Làm bài" → Làm → Submit → Xem kết quả
- ✅ **Tự động**: Nộp bài và chấm điểm tự động cho Reading/Listening
- ✅ **Linh hoạt**: Giáo viên có thể thêm feedback và điều chỉnh điểm
- ✅ **Tích hợp**: Sử dụng lại 100% UI và logic của hệ thống thi thử
- ✅ **Mở rộng**: Dễ dàng áp dụng cho các skill khác

---

**Generated:** 2026-03-30 11:44:00  
**Version:** 1.0  
**Status:** ✅ COMPLETE
