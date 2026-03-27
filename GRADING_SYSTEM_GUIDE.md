# Hệ thống chấm bài 4 kỹ năng IELTS

## 📋 Tổng quan

Hệ thống chấm bài hoàn chỉnh cho cả 4 kỹ năng IELTS:
- ✅ **Listening & Reading**: Tự động chấm + chấm lại thủ công
- ✅ **Writing**: Chấm theo 4 tiêu chí IELTS
- ✅ **Speaking**: Chấm theo 4 tiêu chí IELTS

---

## 🎯 Chức năng đã implement

### 1. Writing Grading (Chấm bài viết)

**Backend:**
- `POST /api/writing/grade/{submissionId}` - Chấm bài Writing
- `GET /api/writing/criteria` - Lấy danh sách tiêu chí

**Frontend:**
- `/teacher/grade/writing/:id` - Trang chấm bài Writing

**Tiêu chí chấm (4 criteria):**
1. Task Achievement (Hoàn thành yêu cầu)
2. Coherence & Cohesion (Mạch lạc)
3. Lexical Resource (Từ vựng)
4. Grammatical Range & Accuracy (Ngữ pháp)

**Cách sử dụng:**
1. Teacher vào danh sách submissions
2. Click vào bài Writing cần chấm
3. Chấm điểm từng tiêu chí (0-9, bước 0.5)
4. Viết feedback cho từng tiêu chí
5. Viết nhận xét tổng quan
6. Lưu điểm → Band score tự động tính

---

### 2. Speaking Grading (Chấm bài nói)

**Backend:**
- `POST /api/speaking/grade/{attemptId}` - Chấm bài Speaking

**Frontend:**
- `/teacher/grade/speaking/:id` - Trang chấm bài Speaking

**Tiêu chí chấm (4 criteria):**
1. Fluency & Coherence (Trôi chảy & mạch lạc)
2. Lexical Resource (Từ vựng)
3. Grammatical Range & Accuracy (Ngữ pháp)
4. Pronunciation (Phát âm)

**Cách sử dụng:**
1. Teacher vào danh sách speaking attempts
2. Nghe audio recording
3. Chấm điểm 4 tiêu chí (0-9, bước 0.5)
4. Viết feedback
5. Lưu điểm → Band score tự động tính

---

### 3. Listening & Reading (Đã có sẵn)

**Backend:**
- `POST /api/exam-attempts/{id}/grade` - Chấm lại thủ công
- Tự động chấm khi submit

**Cách sử dụng:**
- Tự động chấm khi học sinh submit
- Teacher có thể chấm lại nếu cần điều chỉnh

---

## 🔧 Cấu trúc Database

### Writing Scores
```sql
writing_scores
├── id
├── submission_id (FK)
├── criteria_id (FK)
├── score (0-9)
├── feedback
├── scored_by (FK user)
└── scored_at
```

### Speaking Scores
```sql
speaking_scores
├── id
├── speaking_attempt_id (FK)
├── fluency_coherence
├── lexical_resource
├── grammatical_range_accuracy
├── pronunciation
├── overall_band_score
├── scored_by (FK user)
└── scored_at
```

---

## 📊 Quy tắc tính Band Score

### Làm tròn IELTS:
- < 0.25 → làm tròn xuống (7.2 → 7.0)
- 0.25-0.74 → làm tròn 0.5 (7.3 → 7.5)
- ≥ 0.75 → làm tròn lên (7.8 → 8.0)

### Ví dụ:
```
Writing: (7.0 + 7.5 + 8.0 + 7.0) / 4 = 7.375 → 7.5
Speaking: (8.0 + 7.5 + 7.5 + 8.0) / 4 = 7.75 → 8.0
```

---

## 🚀 Cách test

### 1. Test Writing Grading
```bash
# Tạo submission trước (student submit bài)
POST /api/writing/submit
{
  "questionGroupId": 1,
  "essayText": "My essay...",
  "wordCount": 250
}

# Teacher chấm bài
POST /api/writing/grade/1
{
  "criteriaScores": [
    {"criteriaId": 1, "score": 7.0, "feedback": "Good task achievement"},
    {"criteriaId": 2, "score": 7.5, "feedback": "Well organized"},
    {"criteriaId": 3, "score": 8.0, "feedback": "Rich vocabulary"},
    {"criteriaId": 4, "score": 7.0, "feedback": "Some grammar errors"}
  ],
  "overallFeedback": "Overall good essay, band 7.5"
}
```

### 2. Test Speaking Grading
```bash
POST /api/speaking/grade/1
{
  "fluencyCoherence": 7.5,
  "lexicalResource": 7.0,
  "grammaticalRangeAccuracy": 7.5,
  "pronunciation": 8.0,
  "feedback": "Good speaking performance"
}
```

---

## 📝 TODO tiếp theo

### Cần làm thêm:
1. ❌ Speaking recording & upload (chưa có)
2. ❌ API lấy danh sách speaking attempts
3. ❌ Tích hợp vào LMS submissions page
4. ❌ Email notification khi có điểm
5. ❌ Export điểm ra Excel

### Cải tiến:
- AI auto-grading cho Writing (GPT-4)
- Speech-to-text cho Speaking
- Plagiarism check cho Writing
- Pronunciation analysis cho Speaking

---

## 🎓 Hướng dẫn cho Teacher

### Workflow chấm bài:

1. **Vào LMS Dashboard** → Submissions
2. **Chọn loại bài cần chấm:**
   - Writing → Click "Grade" → Chấm 4 tiêu chí
   - Speaking → Click "Grade" → Nghe audio → Chấm 4 tiêu chí
   - Listening/Reading → Xem kết quả tự động (có thể chấm lại)
3. **Lưu điểm** → Học sinh nhận thông báo
4. **Xem analytics** → Theo dõi tiến độ lớp

---

## 🔐 Permissions

- **STUDENT**: Submit bài, xem điểm của mình
- **TEACHER**: Chấm bài học sinh trong lớp mình dạy
- **MANAGER**: Chấm tất cả bài trong center
- **ADMIN**: Full access

---

## 📞 Support

Nếu có lỗi:
1. Check backend logs: `.run/backend.log`
2. Check frontend console
3. Verify database có đủ criteria chưa
4. Test API với Postman/curl

---

**Hoàn thành:** 2026-03-27
**Version:** 1.0
**Status:** ✅ Ready for testing
