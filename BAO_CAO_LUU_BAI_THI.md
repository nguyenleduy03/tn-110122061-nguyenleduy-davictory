# 📊 BÁO CÁO: HỆ THỐNG LƯU BÀI THI VÀ QUYỀN XEM CỦA GIÁO VIÊN

## ✅ 1. CƠ CHẾ LƯU BÀI THI

### 🔄 Flow làm bài và submit:

**Frontend (Student làm bài):**
```
1. Bắt đầu làm bài → POST /api/exam-attempts/start
   - Tạo ExamAttempt với status = "IN_PROGRESS"
   - Lưu: user_id, test_id, session_id, started_at, attempt_number

2. Làm bài → Lưu answers vào state (chưa gửi server)

3. Submit bài → POST /api/exam-attempts/{attemptId}/submit
   - Gửi toàn bộ answers một lần
   - Lưu vào bảng attempt_answers (từng câu trả lời)
   - Cập nhật ExamAttempt: status = "SUBMITTED" hoặc "GRADED"
```

### 💾 Dữ liệu được lưu:

**Bảng `exam_attempts`** (Thông tin tổng quan):
- user_id (học viên)
- test_id (đề thi)
- session_id (kỹ năng: Reading/Listening/Writing/Speaking)
- status (IN_PROGRESS → SUBMITTED → GRADED)
- started_at, submitted_at, graded_at
- time_spent_seconds (thời gian làm bài)
- total_answered, total_correct
- raw_score, band_score
- feedback (nhận xét của GV)
- attempt_number (lần thứ mấy làm bài này)

**Bảng `attempt_answers`** (Chi tiết từng câu trả lời):
- exam_attempt_id
- question_id
- selected_option_label (câu trắc nghiệm)
- text_answer (câu điền từ)
- matching_answer (câu nối/ghép cặp - JSON)
- is_correct (đúng/sai sau khi chấm)
- is_answered (đã trả lời chưa)
- is_flagged (đánh dấu để xem lại)
- answered_at

**Bảng `attempt_sections`** (Trạng thái từng Part):
- exam_attempt_id
- part_id
- status, time_spent_seconds

**Bảng `attempt_question_times`** (Thời gian từng câu):
- exam_attempt_id
- question_id
- time_spent_seconds

---

## 📝 2. CÁCH LƯU BÀI

### ✅ Lưu TOÀN BỘ BÀI một lần khi submit:

```javascript
// Frontend gửi tất cả answers cùng lúc
submitAnswers(testId, skillType, answers, timeSpentSeconds)
  ↓
POST /api/exam-attempts/{attemptId}/submit
{
  "timeSpentSeconds": 3600,
  "answers": [
    { "questionId": 1, "textAnswer": "answer1" },
    { "questionId": 2, "selectedOptionLabel": "B" },
    { "questionId": 3, "matchingAnswer": "{...}" }
  ]
}
```

### Backend xử lý:
```java
submitAttempt() {
  1. Lưu từng câu trả lời vào attempt_answers
  2. Tự động chấm điểm (Reading/Listening)
  3. Cập nhật ExamAttempt:
     - status = "GRADED" (nếu tự động chấm được)
     - status = "SUBMITTED" (nếu cần GV chấm - Writing/Speaking)
     - submitted_at = now()
     - total_answered, total_correct, band_score
}
```

### ⚠️ KHÔNG lưu từng kỹ năng riêng:
- Mỗi kỹ năng (Reading/Listening/Writing/Speaking) tạo 1 ExamAttempt riêng
- Mỗi lần submit = 1 attempt hoàn chỉnh
- Không có cơ chế lưu nháp giữa chừng (chỉ lưu khi submit)

---

## 👨‍🏫 3. GIÁO VIÊN CÓ XEM ĐƯỢC BÀI CỦA HỌC VIÊN KHÔNG?

### ✅ CÓ - Nhưng có giới hạn:

**API hiện có:**

1. **GET /api/exam-attempts** (TEACHER/MANAGER/ADMIN)
   ```java
   @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
   public List<ExamAttemptResponse> getAllAttempts()
   ```
   → Xem TẤT CẢ attempts của TẤT CẢ học viên

2. **GET /api/exam-attempts/{id}** (Authenticated)
   ```java
   public ExamAttemptResponse getAttempt(Long attemptId, String username)
   ```
   → Chỉ xem được attempt của CHÍNH MÌNH
   → ❌ GV KHÔNG thể xem chi tiết attempt của học viên khác

### ❌ THIẾU API:

**Không có API để:**
- Xem danh sách attempts của học viên trong lớp
- Xem chi tiết bài làm của học viên cụ thể
- Lọc attempts theo lớp học
- Xem progress của học viên trong lớp

---

## 🔧 4. ĐỀ XUẤT BỔ SUNG

### Cần thêm API cho giáo viên:

```java
// 1. Xem attempts của học viên trong lớp
GET /api/class-management/classes/{classId}/students/{studentId}/attempts
→ Trả về: List<ExamAttemptResponse>

// 2. Xem chi tiết attempt của học viên (cho GV)
GET /api/class-management/attempts/{attemptId}
→ Kiểm tra: GV có dạy lớp của học viên này không
→ Trả về: ExamAttemptResponse + answers chi tiết

// 3. Xem tất cả attempts của lớp
GET /api/class-management/classes/{classId}/attempts
→ Trả về: List<ExamAttemptResponse> của tất cả học viên trong lớp

// 4. Thống kê lớp
GET /api/class-management/classes/{classId}/statistics
→ Trả về: Tổng hợp điểm, progress của cả lớp
```

### Repository cần thêm:

```java
// ExamAttemptRepository.java
List<ExamAttempt> findByUserIdInOrderByCreatedAtDesc(List<Long> userIds);

@Query("SELECT e FROM ExamAttempt e WHERE e.user.id IN " +
       "(SELECT cs.user.id FROM ClassStudent cs WHERE cs.clazz.id = :classId)")
List<ExamAttempt> findByClassId(@Param("classId") Long classId);
```

---

## 📊 5. TÓM TẮT

| Tiêu chí | Trạng thái | Ghi chú |
|----------|-----------|---------|
| **Lưu bài khi submit** | ✅ CÓ | Lưu toàn bộ một lần |
| **Lưu từng kỹ năng** | ✅ CÓ | Mỗi skill = 1 ExamAttempt |
| **Lưu chi tiết câu trả lời** | ✅ CÓ | Bảng attempt_answers |
| **Tự động chấm điểm** | ✅ CÓ | Reading/Listening |
| **GV xem tất cả attempts** | ✅ CÓ | GET /api/exam-attempts |
| **GV xem chi tiết bài học viên** | ❌ KHÔNG | Thiếu API + logic kiểm tra quyền |
| **GV xem theo lớp** | ❌ KHÔNG | Thiếu API filter theo class |
| **Lưu nháp giữa chừng** | ❌ KHÔNG | Chỉ lưu khi submit |

---

## 🎯 KẾT LUẬN

1. ✅ **Bài thi ĐƯỢC LƯU** khi học viên submit
2. ✅ Lưu **TOÀN BỘ** một lần (không lưu từng câu riêng)
3. ✅ Lưu **TỪNG KỸ NĂNG** riêng biệt (4 ExamAttempt cho 1 full test)
4. ⚠️ GV có thể xem **DANH SÁCH** tất cả attempts
5. ❌ GV **KHÔNG THỂ** xem chi tiết bài làm của học viên cụ thể
6. ❌ **THIẾU** tính năng quản lý theo lớp học

**→ CẦN BỔ SUNG API để GV quản lý bài làm của học viên trong lớp!**
