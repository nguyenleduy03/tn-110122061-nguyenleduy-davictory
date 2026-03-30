# TODO: LMS BÀI TẬP (ASSIGNMENTS)

## 📋 TỔNG QUAN
Xây dựng hệ thống quản lý bài tập hoàn chỉnh cho giảng viên và học viên.
- Backend: Entity đã có sẵn (Assignment, AssignmentSubmission)
- Repository: Đã có queries cơ bản
- **CẦN LÀM**: Service, Controller, DTO, Frontend

---

## 🎯 PHASE 1: BACKEND API (Ưu tiên cao)

### 1.1. DTO Classes
**Vị trí**: `backend/src/main/java/com/victory/DAVictory/dto/`

#### ✅ Tạo file: `AssignmentRequest.java`
```java
@Data
public class AssignmentRequest {
    private Long classId;
    private String title;
    private String description;
    private String assignmentType; // LISTENING_PRACTICE, READING_PRACTICE, WRITING_TASK, etc.
    private String attachmentUrl;
    private LocalDateTime dueDate;
    private Boolean isRequired;
    private Double maxScore;
    private String status; // DRAFT, PUBLISHED, CLOSED
    private String notes;
}
```

#### ✅ Tạo file: `AssignmentResponse.java`
```java
@Data
public class AssignmentResponse {
    private Long id;
    private Long classId;
    private String className;
    private String classCode;
    private Long createdById;
    private String createdByName;
    private String title;
    private String description;
    private String assignmentType;
    private String attachmentUrl;
    private LocalDateTime assignedAt;
    private LocalDateTime dueDate;
    private Boolean isRequired;
    private Double maxScore;
    private String status;
    private String notes;
    private Long totalStudents;
    private Long submittedCount;
    private Long gradedCount;
    private Double avgScore;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Static factory method
    public static AssignmentResponse fromEntity(Assignment assignment, long totalStudents, long submittedCount, long gradedCount, Double avgScore);
}
```

#### ✅ Tạo file: `AssignmentSubmissionRequest.java`
```java
@Data
public class AssignmentSubmissionRequest {
    private Long assignmentId;
    private String submissionText;
    private String attachmentUrl;
}
```

#### ✅ Tạo file: `AssignmentSubmissionResponse.java`
```java
@Data
public class AssignmentSubmissionResponse {
    private Long id;
    private Long assignmentId;
    private String assignmentTitle;
    private Long userId;
    private String username;
    private String fullName;
    private String submissionText;
    private String attachmentUrl;
    private LocalDateTime submittedAt;
    private String status; // NOT_SUBMITTED, SUBMITTED, LATE, GRADED, RETURNED
    private Double score;
    private String feedback;
    private Long gradedById;
    private String gradedByName;
    private LocalDateTime gradedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static AssignmentSubmissionResponse fromEntity(AssignmentSubmission submission);
}
```

#### ✅ Tạo file: `AssignmentGradeRequest.java`
```java
@Data
public class AssignmentGradeRequest {
    private Long submissionId;
    private Double score;
    private String feedback;
}
```

---

### 1.2. Service Layer
**Vị trí**: `backend/src/main/java/com/victory/DAVictory/service/`

#### ✅ Tạo file: `AssignmentService.java`

**Các method cần implement:**

```java
@Service
public class AssignmentService {
    
    // CRUD cơ bản
    AssignmentResponse createAssignment(AssignmentRequest request, User currentUser);
    AssignmentResponse updateAssignment(Long id, AssignmentRequest request, User currentUser);
    void deleteAssignment(Long id, User currentUser);
    AssignmentResponse getAssignmentById(Long id);
    
    // Danh sách bài tập
    List<AssignmentResponse> getAssignmentsByClass(Long classId);
    List<AssignmentResponse> getMyAssignments(User currentUser); // Giảng viên
    List<AssignmentResponse> getAssignmentsForStudent(Long classId, User student);
    
    // Thống kê
    AssignmentResponse getAssignmentWithStats(Long id);
    List<AssignmentResponse> getUpcomingAssignments(Long classId, int days);
    
    // Submissions
    List<AssignmentSubmissionResponse> getSubmissionsByAssignment(Long assignmentId);
    AssignmentSubmissionResponse submitAssignment(AssignmentSubmissionRequest request, User student);
    AssignmentSubmissionResponse getMySubmission(Long assignmentId, User student);
    
    // Chấm điểm
    AssignmentSubmissionResponse gradeSubmission(AssignmentGradeRequest request, User teacher);
    List<AssignmentSubmissionResponse> getPendingSubmissions(Long classId);
    
    // Validation helpers
    private void validateTeacherAccess(Assignment assignment, User teacher);
    private void validateStudentAccess(Assignment assignment, User student);
    private boolean isLateSubmission(Assignment assignment);
}
```

