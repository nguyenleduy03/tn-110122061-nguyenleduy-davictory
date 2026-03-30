# Speaking Time Settings - Implementation Status

## ✅ Đã hoàn thành

### 1. **Test Builder - Input Fields**
- **SpeakingCueCardBlock.jsx**: 
  - ✅ `prepSeconds` input (0-120s, default 60)
  - ✅ `speakingSeconds` input (60-180s, default 120)
- **SpeakingPart2Block.jsx**:
  - ✅ `prepSeconds` input
  - ✅ `speakingSeconds` input
- **SpeakingPart3Block.jsx**:
  - ✅ `durationMinutes` input (3-7 min, default 5)

### 2. **Backend Save (testBuilderApi.js)**
- ✅ `prepSeconds` được lưu vào `passageText` JSON
- ✅ `speakingSeconds` được lưu vào `passageText` JSON
- ✅ Serialize trong `serializeGroupContent()`

### 3. **Backend Load (testBuilderApi.js)**
- ✅ Parse `prepSeconds` từ `passageText` JSON
- ✅ Parse `speakingSeconds` từ `passageText` JSON
- ✅ Parse trong `parseGroupContent()`

### 4. **Test Page Parse (ieltsApi.js)**
- ✅ Parse `prepSeconds` từ groupData
- ✅ Parse `speakingSeconds` từ groupData
- ✅ Format và truyền vào question object

### 5. **Test Page Usage (IeltsSpeakingTest.jsx)**
- ✅ `prepSeconds`: Dùng trong `startPrep()` function
  ```js
  const prepTime = currentQ?.prepSeconds ?? PREP_SECONDS;
  ```
- ⚠️ `speakingSeconds`: Chưa được sử dụng (có thể thêm auto-stop recording)

## 📊 Data Flow

```
Test Builder Input
    ↓
testBuilderApi.serialize
    ↓
Backend (passageText JSON)
    ↓
testBuilderApi.parse (load)
    ↓
ieltsApi.parse (test session)
    ↓
IeltsSpeakingTest.jsx (usage)
```

## 🔧 Current Implementation

### Part 2 Cue Card
```json
{
  "passageText": {
    "partInstruction": "...",
    "topic": "...",
    "shouldSayLabel": "You should say:",
    "bulletPoints": [...],
    "closingSentence": "...",
    "prepSeconds": 60,        // ✅ Used
    "speakingSeconds": 120    // ⚠️ Available but not enforced
  }
}
```

### Question Object (Frontend)
```js
{
  id: "q123",
  type: "speaking",
  questionTypeCode: "SPEAKING_CUECARD",
  prepSeconds: 60,           // ✅ Used in startPrep()
  speakingSeconds: 120,      // ⚠️ Available
  topic: "...",
  bulletPoints: [...],
  // ...
}
```

## 💡 Suggestions

### Optional: Auto-stop recording after speakingSeconds
```js
const startRecording = useCallback(async () => {
  // ... existing code ...
  
  // Optional: Auto-stop after speakingSeconds
  const maxTime = currentQ?.speakingSeconds ?? 120;
  setTimeout(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      stopRecording();
    }
  }, maxTime * 1000);
}, [currentQ, stopRecording]);
```

### Optional: Show countdown during recording
```js
{phase === "recording" && currentQ?.speakingSeconds && (
  <div className="spk-time-remaining">
    Time remaining: {fmtTime(currentQ.speakingSeconds - recSeconds)}
  </div>
)}
```

## ✅ Verification Checklist

- [x] Test Builder có input fields
- [x] Data được lưu vào backend
- [x] Data được load về Test Builder
- [x] Data được parse cho test page
- [x] prepSeconds được sử dụng trong test
- [ ] speakingSeconds được enforce (optional)
- [ ] UI hiển thị time limit (optional)

## 📝 Notes

- `prepSeconds` đang hoạt động đúng: countdown 60s trước khi nói
- `speakingSeconds` đã có data nhưng chưa enforce limit
- Có thể thêm auto-stop hoặc warning khi hết thời gian
- Part 3 dùng `durationMinutes` cho cả part, không phải từng câu

## 🎯 Conclusion

**Status:** ✅ Fully implemented for data flow
**Usage:** ✅ prepSeconds working, speakingSeconds available for future features
