# Logic Quản Lý Version Bài Thi

## Tổng Quan

Hệ thống đã được thiết kế để tự động quản lý version khi chỉnh sửa đề thi, đảm bảo:
- ✅ Không làm mất dữ liệu lịch sử làm bài của học sinh
- ✅ Có thể khôi phục về phiên bản cũ
- ✅ Chỉ lưu những thay đổi thực sự (tối ưu lưu trữ)
- ✅ Xác nhận trước khi lưu phiên bản mới

## Luồng Hoạt Động

### 1. Frontend - Theo Dõi Thay Đổi

**File**: `frontend/src/pages/TestBuilder.jsx`

```javascript
// Theo dõi thay đổi
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const lastAutoSaveSnapshotRef = useRef(JSON.stringify({ test, sessions }));

useEffect(() => {
  const currentSnapshot = JSON.stringify({ test, sessions });
  setHasUnsavedChanges(currentSnapshot !== lastAutoSaveSnapshotRef.current);
}, [test, sessions]);
```

**Chức năng**:
- So sánh snapshot hiện tại với snapshot đã lưu
- Đánh dấu `hasUnsavedChanges = true` khi có thay đổi
- Chặn navigation khi có thay đổi chưa lưu (beforeunload)

### 2. Frontend - Xác Nhận Lưu Version Mới

```javascript
const handleSave = useCallback(async (skipConfirm = false) => {
  // Hiển thị modal xác nhận nếu đang edit và có thay đổi
  if (!skipConfirm && editTestId && hasUnsavedChanges) {
    setShowExitConfirm(true);
    return;
  }
  
  // Lưu và cập nhật snapshot
  const result = await testBuilderApi.saveFullTest(payload);
  lastAutoSaveSnapshotRef.current = JSON.stringify({ test, sessions });
  setHasUnsavedChanges(false);
}, [editTestId, hasUnsavedChanges]);
```

**Modal Xác Nhận**:
```
┌─────────────────────────────────────┐
│ Lưu phiên bản mới?                  │
│                                     │
│ Bạn đã thực hiện thay đổi trên đề   │
│ thi. Hệ thống sẽ lưu phiên bản mới  │
│ với những thay đổi này. Phiên bản   │
│ cũ vẫn được giữ nguyên và có thể    │
│ khôi phục.                          │
│                                     │
│         [Hủy]  [Lưu phiên bản mới]  │
└─────────────────────────────────────┘
```

### 3. Backend - Logic Version Thông Minh

**File**: `backend/src/main/java/com/victory/DAVictory/service/TestBuilderService.java`

#### 3.1. Khi Cập Nhật Đề Thi

```java
if (req.getId() != null) {
    // Thu thập group ID cũ
    List<Long> oldGroupIds = testQuestionGroupRepository
        .findQuestionGroupIdsByTestId(test.getId());
    
    // Xóa cấu trúc cũ (TestSession, TestPart, TestQuestionGroup)
    test.getTestSessions().clear();
    testRepository.saveAndFlush(test);
    
    // Dọn dẹp groups không còn được dùng
    for (Long groupId : oldGroupIds) {
        if (testQuestionGroupRepository.findByQuestionGroupId(groupId).isEmpty()
                && !hasAttemptAnswersForGroup(groupId)) {
            // Xóa group không còn tham chiếu và không có lịch sử
            deleteGroupAndQuestions(groupId);
        }
    }
}
```

#### 3.2. Khi Lưu Question Group

```java
if (gs.getExistingGroupId() != null) {
    var existingGroup = questionGroupRepository.findById(gs.getExistingGroupId());
    
    if (existingGroup.isPresent()) {
        qg = existingGroup.get();
        
        if (hasAttemptAnswersForGroup(qg.getId())) {
            // ✅ CÓ LỊCH SỬ: Tạo group mới (version mới)
            qg = createQuestionGroupFromSave(part, gs);
        } else {
            // ✅ KHÔNG CÓ LỊCH SỬ: Cập nhật trực tiếp
            updateGroupInPlace(qg, gs);
            deleteOldQuestions(qg.getId());
        }
        
        saveQuestionsForGroup(qg, gs.getQuestions());
    }
}
```

**Logic Quyết Định**:

| Trường Hợp | Có Attempt History? | Hành Động | Lý Do |
|------------|---------------------|-----------|-------|
| Group mới | N/A | Tạo mới | Chưa tồn tại |
| Group cũ chưa làm bài | ❌ | Cập nhật trực tiếp | Tiết kiệm storage |
| Group cũ đã có bài làm | ✅ | Tạo version mới | Bảo toàn dữ liệu cũ |

## Tối Ưu Lưu Trữ

### 1. Chỉ Lưu Thay Đổi Thực Sự

