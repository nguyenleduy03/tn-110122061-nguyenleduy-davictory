# Assignment Flow Redesign

## 1. DATA MODEL

### Assignment
```
{
  id: number
  title: string
  description: string
  classId: number
  teacherId: number
  type: 'TEST' | 'MANUAL'  // ← NEW
  testId: number | null     // nếu type = TEST
  maxScore: number
  dueDate: datetime
  allowLateSubmission: boolean  // ← NEW
  maxAttempts: number | null    // ← NEW (null = unlimited)
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  createdAt: datetime
}
```

### AssignmentSubmission
```
{
  id: number
  assignmentId: number
  studentId: number
  attemptNumber: number         // ← NEW (1, 2, 3...)
  
  // For TEST type
  examAttemptId: number | null
  
  // For MANUAL type
  submissionText: string | null
  attachmentUrl: string | null
  
  score: number | null
  feedback: string | null
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'  // ← SIMPLIFIED
  submittedAt: datetime | null
  gradedAt: datetime | null
  gradedBy: number | null
}
```

## 2. STUDENT FLOW

### A. TEST-BASED ASSIGNMENT

```
StudentLms (danh sách)
  ↓ click "Làm bài"
AssignmentDetail (xem chi tiết + chọn skill)
  ↓ click skill
TestPage (làm test với ?assignmentId=X)
  ↓ submit test
  → Tự động tạo AssignmentSubmission với examAttemptId
  ↓
AssignmentResult (xem điểm + feedback)
```

**Logic:**
1. Khi vào test page với `?assignmentId=X`:
   - Check số lần đã làm vs maxAttempts
   - Nếu còn lượt → cho làm
   - Nếu hết lượt → show message

2. Khi submit test:
   - Tạo ExamAttempt như bình thường
   - **Tự động tạo AssignmentSubmission** link với examAttemptId
   - Status = SUBMITTED (hoặc GRADED nếu auto-grade)
   - Score = tổng điểm từ exam attempt

3. Xem kết quả:
   - Show điểm từ submission
   - Link "Xem chi tiết bài làm" → TestReview

### B. MANUAL ASSIGNMENT

```
StudentLms (danh sách)
  ↓ click "Làm bài"
AssignmentDetail (xem yêu cầu)
  ↓ click "Nộp bài"
SubmitAssignment (form nhập text/upload)
  ↓ submit
  → Tạo AssignmentSubmission với text/file
  ↓
AssignmentResult (chờ chấm)
  ↓ teacher grades
AssignmentResult (xem điểm + feedback)
```

## 3. TEACHER FLOW

### Create Assignment

```
LmsTeacherAssignments
  ↓ click "Tạo bài tập"
AssignmentForm
  - Chọn type: TEST hoặc MANUAL
  - Nếu TEST: chọn test từ library
  - Nếu MANUAL: nhập yêu cầu
  - Set deadline, maxAttempts, etc.
  ↓ save
Back to list
```

### Grade Submissions

**TEST type:**
- Tự động có điểm
- Teacher chỉ cần xem và thêm feedback (optional)

**MANUAL type:**
- Teacher phải chấm thủ công
- Nhập điểm + feedback

```
LmsTeacherAssignments
  ↓ click assignment
AssignmentDetail (teacher view)
  - Thống kê: X/Y đã nộp
  - Danh sách submissions
  ↓ click submission
GradeSubmission
  - Xem bài làm
  - Nhập điểm + feedback
  - Save
```

## 4. API ENDPOINTS

### Student APIs
```
GET  /assignments/student/class/:classId
     → Danh sách assignments của class

GET  /assignments/:id
     → Chi tiết assignment

GET  /assignments/:id/my-submissions
     → Danh sách các lần nộp của mình (for maxAttempts)

POST /assignments/:id/submit-manual
     Body: { submissionText, attachmentUrl }
     → Nộp bài MANUAL type

POST /assignments/:id/submit-test
     Body: { examAttemptId }
     → Link exam attempt với assignment (auto call from test page)

GET  /assignments/:id/result
     → Kết quả bài làm (latest submission)
```

### Teacher APIs
```
GET  /assignments/my-assignments
     → Danh sách assignments của teacher

POST /assignments
     Body: { type, testId?, ... }
     → Tạo assignment

GET  /assignments/:id/submissions
     → Danh sách submissions của assignment

POST /assignments/submissions/:id/grade
     Body: { score, feedback }
     → Chấm điểm submission
```

## 5. UI CHANGES

### StudentLms.jsx
- Assignment card hiển thị:
  - Type badge: "Bài test" hoặc "Bài tập tự do"
  - Số lần đã làm: "Lần 1/3" (nếu có maxAttempts)
  - Status: "Chưa làm" | "Đã nộp" | "Đã chấm"
  - Điểm (nếu có)

- Click card → đi AssignmentDetail
- Nút action:
  - "Làm bài" (nếu chưa làm hoặc còn lượt)
  - "Xem kết quả" (nếu đã nộp)

### AssignmentDetail.jsx (NEW - thay thế AssignmentSkills)
- Hiển thị đầy đủ thông tin assignment
- Nếu TEST type:
  - Hiển thị 4 skills để chọn
  - Mỗi skill → link đến test page
- Nếu MANUAL type:
  - Hiển thị yêu cầu
  - Nút "Nộp bài" → SubmitAssignment

### SubmitAssignment.jsx
- Chỉ dùng cho MANUAL type
- Form nhập text + upload file
- Hiển thị các lần nộp trước (nếu có)

### AssignmentResult.jsx
- Hiển thị kết quả submission
- Nếu TEST type: link "Xem chi tiết bài làm"
- Nếu MANUAL type: hiển thị text/file đã nộp
- Hiển thị điểm + feedback

## 6. IMPLEMENTATION PRIORITY

### Phase 1: Core Logic
1. ✅ Add `type` field to Assignment model
2. ✅ Add `attemptNumber`, `examAttemptId` to AssignmentSubmission
3. ✅ Update APIs to support new fields
4. ✅ Auto-create submission when test completed

### Phase 2: Student UI
1. ✅ Update StudentLms to show type + attempts
2. ✅ Create new AssignmentDetail page
3. ✅ Update test pages to handle assignmentId param
4. ✅ Update AssignmentResult to show proper info

### Phase 3: Teacher UI
1. ✅ Update AssignmentForm to select type
2. ✅ Update teacher assignment list
3. ✅ Update grading interface

### Phase 4: Polish
1. ✅ Add validation (maxAttempts, deadline)
2. ✅ Add notifications
3. ✅ Add analytics
