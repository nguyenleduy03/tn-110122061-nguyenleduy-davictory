# Frontend Checklist - Assignment Flow

## ✅ STUDENT PAGES (Đầy đủ)

### 1. StudentLms.jsx ✅
- Danh sách assignments
- Type badge (Test/Tự do)
- Status badge
- Filter by class, status
- Stats cards
- Navigate to AssignmentDetail

### 2. AssignmentDetail.jsx ✅ (NEW)
- Hiển thị assignment info
- Type badge
- Check maxAttempts, deadline
- TEST type: Show 4 skills
- MANUAL type: Show "Nộp bài" button
- Submission status display

### 3. SubmitAssignment.jsx ✅
- Form for MANUAL type only
- Check type, redirect if TEST
- Text input + file upload
- Submit to new API
- Navigate to result

### 4. AssignmentResult.jsx ✅
- Show submission result
- Display score + feedback
- Show submission content (MANUAL)
- Show exam info (TEST)
- Back to AssignmentDetail

### 5. AssignmentSkills.jsx ⚠️ (DEPRECATED)
- Không dùng nữa
- Đã thay bằng AssignmentDetail
- Có thể xóa

### 6. StudentAssignments.jsx ⚠️ (DEPRECATED)
- Không dùng nữa
- Route đã xóa
- Có thể xóa

## ✅ TEACHER COMPONENTS (Đầy đủ)

### 1. AssignmentForm.jsx ✅
- Radio select TEST/MANUAL
- TEST: dropdown chọn test
- MANUAL: không cần test
- Fields: maxAttempts, allowLateSubmission
- Clean UI

### 2. AssignmentCard.jsx ✅
- Type badge
- Status badge
- Progress bar
- Stats display

### 3. GradeModal.jsx ✅ (NEW)
- Show student info
- Show submission content
- Input score + feedback
- Validation

## ✅ TEACHER PAGES (Đầy đủ)

### 1. LmsTeacherAssignments.jsx ✅
- List assignments
- Filter by class
- Stats cards
- Create/Edit/Delete
- Pass tests to form

### 2. LmsAssignmentDetail.jsx ✅
- Assignment info
- Stats cards
- Submission list
- Inline grading modal
- Filter submissions

## ✅ SERVICES (Đầy đủ)

### assignmentApi.js ✅
- getMySubmissions() ✅
- getMyLatestSubmission() ✅
- submitManual() ✅
- submitTest() ✅
- getResult() ✅
- gradeSubmission() ✅
- getSubmissionById() ✅
- Backward compatible ✅

## ✅ ROUTES (Đầy đủ)

### App.jsx ✅
```
/student/lms → StudentLms
/student/assignments/:id → AssignmentDetail (NEW)
/student/assignments/:id/submit → SubmitAssignment
/student/assignments/:id/result → AssignmentResult

/lms/teacher/assignments → LmsTeacherAssignments
/lms/teacher/assignments/:id → LmsAssignmentDetail
```

## 🗑️ CẦN XÓA (Optional)

### 1. AssignmentSkills.jsx
- Đã thay bằng AssignmentDetail
- Route đã xóa
- Có thể xóa file

### 2. StudentAssignments.jsx
- Route đã xóa
- Không dùng nữa
- Có thể xóa file

## 📊 SUMMARY

### Có đầy đủ:
✅ Student flow: 4 pages chính
✅ Teacher flow: 2 pages + 3 components
✅ API service: 7 methods mới
✅ Routes: Đầy đủ
✅ Type support: TEST + MANUAL
✅ Grading: Inline modal
✅ Validation: maxAttempts, deadline

### Không cần:
❌ AssignmentSkills (deprecated)
❌ StudentAssignments (deprecated)

### Kết luận:
**Frontend đã đầy đủ 100%** cho flow mới!

Chỉ cần:
1. Backend implement các API
2. Run migration SQL
3. Test end-to-end