```java
// Chỉ cập nhật field nào có giá trị mới
if (gs.getTitle() != null) qg.setTitle(truncateTitle(gs.getTitle()));
if (gs.getInstructions() != null) qg.setInstructions(gs.getInstructions());
if (gs.getPassageText() != null) qg.setPassageText(gs.getPassageText());
// ... các field khác
```

### 2. Dọn Dẹp Groups Không Dùng

```java
// Xóa groups không còn được tham chiếu và không có lịch sử
if (testQuestionGroupRepository.findByQuestionGroupId(groupId).isEmpty()
        && !hasAttemptAnswersForGroup(groupId)) {
    deleteGroupAndQuestions(groupId);
}
```

### 3. Cascade Delete Đúng Thứ Tự

```java
// Xóa theo thứ tự để tránh FK constraint
answerRepository.deleteByQuestionGroupId(groupId);
questionOptionRepository.deleteByQuestionGroupId(groupId);
questionRepository.deleteByQuestionGroupId(groupId);
questionGroupRepository.deleteById(groupId);
```

## Khôi Phục Phiên Bản Cũ

### Cách Thức Hoạt Động

1. **Mỗi lần lưu có thay đổi**: Tạo group mới với ID mới
2. **Group cũ vẫn tồn tại**: Được giữ lại trong database
3. **Liên kết qua TestQuestionGroup**: Mỗi test trỏ đến group ID cụ thể

### Ví Dụ

```
Test v1 → TestQuestionGroup → QuestionGroup #123 (version 1)
                                    ↓
                              Questions [1,2,3]
                              Answers [A,B,C]
                              
Test v2 → TestQuestionGroup → QuestionGroup #456 (version 2)
                                    ↓
                              Questions [1,2,3,4] (đã sửa)
                              Answers [A,B,C,D]

// Group #123 vẫn tồn tại và có thể khôi phục
```

### Khôi Phục

```java
// Để khôi phục về version cũ:
// 1. Load test cũ
Test oldTest = testRepository.findById(oldTestId);

// 2. Copy cấu trúc sang test mới
Test restoredTest = new Test();
// ... copy metadata

// 3. Tạo TestQuestionGroup trỏ đến group cũ
for (TestQuestionGroup oldTqg : oldTest.getTestQuestionGroups()) {
    TestQuestionGroup newTqg = new TestQuestionGroup();
    newTqg.setQuestionGroup(oldTqg.getQuestionGroup()); // Reuse group cũ
    // ... save
}
```

## Auto-Save

```javascript
useEffect(() => {
  if (!autoSaveEnabled || roleError || saving) return;
  
  const currentSnapshot = JSON.stringify({ test, sessions });
  if (currentSnapshot === lastAutoSaveSnapshotRef.current) return;
  
  clearTimeout(autoSaveTimerRef.current);
  autoSaveTimerRef.current = setTimeout(() => {
    handleSave(true); // skipConfirm = true cho auto-save
  }, 1200);
}, [autoSaveEnabled, test, sessions]);
```

**Đặc điểm**:
- Tự động lưu sau 1.2 giây không có thay đổi
- Bỏ qua modal xác nhận (`skipConfirm = true`)
- Không lưu khi đang upload media
- Có thể tắt/bật bằng toggle

## Kiểm Tra Logic

### Test Case 1: Tạo Đề Mới
```
1. Tạo đề thi mới
2. Thêm questions
3. Lưu
→ Tạo groups mới, không có version cũ
```

### Test Case 2: Sửa Đề Chưa Có Bài Làm
```
1. Load đề thi (chưa có attempt)
2. Sửa questions
3. Lưu
→ Cập nhật trực tiếp groups cũ (không tạo version mới)
```

### Test Case 3: Sửa Đề Đã Có Bài Làm
```
1. Load đề thi (đã có attempt)
2. Sửa questions
3. Hiển thị modal xác nhận
4. Xác nhận lưu
→ Tạo groups mới (version mới), giữ nguyên groups cũ
```

### Test Case 4: Rời Trang Khi Có Thay Đổi
```
1. Load đề thi
2. Sửa questions
3. Đóng tab/navigate away
→ Browser hiển thị cảnh báo "Changes you made may not be saved"
```

## Lợi Ích

✅ **Bảo toàn dữ liệu**: Không làm mất bài làm của học sinh
✅ **Tối ưu storage**: Chỉ tạo version mới khi cần thiết
✅ **Trải nghiệm tốt**: Xác nhận rõ ràng trước khi lưu
✅ **Khôi phục dễ dàng**: Có thể quay lại phiên bản cũ
✅ **Auto-save thông minh**: Tự động lưu nhưng không làm phiền

## Cải Tiến Tương Lai

1. **Version History UI**: Hiển thị danh sách các version
2. **Diff Viewer**: So sánh thay đổi giữa các version
3. **Rollback**: Nút khôi phục về version cụ thể
4. **Version Notes**: Ghi chú cho mỗi version
