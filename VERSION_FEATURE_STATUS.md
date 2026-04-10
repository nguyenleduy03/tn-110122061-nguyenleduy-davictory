# Tính Năng Version - Trạng Thái Hiện Tại

## ✅ Đã Hoàn Thành

### 1. Logic Lưu Version (Backend + Frontend)
- ✅ Tự động tạo version mới khi có attempt history
- ✅ Cập nhật trực tiếp khi chưa có attempt (tối ưu storage)
- ✅ Modal xác nhận khi lưu phiên bản mới
- ✅ Thông báo "Đã lưu phiên bản mới thành công!"
- ✅ Chặn navigation khi có thay đổi chưa lưu

### 2. UI Cơ Bản
- ✅ Nút "Versions" trong trang quản lý đề thi (`TeacherTests.jsx`)
- ✅ Icon Clock để phân biệt với các nút khác

## 🚧 Cần Phát Triển Thêm

### 1. Backend API - Lấy Danh Sách Versions

**Endpoint cần tạo**: `GET /api/test-builder/{testId}/versions`

```java
// TestBuilderController.java
@GetMapping("/{testId}/versions")
public ResponseEntity<List<TestVersionDTO>> getTestVersions(@PathVariable Long testId) {
    // Lấy tất cả versions của test này
    // Dựa vào created_at, updated_at của question_groups
    // Hoặc tạo bảng test_versions riêng
}
```

**Cấu trúc dữ liệu**:
```json
[
  {
    "versionId": 1,
    "testId": 123,
    "createdAt": "2026-04-08T10:00:00",
    "createdBy": "teacher@example.com",
    "changesSummary": "Thêm 5 câu hỏi mới",
    "questionGroupIds": [1, 2, 3],
    "isCurrent": true
  },
  {
    "versionId": 2,
    "testId": 123,
    "createdAt": "2026-04-07T15:30:00",
    "createdBy": "teacher@example.com",
    "changesSummary": "Sửa đáp án câu 10",
    "questionGroupIds": [4, 5, 6],
    "isCurrent": false
  }
]
```

### 2. Backend API - Khôi Phục Version

**Endpoint cần tạo**: `POST /api/test-builder/{testId}/restore-version`

```java
// TestBuilderController.java
@PostMapping("/{testId}/restore-version")
public ResponseEntity<TestDTO> restoreVersion(
    @PathVariable Long testId,
    @RequestBody RestoreVersionRequest request
) {
    // 1. Load version cũ (question_groups cũ)
    // 2. Tạo test mới hoặc cập nhật test hiện tại
    // 3. Trỏ TestQuestionGroup đến groups cũ
    // 4. Return test đã restore
}
```

### 3. Frontend - Modal Lịch Sử Versions

**Component mới**: `VersionHistoryModal.jsx`

```jsx
function VersionHistoryModal({ testId, isOpen, onClose, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && testId) {
      loadVersions();
    }
  }, [isOpen, testId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await testBuilderApi.getTestVersions(testId);
      setVersions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Lịch Sử Phiên Bản</h2>
      {loading ? (
        <Loader />
      ) : (
        <div>
          {versions.map(v => (
            <VersionRow
              key={v.versionId}
              version={v}
              onRestore={() => onRestore(v.versionId)}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
```

### 4. Frontend - Tích Hợp vào TeacherTests

```jsx
// TeacherTests.jsx
const [versionModalTest, setVersionModalTest] = useState(null);

<ActionBtn
  icon={<Clock size={14} />}
  label="Versions"
  onClick={() => setVersionModalTest(test)}
  color="#7c3aed"
  bgHover="#f3e8ff"
/>

<VersionHistoryModal
  testId={versionModalTest?.id}
  isOpen={!!versionModalTest}
  onClose={() => setVersionModalTest(null)}
  onRestore={async (versionId) => {
    await testBuilderApi.restoreVersion(versionModalTest.id, versionId);
    await fetchTests();
    setVersionModalTest(null);
  }}
/>
```

## 📊 Cách Tracking Versions

### Option 1: Dựa vào QuestionGroup (Hiện tại)

**Ưu điểm**:
- Không cần thêm bảng mới
- Tự động track qua `created_at` của groups

