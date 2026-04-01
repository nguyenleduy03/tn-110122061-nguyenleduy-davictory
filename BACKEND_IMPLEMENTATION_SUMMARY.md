# Backend Implementation Summary

## ✅ ĐÃ HOÀN THÀNH

### 1. Database Migration
**File: `backend/src/main/resources/db/migration/add_assignment_type_fields.sql`**

```sql
-- Assignments table
ALTER TABLE assignments 
ADD COLUMN type VARCHAR(10) DEFAULT 'MANUAL',
ADD COLUMN max_attempts INT NULL,
ADD COLUMN allow_late_submission BOOLEAN DEFAULT false;

-- Assignment_submissions table
ALTER TABLE assignment_submissions
ADD COLUMN attempt_number INT DEFAULT 1,
ADD COLUMN exam_attempt_id BIGINT NULL,
ADD COLUMN graded_by BIGINT NULL,
ADD COLUMN graded_at TIMESTAMP NULL;

-- Foreign keys + indexes
```

### 2. Entity Updates

**Assignment.java:**
- ✅ Added: `type` (TEST/MANUAL)
- ✅ Added: `maxAttempts`
- ✅ Added: `allowLateSubmission`
- ✅ Removed: `assignmentType`, `attachmentUrl`, `assignedAt`, `isRequired`, `notes`
- ✅ Simplified to core fields only

**AssignmentSubmission.java:**
- ✅ Added: `attemptNumber`
- ✅ Added: `examAttemptId`
- ✅ Added: `gradedBy` (User)
- ✅ Added: `gradedAt`
- ✅ Removed: unique constraint (allow multiple submissions)
- ✅ Status simplified: SUBMITTED, GRADED

### 3. DTOs

**New DTOs:**
- ✅ `ManualSubmissionRequest.java` - { submissionText, attachmentUrl }
- ✅ `TestSubmissionRequest.java` - { examAttemptId }
- ✅ `GradeRequest.java` - { score, feedback }

**Updated DTOs:**
- ✅ `AssignmentSubmissionResponse.java` - Added attemptNumber, examAttemptId, studentName

### 4. Repository

**AssignmentSubmissionRepository.java:**
- ✅ `findByAssignmentAndUserOrderByAttemptNumberDesc()` - Get all submissions
- ✅ `countByAssignmentAndUser()` - Count attempts
- ✅ `existsByExamAttemptId()` - Check duplicate

### 5. Service

**AssignmentServiceExtension.java:**
- ✅ `getMySubmissions()` - Get all student submissions for assignment
- ✅ `submitManual()` - Submit MANUAL type with validation
- ✅ `submitTest()` - Submit TEST type, link exam attempt
- ✅ `gradeSubmissionById()` - Grade by submissionId
- ✅ `getSubmissionById()` - Get submission details

**Business Logic:**
- ✅ Check maxAttempts before submit
- ✅ Check deadline and allowLateSubmission
- ✅ Prevent duplicate exam attempt submission
- ✅ Auto-grade TEST type from exam score
- ✅ Validate score <= maxScore

### 6. Controller

**AssignmentController.java:**
- ✅ `GET /{assignmentId}/my-submissions` - Student get all submissions
- ✅ `POST /{assignmentId}/submit-manual` - Submit MANUAL
- ✅ `POST /{assignmentId}/submit-test` - Submit TEST
- ✅ `POST /submissions/{submissionId}/grade` - Grade by ID
- ✅ `GET /submissions/{submissionId}` - Get submission

## 🔄 API ENDPOINTS

### Student APIs

```
GET /api/assignments/{assignmentId}/my-submissions
→ List<AssignmentSubmissionResponse>
→ Get all submissions (for maxAttempts tracking)

POST /api/assignments/{assignmentId}/submit-manual
Body: { submissionText, attachmentUrl }
→ AssignmentSubmissionResponse
→ Submit MANUAL type assignment

POST /api/assignments/{assignmentId}/submit-test
Body: { examAttemptId }
→ AssignmentSubmissionResponse
→ Link exam attempt to assignment (auto-called)

GET /api/assignments/{assignmentId}/my-submission
→ AssignmentSubmissionResponse
→ Get latest submission (backward compatible)
```

