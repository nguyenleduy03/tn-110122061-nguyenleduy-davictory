# Hướng dẫn tính năng tùy chỉnh khoảng cách dòng (Line Height)

## ✅ Đã hoàn thành

### Vị trí: Toolbar toàn cục (BuilderHeader)

Dropdown **"↕ Khoảng cách dòng"** đã được thêm vào phần **"Đoạn văn"** trên toolbar chính.

## Cách hoạt động:

1. **Click vào contentEditable** (title, instructions, noteText...)
2. **Chọn line-height** từ dropdown
3. **Nội dung được wrap** trong `<div data-line-height-wrapper="true" style="line-height: X.X">...</div>`
4. **Inline style được lưu** vào HTML khi save
5. **Khi render trang thi** → Inline style hiển thị đúng

### Ví dụ HTML sau khi chọn line-height 2.0:

```html
<div data-line-height-wrapper="true" style="line-height: 2.0">
  Nội dung câu hỏi ở đây...
  <span class="rbe-blank">1</span>
  Tiếp tục nội dung...
</div>
```

## Vị trí trong toolbar:

```
[Lịch sử] | [Phông chữ] | [Chữ] | [Màu sắc] | [Đoạn văn] | [Kiểu chữ]
                                              ↑
                                    [≡] [≡] [⇤] [⇥] [↕ Mặc định ▼]
                                                     ↑ Ở đây!
```

## Đã sửa CSS:

### 1. testBuilder.css
- ✅ Xóa `line-height: 2.4` khỏi `.pv-note-text`
- ✅ Xóa `line-height: 2` khỏi `.rbe-editor`

### 2. ieltsTest.css
- ✅ Xóa `line-height: var(...)` khỏi `.summary-text`
- ✅ Xóa `line-height: 1.1` khỏi `.reading-page .summary-text`

→ **Inline style từ editor giờ có ưu tiên cao nhất**

## Ưu điểm:

✅ **Toàn cục** - Áp dụng cho mọi contentEditable trong canvas  
✅ **Trực quan** - Bôi đen và chọn như công cụ format khác  
✅ **Không cần database** - Lưu trực tiếp vào HTML  
✅ **Tương thích** - Hoạt động cả trong builder và trang thi  
✅ **Persistent** - Giữ nguyên khi render trang thi  

## Giá trị:

- **Mặc định** - Xóa line-height (dùng browser default ~1.2)
- **1.5** - Sát nhau
- **1.8** - Vừa phải
- **2.0** - Thoáng
- **2.2** - Rộng
- **2.4** - Rất rộng
- **2.6** - Cực rộng

## Files đã thay đổi:

1. `/frontend/src/components/testBuilder/BuilderHeader.jsx`
   - Thêm dropdown line-height vào phần "Đoạn văn"
   - Logic: Áp dụng `style.lineHeight` vào element đang focus

2. `/frontend/src/styles/testBuilder.css`
   - Xóa `line-height` cố định khỏi `.pv-note-text`
   - Xóa `line-height` cố định khỏi `.rbe-editor`

3. `/frontend/src/styles/ieltsTest.css`
   - Xóa `line-height` cố định khỏi `.summary-text`
   - Xóa `line-height` override khỏi `.reading-page .summary-text`

## Không cần:

❌ Thay đổi database  
❌ Migration SQL  
❌ Restart backend  
❌ Thay đổi API  

Chỉ cần reload frontend là dùng được ngay!



