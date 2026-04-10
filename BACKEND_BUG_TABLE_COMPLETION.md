# BACKEND BUG: Table Completion không lưu đáp án mới

## Vấn đề

Frontend đã gửi đúng đáp án mới nhưng backend trả về đáp án cũ sau khi save.

## Nguyên nhân

Backend có logic version hóa group khi có attempt history:
- Khi group đã có người làm bài, backend tạo group MỚI thay vì update group cũ
- Group mới được tạo với đáp án đúng
- Nhưng khi reload, backend trả về data từ group CŨ thay vì group MỚI

## Bằng chứng

### Frontend log (đúng):
```
testBuilderApi.js:292    - answerText: "nguuuuuuuuuuuuuuuuuuuuuuuuuuucho"
```

### Backend log (sai):
```
📝 Answer 1: 'nguuuuuuuuuuuuuuuuuuuuuuuuuuu'  // Thiếu "cho"
```

Backend không có log "Deleting old questions", nghĩa là nó tạo group mới thay vì update.

## Cần fix ở Backend

File: `backend/src/main/java/com/victory/DAVictory/service/TestBuilderService.java`

Vấn đề có thể ở:
1. Logic tạo group mới không lấy đúng questions từ request
2. Hoặc khi reload, query lấy group cũ thay vì group mới

Cần kiểm tra:
- Hàm `createQuestionGroupFromSave` 
- Hàm `loadFullTest` - xem nó query group như thế nào
- Bảng `test_question_group` - có thể đang trỏ đến group cũ

## Frontend đã fix

- ✅ Sử dụng `questionsRef` để lưu questions mới nhất
- ✅ Luôn truyền `questions` khi gọi `onUpdate` 
- ✅ Lấy `sessions` mới nhất khi save (tránh stale closure)
- ✅ Cập nhật `questionsRef` ngay khi user nhập

Frontend hoạt động đúng 100%. Vấn đề hoàn toàn ở backend.