**Nhược điểm**:
- Khó biết version nào thuộc về lần save nào
- Không có metadata (ai sửa, sửa gì)

**Query**:
```sql
SELECT DISTINCT
    qg.created_at as version_date,
    qg.id as group_id,
    u.username as created_by
FROM test_question_groups tqg
JOIN question_groups qg ON tqg.question_group_id = qg.id
LEFT JOIN users u ON qg.created_by_user_id = u.id
WHERE tqg.test_id = ?
ORDER BY qg.created_at DESC;
```

### Option 2: Tạo Bảng test_versions (Khuyến nghị)

**Schema**:
```sql
CREATE TABLE test_versions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    test_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id BIGINT,
    changes_summary TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (test_id) REFERENCES tests(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE test_version_groups (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    version_id BIGINT NOT NULL,
    question_group_id BIGINT NOT NULL,
    FOREIGN KEY (version_id) REFERENCES test_versions(id),
    FOREIGN KEY (question_group_id) REFERENCES question_groups(id)
);
```

**Ưu điểm**:
- Rõ ràng, dễ query
- Có metadata đầy đủ
- Dễ so sánh versions

**Nhược điểm**:
- Cần migrate data
- Thêm complexity

## 🎯 Roadmap Phát Triển

### Phase 1: Hiển Thị Lịch Sử (1-2 ngày)
- [ ] Backend: API lấy danh sách versions
- [ ] Frontend: Modal hiển thị lịch sử
- [ ] UI: Timeline view cho versions

### Phase 2: Khôi Phục Version (1 ngày)
- [ ] Backend: API restore version
- [ ] Frontend: Nút "Khôi phục" trong modal
- [ ] Xác nhận trước khi restore

### Phase 3: So Sánh Versions (2-3 ngày)
- [ ] Backend: API so sánh 2 versions
- [ ] Frontend: Diff viewer
- [ ] Highlight thay đổi (added/removed/modified)

### Phase 4: Version Notes (1 ngày)
- [ ] Cho phép thêm ghi chú khi lưu version
- [ ] Hiển thị notes trong lịch sử

## 💡 Gợi Ý Implementation

### Cách Đơn Giản Nhất (Không Cần Bảng Mới)

```java
// TestBuilderService.java
public List<TestVersionDTO> getTestVersions(Long testId) {
    // 1. Lấy tất cả question_groups từng được dùng bởi test này
    List<QuestionGroup> allGroups = questionGroupRepository
        .findHistoricalGroupsByTestId(testId);
    
    // 2. Group theo created_at (cùng ngày = cùng version)
    Map<LocalDate, List<QuestionGroup>> versionMap = allGroups.stream()
        .collect(Collectors.groupingBy(g -> 
            g.getCreatedAt().toLocalDate()
        ));
    
    // 3. Convert sang DTO
    return versionMap.entrySet().stream()
        .map(entry -> new TestVersionDTO(
            entry.getKey(),
            entry.getValue()
        ))
        .sorted(Comparator.comparing(TestVersionDTO::getDate).reversed())
        .collect(Collectors.toList());
}
```

### Repository Method

```java
// QuestionGroupRepository.java
@Query("""
    SELECT DISTINCT qg FROM QuestionGroup qg
    JOIN TestQuestionGroup tqg ON qg.id = tqg.questionGroup.id
    WHERE tqg.testPart.testSession.test.id = :testId
    ORDER BY qg.createdAt DESC
""")
List<QuestionGroup> findHistoricalGroupsByTestId(@Param("testId") Long testId);
```

## 📝 Tóm Tắt

**Hiện trạng**:
- ✅ Logic lưu version đã hoàn chỉnh
- ✅ UI có nút "Versions" 
- ❌ Chưa có modal hiển thị lịch sử
- ❌ Chưa có API lấy versions
- ❌ Chưa có chức năng restore

**Ưu tiên tiếp theo**:
1. Tạo API `getTestVersions()` (backend)
2. Tạo `VersionHistoryModal` (frontend)
3. Tích hợp modal vào `TeacherTests.jsx`
4. Test và polish UI

**Thời gian ước tính**: 2-3 ngày cho version history cơ bản