**Logic quan trọng:**
- Kiểm tra quyền: Chỉ giảng viên của lớp mới được tạo/sửa/xóa bài tập
- Tự động set status = "LATE" nếu nộp sau dueDate
- Tính toán thống kê: totalStudents, submittedCount, gradedCount, avgScore
- Validate maxScore khi chấm điểm

---

### 1.3. Controller Layer
**Vị trí**: `backend/src/main/java/com/victory/DAVictory/controller/`

#### ✅ Tạo file: `AssignmentController.java`

```java
@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {
    
    @Autowired
    private AssignmentService assignmentService;
    
    // CRUD
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    ResponseEntity<AssignmentResponse> createAssignment(@RequestBody AssignmentRequest request);
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    ResponseEntity<AssignmentResponse> updateAssignment(@PathVariable Long id, @RequestBody AssignmentRequest request);
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    ResponseEntity<Void> deleteAssignment(@PathVariable Long id);
    
    @GetMapping("/{id}")
    ResponseEntity<AssignmentResponse> getAssignment(@PathVariable Long id);
    
    // Danh sách
    @GetMapping("/class/{classId}")
    ResponseEntity<List<AssignmentResponse>> getAssignmentsByClass(@PathVariable Long classId);
    
    @GetMapping("/my-assignments")
    @PreAuthorize("hasRole('TEACHER')")
    ResponseEntity<List<AssignmentResponse>> getMyAssignments();
    
    @GetMapping("/student/class/{classId}")
    @PreAuthorize("hasRole('STUDENT')")
    ResponseEntity<List<AssignmentResponse>> getAssignmentsForStudent(@PathVariable Long classId);
    
    // Submissions
    @PostMapping("/submit")
    @PreAuthorize("hasRole('STUDENT')")
    ResponseEntity<AssignmentSubmissionResponse> submitAssignment(@RequestBody AssignmentSubmissionRequest request);
    
    @GetMapping("/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    ResponseEntity<List<AssignmentSubmissionResponse>> getSubmissions(@PathVariable Long assignmentId);
    
    @GetMapping("/{assignmentId}/my-submission")
    @PreAuthorize("hasRole('STUDENT')")
    ResponseEntity<AssignmentSubmissionResponse> getMySubmission(@PathVariable Long assignmentId);
    
    // Chấm điểm
    @PostMapping("/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    ResponseEntity<AssignmentSubmissionResponse> gradeSubmission(@RequestBody AssignmentGradeRequest request);
    
    @GetMapping("/class/{classId}/pending")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    ResponseEntity<List<AssignmentSubmissionResponse>> getPendingSubmissions(@PathVariable Long classId);
}
```

---

## 🎨 PHASE 2: FRONTEND (Giảng viên)

### 2.1. API Service
**Vị trí**: `frontend/src/services/assignmentApi.js`

#### ✅ Tạo file mới