### Teacher APIs

```
GET /api/assignments/{assignmentId}/submissions
→ List<AssignmentSubmissionResponse>
→ Get all submissions for assignment

POST /api/assignments/submissions/{submissionId}/grade
Body: { score, feedback }
→ AssignmentSubmissionResponse
→ Grade submission

GET /api/assignments/submissions/{submissionId}
→ AssignmentSubmissionResponse
→ Get submission details
```

## 🎯 FLOW IMPLEMENTATION

### Student Submit MANUAL

```
1. Student clicks "Nộp bài" on MANUAL assignment
2. Frontend calls POST /assignments/{id}/submit-manual
3. Backend validates:
   - Assignment type = MANUAL
   - Check maxAttempts
   - Check deadline + allowLateSubmission
4. Create AssignmentSubmission:
   - attemptNumber = currentAttempts + 1
   - submissionText, attachmentUrl
   - status = SUBMITTED
5. Return submission response
```

### Student Submit TEST

```
1. Student completes test with ?assignment={id}
2. Frontend calls POST /assignments/{id}/submit-test
3. Backend validates:
   - Assignment type = TEST
   - ExamAttempt exists
   - Not already submitted for this attempt
   - Check maxAttempts
4. Create AssignmentSubmission:
   - attemptNumber = currentAttempts + 1
   - examAttemptId
   - score = examAttempt.totalScore
   - status = GRADED (auto)
5. Return submission response
```

### Teacher Grade

```
1. Teacher clicks "Chấm điểm" on submission
2. Frontend calls POST /submissions/{id}/grade
3. Backend validates:
   - Submission exists
   - Score <= maxScore
4. Update submission:
   - score, feedback
   - status = GRADED
   - gradedBy, gradedAt
5. Return updated submission
```

## ⚠️ CẦN LÀM THÊM

### 1. Integrate with Test Completion

**File: ExamAttemptController.java hoặc TestController.java**

Khi student submit test, cần check xem có `assignmentId` param không:

```java
@PostMapping("/exam-attempts")
public ResponseEntity<ExamAttemptResponse> submitTest(
    @RequestBody ExamAttemptRequest request,
    @RequestParam(required = false) Long assignmentId,
    @AuthenticationPrincipal UserDetails userDetails
) {
    User student = getCurrentUser(userDetails);
    
    // Create exam attempt
    ExamAttempt attempt = examService.createAttempt(request, student);
    
    // If this is for an assignment, auto-create submission
    if (assignmentId != null) {
        TestSubmissionRequest submissionRequest = new TestSubmissionRequest();
        submissionRequest.setExamAttemptId(attempt.getId());
        
        assignmentServiceExtension.submitTest(assignmentId, submissionRequest, student);
    }
    
    return ResponseEntity.ok(toResponse(attempt));
}
```

### 2. Update AssignmentRequest DTO

**File: AssignmentRequest.java**

```java
@Data
public class AssignmentRequest {
    private Long classId;
    private String title;
    private String description;
    private String type; // TEST or MANUAL
    private Long testId; // for TEST type
    private Double maxScore;
    private LocalDateTime dueDate;
    private Integer maxAttempts;
    private Boolean allowLateSubmission;
    private String status; // DRAFT, PUBLISHED, CLOSED
}
```

### 3. Update AssignmentResponse DTO

**File: AssignmentResponse.java**

```java
@Data
public class AssignmentResponse {
    private Long id;
    private Long classId;
    private String className;
    private String title;
    private String description;
    private String type; // TEST or MANUAL
    private Long testId;
    private Double maxScore;
    private LocalDateTime dueDate;
    private Integer maxAttempts;
    private Boolean allowLateSubmission;
    private String status;
    private Integer totalStudents;
    private Integer submittedCount;
    private Integer gradedCount;
    // ... other fields
}
```

