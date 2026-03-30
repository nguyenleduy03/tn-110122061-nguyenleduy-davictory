# Test Builder Media Storage - Current Implementation

## 📊 Hiện trạng

### Trang tạo đề đang lưu media ở **2 nơi:**

#### 1. **Base64 Data URL (Embedded trong JSON)** ⚠️
- **Cách hoạt động:** File được convert thành base64 string và lưu trực tiếp vào `audioUrl` / `imageUrl`
- **File:** `blockHelpers.js` - `loadImageFile()` và `loadAudioFile()`
- **Ví dụ:** `"data:image/png;base64,iVBORw0KGgoAAAANS..."`

**Ưu điểm:**
- ✅ Không cần server upload
- ✅ Không cần Google Drive
- ✅ Đơn giản, nhanh

**Nhược điểm:**
- ❌ File lớn → JSON rất lớn (vài MB)
- ❌ Chậm khi load/save test
- ❌ Database bloat
- ❌ Không tối ưu bandwidth

#### 2. **Google Drive URL (External)** ✅
- **API:** `fileApi.js` - `/files/upload`
- **Backend:** `FileUploadController.java`
- **Storage:** Google Drive
- **Ví dụ:** `"https://drive.google.com/uc?id=1abc..."`

**Ưu điểm:**
- ✅ File size không ảnh hưởng JSON
- ✅ Tối ưu bandwidth
- ✅ CDN của Google
- ✅ Có thể delete/manage files

**Nhược điểm:**
- ❌ Cần Google Drive authorization
- ❌ Phụ thuộc external service
- ❌ Cần handle upload errors

---

## 🔍 Chi tiết Implementation

### Frontend - Test Builder

#### Load Image/Audio (Base64)
```js
// blockHelpers.js
export const loadImageFile = (file, setImageUrl) => {
  const reader = new FileReader();
  reader.onload = () => {
    const rawDataUrl = String(reader.result || '');
    setImageUrl(rawDataUrl); // ← Lưu base64 vào state
    
    // Compress image
    fileToCompressedDataUrl(file)
      .then((dataUrl) => setImageUrl(dataUrl))
      .catch((err) => console.error('Image upload failed:', err));
  };
  reader.readAsDataURL(file);
};
```

#### Upload to Google Drive (URL)
```js
// fileApi.js
uploadFile: async (file, mediaType, module) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mediaType', mediaType);
  formData.append('module', module);
  
  const response = await axios.post(`${API_BASE_URL}/files/upload`, formData);
  return response.data; // { id, url, fileName, mediaType }
}
```

### Backend - File Upload

```java
// FileUploadController.java
@PostMapping("/upload")
public ResponseEntity<?> uploadFile(
    @RequestParam("file") MultipartFile file,
    @RequestParam("mediaType") String mediaType,
    @RequestParam("module") String module
) {
    // Upload to Google Drive
    String fileId = googleDriveService.uploadFile(file);
    String publicUrl = googleDriveService.getPublicUrl(fileId);
    
    // Save to database
    MediaFile mediaFile = new MediaFile();
    mediaFile.setFileId(fileId);
    mediaFile.setUrl(publicUrl);
    mediaFile.setMediaType(mediaType);
    mediaFileRepository.save(mediaFile);
    
    return ResponseEntity.ok(mediaFile);
}
```

---

## 📂 Các Block sử dụng Media

### Audio Blocks
1. **AudioBlock** (Listening)
   - Input: URL hoặc file upload
   - Storage: Base64 hoặc Drive URL
   - Usage: `group.audioUrl`

### Image Blocks
1. **ImageBlock** (Reading diagrams)
2. **ImageNoteFormBlock** (Form với ảnh)
3. **WritingTaskBlock** (Task 1 charts)
4. **PassageBlock** (Paragraph images)
5. **MultipleChoiceBlock** (Options với ảnh)
6. **SharedOptionsDropdownBlock** (Options với ảnh)