```javascript
import axios from 'axios';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const assignmentApi = {
  // CRUD
  createAssignment: async (data) => {
    const res = await apiClient.post('/assignments', data);
    return res.data;
  },
  
  updateAssignment: async (id, data) => {
    const res = await apiClient.put(`/assignments/${id}`, data);
    return res.data;
  },
  
  deleteAssignment: async (id) => {
    await apiClient.delete(`/assignments/${id}`);
  },
  
  getAssignment: async (id) => {
    const res = await apiClient.get(`/assignments/${id}`);
    return res.data;
  },
  
  // Lists
  getAssignmentsByClass: async (classId) => {
    const res = await apiClient.get(`/assignments/class/${classId}`);
    return res.data;
  },
  
  getMyAssignments: async () => {
    const res = await apiClient.get('/assignments/my-assignments');
    return res.data;
  },
  
  getAssignmentsForStudent: async (classId) => {
    const res = await apiClient.get(`/assignments/student/class/${classId}`);
    return res.data;
  },
  
  // Submissions
  submitAssignment: async (data) => {
    const res = await apiClient.post('/assignments/submit', data);
    return res.data;
  },
  
  getSubmissions: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/submissions`);
    return res.data;
  },
  
  getMySubmission: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/my-submission`);
    return res.data;
  },
  
  // Grading
  gradeSubmission: async (data) => {
    const res = await apiClient.post('/assignments/grade', data);
    return res.data;
  },
  
  getPendingSubmissions: async (classId) => {
    const res = await apiClient.get(`/assignments/class/${classId}/pending`);
    return res.data;
  },
};
```

---

### 2.2. Components

#### ✅ Tạo: `frontend/src/components/assignment/AssignmentForm.jsx`
Modal/Form để tạo/sửa bài tập
- Input: title, description, assignmentType (dropdown), dueDate, maxScore
- File upload cho attachmentUrl
- Chọn lớp (dropdown)

#### ✅ Tạo: `frontend/src/components/assignment/AssignmentCard.jsx`
Card hiển thị thông tin bài tập
- Title, dueDate, status badge
- Progress bar: submittedCount / totalStudents
- Actions: Edit, Delete, View Submissions

#### ✅ Tạo: `frontend/src/components/assignment/SubmissionList.jsx`
Danh sách bài nộp của học viên
- Table: Student name, submitted date, status, score
- Filter: All / Pending / Graded
- Action: Grade button

#### ✅ Tạo: `frontend/src/components/assignment/GradeModal.jsx`
Modal chấm điểm
- Hiển thị submission content
- Input: score, feedback
- Submit button

---

### 2.3. Pages

#### ✅ Cập nhật: `frontend/src/pages/lms/LmsTeacherAssignments.jsx`

**Thay thế mockup hiện tại bằng:**

```jsx
import React, { useEffect, useState } from 'react';
import { PlusCircle, RefreshCw, Filter } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import AssignmentCard from '../../components/assignment/AssignmentCard';
import AssignmentForm from '../../components/assignment/AssignmentForm';
import { assignmentApi } from '../../services/assignmentApi';
import { authApi } from '../../services/authApi';

export default function LmsTeacherAssignments() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsData, classData] = await Promise.all([
        assignmentApi.getMyAssignments(),
        authApi.getMyClassManagement()
      ]);
      setAssignments(assignmentsData);
      setClasses(classData.classes || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const filteredAssignments = selectedClass
    ? assignments.filter(a => a.classId === parseInt(selectedClass))
    : assignments;
  
  const handleCreate = () => {
    setEditingAssignment(null);
    setShowForm(true);
  };
  
  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Xóa bài tập này?')) return;
    try {
      await assignmentApi.deleteAssignment(id);
      fetchData();
    } catch (error) {
      alert('Xóa thất bại');
    }
  };
  
  const handleFormSubmit = async (data) => {
    try {
      if (editingAssignment) {
        await assignmentApi.updateAssignment(editingAssignment.id, data);
      } else {
        await assignmentApi.createAssignment(data);
      }
      setShowForm(false);
      fetchData();
    } catch (error) {
      alert('Lưu thất bại');
    }
  };
  
  return (
    <LmsLayout title="Bài tập" subtitle="Giao bài và theo dõi tiến độ nộp của học viên">
      {/* Header actions */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Filter size={16} />
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Tất cả lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="lms-cta ghost" onClick={fetchData}>
              <RefreshCw size={14} />
            </button>
            <button className="lms-cta" onClick={handleCreate}>
              <PlusCircle size={14} /> Tạo bài tập mới
            </button>
          </div>
        </div>
      </div>
      
      {/* Assignment grid */}
      {loading ? (
        <div className="lms-panel">Đang tải...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="lms-panel">Chưa có bài tập nào</div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filteredAssignments.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      {/* Form modal */}
      {showForm && (
        <AssignmentForm
          assignment={editingAssignment}
          classes={classes}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </LmsLayout>
  );
}
```

