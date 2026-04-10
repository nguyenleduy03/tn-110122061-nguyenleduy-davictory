# Debug: Không Thấy Nút "Versions" Trong Danh Sách Đề Thi

## ✅ Checklist Kiểm Tra

### 1. Hard Refresh Browser
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```
Hoặc:
- Mở DevTools (F12)
- Right-click nút Refresh
- Chọn "Empty Cache and Hard Reload"

### 2. Kiểm Tra Console Errors
```
F12 → Console tab
Xem có lỗi JavaScript không
```

### 3. Restart Frontend Dev Server
```bash
cd frontend
npm run dev
```

### 4. Kiểm Tra Code Đã Đúng

**File**: `frontend/src/pages/TeacherTests.jsx`

**Dòng ~510**: TestRow phải có prop `onVersions`
```jsx
<TestRow
  key={test.id}
  test={test}
  onEdit={() => navigate(`/teacher/tests/${test.id}/edit`)}
  onDelete={() => setDeleteTarget(test)}
  onCreatePublicLink={() => handleCreatePublicLink(test)}
  onVersions={() => setVersionModalTest(test)}  // ← Phải có dòng này
  onRestore={() => handleRestore(test)}
  canRestore={canRestoreTest(test)}
  actionLoading={actionLoadingId === test.id}
/>
```

**Dòng ~565**: TestRow function phải nhận `onVersions`
```jsx
function TestRow({ test, onEdit, onDelete, onCreatePublicLink, onVersions, onRestore, canRestore, actionLoading }) {
  // ← onVersions phải có trong destructuring
```

**Dòng ~643**: Nút Versions phải dùng `onVersions`
```jsx
<ActionBtn
  icon={<Clock size={14} />}
  label="Versions"
  onClick={onVersions}  // ← Phải là onVersions, không phải setVersionModalTest
  color="#7c3aed"
  bgHover="#f3e8ff"
/>
```

### 5. Kiểm Tra Import
```jsx
import VersionHistoryModal from '../components/common/VersionHistoryModal';
```

### 6. Kiểm Tra State
```jsx
const [versionModalTest, setVersionModalTest] = useState(null);
```

### 7. Kiểm Tra Modal Render
```jsx
<VersionHistoryModal
  testId={versionModalTest?.id}
  isOpen={!!versionModalTest}
  onClose={() => setVersionModalTest(null)}
/>
```

## 🔍 Cách Test Nhanh

### Test 1: Console Log
Thêm vào TestRow:
```jsx
function TestRow({ test, onEdit, onDelete, onCreatePublicLink, onVersions, onRestore, canRestore, actionLoading }) {
  console.log('TestRow onVersions:', onVersions); // ← Thêm dòng này
  const [hovered, setHovered] = useState(false);
```

Mở Console (F12), xem có log ra không.

### Test 2: Click Test
Thêm alert:
```jsx
<ActionBtn
  icon={<Clock size={14} />}
  label="Versions"
  onClick={() => {
    alert('Versions clicked!');
    onVersions?.();
  }}
  color="#7c3aed"
  bgHover="#f3e8ff"
/>
```

### Test 3: Kiểm Tra Render
Mở React DevTools:
```
F12 → Components tab
Tìm TestRow component
Xem props có onVersions không
```

## 🐛 Các Lỗi Thường Gặp

### Lỗi 1: Browser Cache
**Triệu chứng**: Code đã sửa nhưng UI không thay đổi
**Giải pháp**: Hard refresh (Ctrl + Shift + R)

### Lỗi 2: Dev Server Chưa Restart
**Triệu chứng**: Sửa code nhưng không có hot reload
**Giải pháp**: 
```bash
cd frontend
# Ctrl + C để stop
npm run dev
```

### Lỗi 3: Build Lỗi Nhưng Không Thấy
**Triệu chứng**: Console có lỗi nhưng không để ý
**Giải pháp**: Mở Console (F12), xem có lỗi đỏ không

### Lỗi 4: Prop Không Được Truyền
**Triệu chứng**: onClick không hoạt động
**Giải pháp**: Kiểm tra TestRow có nhận prop `onVersions` không

## 📸 Screenshot Mong Đợi

Trong danh sách đề thi, mỗi dòng phải có 4 nút:

```
┌─────────────────────────────────────────────────────┐
│ 📄 Tên đề thi                                       │
│ Academic • Tạo bởi: teacher • Tạo ngày: 08/04/2026  │
│                                                     │
│ [✏️ Chỉnh sửa] [⏰ Versions] [🔗 Link] [🗑️ Thùng rác] │
└─────────────────────────────────────────────────────┘
```

Nút "Versions" phải:
- Icon: ⏰ (Clock)
- Màu: Tím (#7c3aed)
- Vị trí: Giữa "Chỉnh sửa" và "Link công khai"

## 🚀 Nếu Vẫn Không Thấy

### Option 1: Xem File Gốc
```bash
cat frontend/src/pages/TeacherTests.jsx | grep -A 5 "Versions"
```

Phải thấy:
```jsx
label="Versions"
onClick={onVersions}
```

### Option 2: Rebuild Hoàn Toàn
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run dev
```

### Option 3: Kiểm Tra Git
```bash
git status
git diff frontend/src/pages/TeacherTests.jsx
```

Xem có thay đổi chưa được commit không.

## ✅ Xác Nhận Hoạt Động

Khi nút "Versions" hoạt động đúng:

1. Click nút "Versions"
2. Modal hiển thị với tiêu đề "⏰ Lịch Sử Phiên Bản"
3. Nếu đề thi mới: "Chưa có lịch sử phiên bản"
4. Nếu đề thi cũ: Danh sách versions

## 📞 Nếu Vẫn Lỗi

Gửi screenshot của:
1. Trang danh sách đề thi
2. Console (F12 → Console tab)
3. Network tab (F12 → Network)
4. React DevTools (Components tab → TestRow)