### Current Behavior
```jsx
// Tất cả blocks đều dùng pattern này:
<input type="file" onChange={(e) => {
  const file = e.target.files[0];
  loadImageFile(file, (imageUrl) => {
    onUpdate(group.id, { imageUrl }); // ← Lưu base64
  });
}} />

// Hoặc nhập URL trực tiếp:
<input 
  value={group.imageUrl || ''} 
  onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })}
/>
```

---

## ⚠️ Vấn đề hiện tại

### 1. **Không sử dụng Google Drive Upload API**
- API đã có: `fileApi.uploadFile()`
- Nhưng blocks không gọi API này
- Vẫn dùng base64 embed

### 2. **JSON Size quá lớn**
- Test có nhiều ảnh/audio → JSON vài MB
- Chậm khi save/load
- Database performance issue

### 3. **Không có progress indicator**
- User không biết upload đang chạy
- Không có error handling rõ ràng

### 4. **Mixed storage**
- Có thể nhập URL (Drive/external)
- Có thể upload file (base64)
- Không consistent

---

## ✅ Giải pháp đề xuất

### Option 1: Chuyển hoàn toàn sang Google Drive
```jsx
// AudioBlock.jsx - Updated
const handleFileUpload = async (file) => {
  setUploading(true);
  try {
    const result = await fileApi.uploadListeningAudio(file);
    onUpdate(group.id, { 
      audioUrl: result.url,
      audioFileId: result.id 
    });
    alert('Upload thành công!');
  } catch (error) {
    alert('Upload thất bại: ' + error.message);
  } finally {
    setUploading(false);
  }
};
```

### Option 2: Hybrid (Smart choice)
```jsx
// Tự động chọn storage dựa trên file size
const handleFileUpload = async (file) => {
  const MAX_EMBED_SIZE = 100 * 1024; // 100KB
  
  if (file.size < MAX_EMBED_SIZE) {
    // Small file: embed as base64
    loadImageFile(file, (imageUrl) => {
      onUpdate(group.id, { imageUrl });
    });
  } else {
    // Large file: upload to Drive
    const result = await fileApi.uploadImage(file);
    onUpdate(group.id, { 
      imageUrl: result.url,
      imageFileId: result.id 
    });
  }
};
```

### Option 3: User choice
```jsx
<div className="upload-options">
  <button onClick={() => setUploadMode('embed')}>
    Embed (Fast, small files)
  </button>
  <button onClick={() => setUploadMode('drive')}>
    Google Drive (Large files)
  </button>
</div>
```

---

## 🎯 Recommendation

### Immediate Action (Quick Fix)
1. Thêm option upload to Drive cho các blocks chính:
   - AudioBlock
   - ImageBlock
   - WritingTaskBlock

2. Giữ base64 cho backward compatibility

3. Thêm file size warning:
   ```jsx
   if (file.size > 500 * 1024) {
     alert('File lớn hơn 500KB. Nên upload lên Google Drive để tối ưu performance.');
   }
   ```

### Long-term Solution
1. Migrate tất cả media sang Google Drive
2. Script convert base64 → Drive URLs
3. Remove base64 support
4. Add media library/manager

---

## 📊 Current Status Summary

| Feature | Status | Storage |
|---------|--------|---------|
| Audio upload | ✅ Working | Base64 |
| Image upload | ✅ Working | Base64 |
| URL input | ✅ Working | External |
| Drive API | ✅ Available | Not used |
| File size limit | ❌ None | N/A |
| Progress indicator | ❌ None | N/A |
| Error handling | ⚠️ Basic | N/A |

---

## 🔧 Files to Update

1. `blockHelpers.js` - Add Drive upload option
2. `AudioBlock.jsx` - Use Drive API
3. `ImageBlock.jsx` - Use Drive API
4. `WritingTaskBlock.jsx` - Use Drive API
5. `ImageNoteFormBlock.jsx` - Use Drive API
6. `PassageBlock.jsx` - Use Drive API

---

**Kết luận:** Hiện tại trang tạo đề đang lưu media dưới dạng **Base64 embedded trong JSON**, mặc dù đã có sẵn Google Drive upload API nhưng chưa được sử dụng.