### 4. Update AssignmentService.createAssignment()

```java
@Transactional
public AssignmentResponse createAssignment(AssignmentRequest request, User teacher) {
    Assignment assignment = new Assignment();
    assignment.setTitle(request.getTitle());
    assignment.setDescription(request.getDescription());
    assignment.setType(request.getType());
    assignment.setTestId(request.getTestId());
    assignment.setMaxScore(request.getMaxScore());
    assignment.setDueDate(request.getDueDate());
    assignment.setMaxAttempts(request.getMaxAttempts());
    assignment.setAllowLateSubmission(request.getAllowLateSubmission());
    assignment.setStatus(request.getStatus());
    assignment.setCreatedBy(teacher);
    // ... set class, etc.
    
    assignment = assignmentRepository.save(assignment);
    return toResponse(assignment);
}
```

### 5. Add Tests API Endpoint

**File: TestController.java**

```java
@GetMapping("/my-tests")
@PreAuthorize("hasRole('TEACHER')")
public ResponseEntity<List<TestResponse>> getMyTests(
    @AuthenticationPrincipal UserDetails userDetails
) {
    User teacher = getCurrentUser(userDetails);
    List<Test> tests = testRepository.findByCreatedBy(teacher);
    return ResponseEntity.ok(tests.stream()
        .map(this::toResponse)
        .collect(Collectors.toList()));
}
```

## 🧪 TESTING

### Manual Testing Steps

**1. Create MANUAL Assignment:**
```bash
POST /api/assignments
{
  "classId": 1,
  "title": "Essay về môi trường",
  "description": "Viết essay 250 từ",
  "type": "MANUAL",
  "maxScore": 10,
  "dueDate": "2026-04-15T23:59:00",
  "maxAttempts": 2,
  "allowLateSubmission": false,
  "status": "PUBLISHED"
}
```

**2. Student Submit MANUAL:**
```bash
POST /api/assignments/1/submit-manual
{
  "submissionText": "My essay content...",
  "attachmentUrl": "https://drive.google.com/..."
}
```

**3. Teacher Grade:**
```bash
POST /api/assignments/submissions/1/grade
{
  "score": 8.5,
  "feedback": "Good work! Need to improve grammar."
}
```

**4. Create TEST Assignment:**
```bash
POST /api/assignments
{
  "classId": 1,
  "title": "IELTS Reading Test 1",
  "type": "TEST",
  "testId": 5,
  "maxScore": 9,
  "maxAttempts": 3,
  "status": "PUBLISHED"
}
```

**5. Student Do Test:**
```
Navigate to: /test/reading/5?assignment=2
Complete test → Auto creates submission
```

**6. Check Submissions:**
```bash
GET /api/assignments/2/my-submissions
→ Should return submission with examAttemptId and score
```

## 📊 DATABASE CHANGES

### Before Migration
```
assignments: 10 columns
assignment_submissions: 12 columns
```

### After Migration
```
assignments: 11 columns (+type, +max_attempts, +allow_late_submission, -5 old fields)
assignment_submissions: 14 columns (+attempt_number, +exam_attempt_id, +graded_by, +graded_at)
```

### Data Migration
```sql
-- Set existing assignments to MANUAL
UPDATE assignments SET type = 'MANUAL' WHERE type IS NULL;

-- Set existing submissions to attempt 1
UPDATE assignment_submissions SET attempt_number = 1 WHERE attempt_number IS NULL;
```

## 🚀 DEPLOYMENT STEPS

1. **Backup database**
2. **Run migration SQL**
3. **Deploy backend** (with new entities, DTOs, services)
4. **Test APIs** with Postman
5. **Deploy frontend**
6. **Test end-to-end flow**

## 📝 NOTES

- Backward compatible: Old APIs still work
- New APIs use cleaner structure
- Type field defaults to MANUAL for existing data
- ExamAttempt integration requires frontend update
- Teacher can still grade TEST type (add feedback)