#### ✅ Tạo: `frontend/src/pages/lms/LmsAssignmentDetail.jsx`
Chi tiết bài tập + danh sách submissions
- Thông tin assignment
- Bảng submissions với filter
- Chấm điểm inline hoặc modal

---

## 👨‍🎓 PHASE 3: FRONTEND (Học viên)

#### ✅ Tạo: `frontend/src/pages/student/StudentAssignments.jsx`
Danh sách bài tập của học viên
- Hiển thị assignments theo lớp
- Badge: Chưa nộp / Đã nộp / Đã chấm / Trễ hạn
- Action: Nộp bài / Xem kết quả

#### ✅ Tạo: `frontend/src/pages/student/SubmitAssignment.jsx`
Form nộp bài
- Hiển thị assignment details
- Textarea cho submission text
- File upload
- Submit button

#### ✅ Tạo: `frontend/src/components/student/AssignmentResult.jsx`
Xem kết quả đã chấm
- Score, feedback
- Download attachment nếu có

---

## 🔗 PHASE 4: TÍCH HỢP

### 4.1. Cập nhật Dashboard
- **LmsTeacherDashboard**: Thêm card "Bài tập sắp hạn"
- **StudentDashboard**: Thêm widget "Bài tập chưa nộp"

### 4.2. Cập nhật Navigation
- Thêm link "Bài tập" vào LmsLayout sidebar
- Thêm badge số lượng bài chờ chấm

### 4.3. Notifications (Optional)
- Email reminder trước deadline
- Thông báo khi giáo viên chấm xong

---

## ✅ CHECKLIST HOÀN THÀNH

### Backend
- [ ] AssignmentRequest.java
- [ ] AssignmentResponse.java
- [ ] AssignmentSubmissionRequest.java
- [ ] AssignmentSubmissionResponse.java
- [ ] AssignmentGradeRequest.java
- [ ] AssignmentService.java (full implementation)
- [ ] AssignmentController.java
- [ ] Test API với Postman/Swagger

### Frontend - Teacher
- [ ] assignmentApi.js
- [ ] AssignmentForm.jsx
- [ ] AssignmentCard.jsx
- [ ] SubmissionList.jsx
- [ ] GradeModal.jsx
- [ ] LmsTeacherAssignments.jsx (replace mockup)
- [ ] LmsAssignmentDetail.jsx

### Frontend - Student
- [ ] StudentAssignments.jsx
- [ ] SubmitAssignment.jsx
- [ ] AssignmentResult.jsx

### Integration
- [ ] Update LmsTeacherDashboard
- [ ] Update StudentDashboard (nếu có)
- [ ] Update navigation/routing
- [ ] Test end-to-end flow

---

## 📝 GHI CHÚ KỸ THUẬT

### Status Flow
```
Assignment: DRAFT → PUBLISHED → CLOSED
Submission: NOT_SUBMITTED → SUBMITTED/LATE → GRADED → RETURNED
```

### Validation Rules
- dueDate phải > hiện tại khi tạo mới
- maxScore phải >= 0 nếu có
- Chỉ teacher của lớp mới được CRUD assignment
- Student chỉ submit được khi status = PUBLISHED
- Không cho edit submission sau khi đã GRADED

### File Upload
- Sử dụng FileUploadService có sẵn
- Hoặc tích hợp Google Drive (đã có GoogleDriveOAuth2Service)

### Performance
- Lazy load submissions khi click vào assignment
- Pagination cho danh sách assignments nếu > 50 items

---

## 🚀 THỜI GIAN ƯỚC TÍNH
- Phase 1 (Backend): 2-3 ngày
- Phase 2 (Frontend Teacher): 2-3 ngày
- Phase 3 (Frontend Student): 1-2 ngày
- Phase 4 (Integration): 1 ngày
- **TỔNG**: 6-9 ngày làm việc

---

## 📚 THAM KHẢO
- Entity: `backend/src/main/java/com/victory/DAVictory/entity/Assignment.java`
- Repository: `backend/src/main/java/com/victory/DAVictory/repository/AssignmentRepository.java`
- Tham khảo WritingService.java cho logic chấm điểm
- Tham khảo ExamAttemptService.java cho validation teacher access
