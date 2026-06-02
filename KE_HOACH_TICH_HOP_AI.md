# KẾ HOẠCH TÍCH HỢP AI — ĐỒ ÁN TỐT NGHIỆP DAVICTORY

## TỔNG QUAN

DAVictory hiện đã hoàn thiện toàn bộ chức năng nền tảng thi IELTS: Test Builder, Exam Attempt (4 kỹ năng),
chấm điểm tự động Listening/Reading, chấm tay Writing/Speaking, Class Management, Assignment, Statistics.
**Điểm còn thiếu để tạo đột phá chính là tích hợp AI.**

Tài liệu này vạch ra lộ trình tích hợp AI vào hệ thống, tập trung vào các tính năng **thực tế, khả thi
trong 4-5 tuần, và gây ấn tượng mạnh với hội đồng bảo vệ**.

---

## NGUYÊN TẮC CỐT LÕI

1. **AI là công cụ hỗ trợ, không thay thế chuyên môn IELTS.** Việc tạo đề thi IELTS đòi hỏi chuyên môn
   sâu từ hội đồng ra đề — AI không thể và không nên thay thế con người trong khâu này.
2. **AI tập trung vào khâu hậu kỳ:** chấm bài, phân tích, đưa ra chiến lược cải thiện, giải thích đáp án.
3. **Giáo viên vẫn là trung tâm.** AI đưa ra gợi ý, giáo viên phê duyệt hoặc điều chỉnh.
4. **Minh bạch:** Mọi output của AI đều được gắn nhãn rõ ràng, có confidence score.

---

## KIẾN TRÚC AI TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │AI Grading│ │AI Analyze│ │AI Explain│ │AI Coach/Chat │   │
│  │ Panel    │ │ Dashboard│ │ Popup    │ │ Panel        │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        ▼            ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                BACKEND (Spring Boot)                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   AI Core Layer                       │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │   │
│  │  │AIClient  │  │PromptManager │  │AICacheService │   │   │
│  │  │Service   │  │(template mgr)│  │(cache + quota)│   │   │
│  │  └──────────┘  └──────────────┘  └───────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐   │
│  │AIGrading    │ │AIAnalysis    │ │ AI Agent Services    │   │
│  │Service      │ │Service       │ │ ┌─────────────────┐ │   │
│  │• Writing    │ │• Progress    │ │ │ExplainAgent     │ │   │
│  │• Speaking   │ │• Prediction  │ │ └─────────────────┘ │   │
│  └─────────────┘ │• Strategy    │ │ ┌─────────────────┐ │   │
│                  └──────────────┘ │ │WritingCoach     │ │   │
│                                   │ └─────────────────┘ │   │
│                                   │ ┌─────────────────┐ │   │
│                                   │ │SpeakingPartner  │ │   │
│                                   │ └─────────────────┘ │   │
│                                   └─────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     AI Admin Controller (API Key, Model, Config)     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   External LLM APIs     │
              │  • Google Gemini (free) │
              │  • OpenAI GPT-4o-mini   │
              │  • Groq (fast+free)     │
              └─────────────────────────┘
```

---

## GIAI ĐOẠN 1: AI CHẤM WRITING TỰ ĐỘNG

> **Tác động:** Rất cao — Writing là kỹ năng khó chấm nhất, tốn nhiều thời gian của giáo viên nhất.
> **Thời gian:** 7-10 ngày

### 1.1 Backend — AI Client Service

```java
// AIClientService.java — Base class gọi LLM API
@Service
public class AIClientService {
    private final RestClient restClient;
    private final AIConfig aiConfig;        // API key, model name, base URL

    public AIResponse callLLM(String systemPrompt, String userPrompt,
                               ResponseSchema schema) { ... }

    // Hỗ trợ đa provider: OpenAI, Gemini, Groq
    // Retry 3 lần nếu lỗi network
    // Timeout 30s cho chấm bài, 10s cho các tác vụ khác
}
```

### 1.2 Backend — AI Chấm Writing

```java
// AIGradingService.java
public class AIGradingService {

    // Prompt template dựa trên IELTS Writing Band Descriptors chính thức
    // Output: JSON có cấu trúc { overallBand, criteria: { TR, CC, LR, GRA }, feedback, sampleCorrection }
    public AIGradingResult gradeWriting(StudentWritingSubmission submission) { ... }

    // Chấm hàng loạt cho teacher
    public List<AIGradingResult> batchGrade(List<Long> submissionIds) { ... }
}
```

**Prompt Engineering approach:**
- System prompt chứa **IELTS Writing Band Descriptors** (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy)
- User prompt chứa đề bài + bài viết của student
- Yêu cầu LLM trả về **strict JSON format**
- Có example few-shot để tăng độ chính xác
- Confidence score dựa trên consistency của LLM output

### 1.3 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/ai/writing/grade` | Chấm 1 bài Writing |
| `POST` | `/api/ai/writing/batch-grade` | Chấm hàng loạt |
| `GET`  | `/api/ai/writing/grade/{id}` | Xem kết quả đã chấm |
| `POST` | `/api/ai/writing/grade/{id}/approve` | GV phê duyệt điểm AI |

### 1.4 Frontend

- **Teacher Grading Page:** Thêm nút "Chấm bằng AI" bên cạnh chấm tay.
  Hiển thị kết quả AI dạng comparison: AI score vs blank để GV tự điền.
  GV có thể: Dùng luôn / Chỉnh sửa / Từ chối.
- **Student Result Page:** Badge "AI Graded" kèm tooltip "Điểm do AI chấm, đã được giáo viên phê duyệt".
  Feedback phân tích chi tiết từng tiêu chí dưới dạng card.

---

## GIAI ĐOẠN 2: AI PHÂN TÍCH & CHIẾN LƯỢC

> **Tác động:** Cao — Tận dụng dữ liệu có sẵn, tạo giá trị cho người dùng.
> **Thời gian:** 5-7 ngày

### 2.1 AI Progress Analyzer (Phân tích tiến độ)

**Input:** Toàn bộ lịch sử làm bài của 1 student (điểm các lần thi, điểm từng skill, từng dạng câu hỏi)
**Output:**
- Điểm mạnh / điểm yếu theo từng skill (có %)
- Dạng câu hỏi làm tốt nhất / kém nhất (VD: MCQ 80% đúng, Matching Headings 35% đúng)
- Xu hướng điểm theo thời gian (tăng/giảm/ổn định)
- So sánh với mặt bằng chung của lớp / hệ thống

```java
// AIAnalysisService.java
public ProgressAnalysis analyzeProgress(Long userId) { ... }
```

### 2.2 AI Study Plan Generator (Lộ trình học tập)

**Input:** Target band score + điểm hiện tại + thời gian còn lại đến ngày thi
**Output:** Lộ trình cá nhân hóa — mỗi tuần học gì, bao nhiêu giờ/skill, dạng bài nào cần ưu tiên

```java
public StudyPlan generateStudyPlan(Long userId, double targetBand,
                                    LocalDate examDate) { ... }
```

### 2.3 AI Band Score Predictor (Dự đoán band)

**Input:** Lịch sử thi của student (tối thiểu 3 lần)
**Output:** Band dự kiến nếu thi thật, confidence interval ±0.5, lý do dự đoán

```java
public BandPrediction predictBandScore(Long userId) { ... }
```

### 2.4 Dashboard AI Insights Widget

Frontend hiển thị trên Dashboard dưới dạng card "AI Insights":
- "Bạn còn yếu Matching Headings (35%), cần luyện thêm ít nhất 20 câu"
- "Band dự kiến hiện tại: 6.0 — Cần cải thiện Writing Task 2 để đạt 6.5"
- "Bạn đã tiến bộ 0.5 band trong 2 tuần qua — tiếp tục phát huy!"

---

## GIAI ĐOẠN 3: HỆ THỐNG AI AGENTS

> **Tác động:** Rất cao — Điểm sáng tạo, khác biệt với các đồ án khác.
> **Thời gian:** 7-10 ngày

### 3.1 AI Question Explainer Agent

**Mục tiêu:** Khi student làm sai 1 câu, AI giải thích tại sao sai, cách tư duy đúng.

```
Student click "Giải thích" trên 1 câu đã làm sai
        │
        ▼
Gửi: Nội dung passage/câu hỏi + đáp án student chọn + đáp án đúng
        │
        ▼
AI trả về:
  1. Tại sao đáp án của bạn sai (phân tích lỗi tư duy)
  2. Tại sao đáp án đúng là chính xác (evidence từ passage)
  3. Mẹo để tránh lỗi tương tự trong tương lai
  4. Từ vựng / ngữ pháp liên quan cần ôn tập
```

```java
// ExplainAgent.java
public QuestionExplanation explainWrongAnswer(
    Question question, String studentAnswer, String correctAnswer) { ... }
```

### 3.2 AI Writing Coach Agent

**Mục tiêu:** Hướng dẫn student viết bài từng bước, không phải viết hộ.

```
Student nhập đề bài Writing Task 2
        │
        ▼
AI Coach hướng dẫn theo pipeline:
  Bước 1: Brainstorm ideas (3-5 ideas, student chọn)
  Bước 2: Outline (AI gợi ý dàn bài, student chỉnh sửa)
  Bước 3: Student viết draft
  Bước 4: AI review draft → gợi ý paraphrase, vocab nâng cao
  Bước 5: Student hoàn thiện bài
  Bước 6: AI chấm sơ bộ → band dự kiến + điểm cần sửa
```

**Lưu ý:** Agent chỉ **hướng dẫn**, không **viết hộ**. Student vẫn phải tự viết bài.
Điều này đảm bảo tính sư phạm và tránh gian lận.

```java
// WritingCoachAgent.java
public CoachResponse brainstorm(String writingPrompt) { ... }
public CoachResponse generateOutline(String writingPrompt, List<String> chosenIdeas) { ... }
public CoachResponse reviewDraft(String originalPrompt, String studentDraft) { ... }
```

### 3.3 AI Speaking Partner Agent

**Mục tiêu:** Student luyện nói với AI như với người thật.

**Phiên bản tối thiểu (text-based, ưu tiên):**
```
1. AI hiển thị cue card (Speaking Part 2)
2. Student gõ câu trả lời (text)
3. AI phản hồi: fluency assessment, từ vựng gợi ý, sửa lỗi ngữ pháp
4. Conversation tiếp tục với follow-up questions như Part 3
```

**Phiên bản đầy đủ (cần Whisper API, làm nếu đủ thời gian):**
```
1. AI đọc cue card + phát âm thanh (TTS)
2. Student ghi âm câu trả lời
3. Whisper API chuyển speech → text
4. AI phân tích + chấm: Fluency, Pronunciation, Lexical, Grammar
5. Trả về feedback + band dự kiến
```

```java
// SpeakingPartnerAgent.java
public CueCardWithFollowUp startSpeakingSession(SpeakingPart part, String topic) { ... }
public SpeakingFeedback evaluateResponse(String cueCard, String studentResponse) { ... }
```

---

## GIAI ĐOẠN 4: AI ADMIN PANEL & INFRASTRUCTURE

> **Thời gian:** 5-7 ngày

### 4.1 Quản lý cấu hình AI

Trang Admin > AI Settings cho phép:
- Bật/tắt từng tính năng AI (Feature Flags)
- Chọn LLM provider (OpenAI / Gemini / Groq)
- Nhập API Key
- Chọn model (gpt-4o-mini / gemini-pro / groq-llama)
- Điều chỉnh temperature, max tokens
- Xem thống kê: số lượt gọi API, chi phí ước tính

### 4.2 Rate Limiting & Caching

- Giới hạn API calls: 50 lần/ngày/student, 200 lần/ngày/teacher
- Cache kết quả chấm bài (cùng bài + cùng model → trả cached result)
- Queue xử lý batch grading bằng Spring `@Async`
- Logging toàn bộ AI calls để debug prompt

### 4.3 Fallback Strategy

```
AI call thất bại (timeout/network/rate limit)?
  │
  ├─→ Retry 3 lần với exponential backoff
  │
  ├─→ Fallback: Trả lỗi friendly "AI đang bận, vui lòng thử lại sau"
  │
  └─→ Với grading: Tự động chuyển sang manual grading queue
```

---

## THỨ TỰ TRIỂN KHAI

| # | Module | Effort | Tác động | Ưu tiên |
|---|--------|--------|----------|---------|
| 1 | **AI Core (AIClient + PromptManager + Cache)** | 3 ngày | Nền tảng | 🔴 Bắt buộc |
| 2 | **AI Chấm Writing** | 5 ngày | Rất cao | 🔴 Số 1 |
| 3 | **AI Chấm Speaking (text-based)** | 3 ngày | Cao | 🟠 Số 2 |
| 4 | **AI Phân tích + Dashboard Insights** | 4 ngày | Cao | 🟠 Số 3 |
| 5 | **AI Question Explainer Agent** | 2 ngày | Trung bình | 🟡 Số 4 |
| 6 | **AI Writing Coach Agent** | 4 ngày | Cao | 🟡 Số 5 |
| 7 | **AI Speaking Partner (text)** | 4 ngày | Trung bình | 🟢 Số 6 |
| 8 | **AI Admin Panel** | 3 ngày | Hỗ trợ | 🟢 Số 7 |
| 9 | **AI Study Plan + Band Predictor** | 3 ngày | Trung bình | 🟢 Số 8 |

**Tổng thời gian ước tính:** 26-31 ngày, vừa khít với 4-5 tuần còn lại.

---

## CẤU TRÚC THƯ MỤC DỰ KIẾN

```
backend/src/main/java/com/victory/DAVictory/
├── ai/
│   ├── config/
│   │   └── AIConfig.java              # AI provider settings (API key, model, url)
│   ├── client/
│   │   ├── AIClientService.java       # Base LLM caller (OpenAI, Gemini, Groq)
│   │   └── AIClientResponse.java      # Standardized LLM response wrapper
│   ├── prompt/
│   │   ├── PromptTemplate.java        # Prompt template class
│   │   ├── PromptManager.java         # Load/manage prompt templates
│   │   └── templates/                 # Prompt template files (.txt/.json)
│   │       ├── writing_grading.txt    # Writing scoring prompt
│   │       ├── speaking_grading.txt   # Speaking scoring prompt
│   │       ├── question_explain.txt   # Question explanation prompt
│   │       ├── progress_analyze.txt   # Progress analysis prompt
│   │       ├── study_plan.txt         # Study plan generation prompt
│   │       └── band_predict.txt       # Band prediction prompt
│   ├── grading/
│   │   ├── AIGradingService.java      # AI grading orchestration
│   │   ├── WritingAIGrader.java       # Writing-specific grading logic
│   │   ├── SpeakingAIGrader.java      # Speaking-specific grading logic
│   │   └── dto/
│   │       ├── AIGradingRequest.java
│   │       ├── AIGradingResult.java
│   │       └── CriteriaScore.java     # TR, CC, LR, GRA breakdown
│   ├── analysis/
│   │   ├── AIAnalysisService.java     # Progress analysis + strategy
│   │   ├── BandPredictor.java         # Band score prediction
│   │   ├── StudyPlanGenerator.java    # Personalized study plan
│   │   └── dto/
│   │       ├── ProgressAnalysis.java
│   │       ├── BandPrediction.java
│   │       └── StudyPlan.java
│   ├── agent/
│   │   ├── BaseAgent.java             # Abstract agent class
│   │   ├── ExplainAgent.java          # Question explainer
│   │   ├── WritingCoachAgent.java     # Writing step-by-step coach
│   │   ├── SpeakingPartnerAgent.java  # Speaking practice partner
│   │   └── dto/
│   │       ├── QuestionExplanation.java
│   │       ├── CoachResponse.java
│   │       └── SpeakingFeedback.java
│   ├── controller/
│   │   └── AIController.java          # REST endpoints for AI features
│   ├── admin/
│   │   ├── AIAdminController.java     # Admin panel for AI settings
│   │   └── AICacheService.java        # Cache + rate limit service
│   └── exception/
│       ├── AIException.java           # Base AI exception
│       ├── AIQuotaExceededException.java
│       └── AIProviderException.java
│
frontend/src/
├── components/ai/
│   ├── AIGradingPanel.jsx             # AI grading result display
│   ├── AIInsightsCard.jsx             # Dashboard AI insights widget
│   ├── AIExplainModal.jsx             # Question explanation popup
│   ├── AIWritingCoach.jsx             # Writing coach step-by-step UI
│   ├── AISpeakingPartner.jsx          # Speaking practice chat UI
│   └── AIBadge.jsx                    # "AI Graded" / "AI Generated" badge
├── services/
│   └── aiApi.js                       # API calls for AI endpoints
└── hooks/
    └── useAI.js                       # Hook for AI feature state management
```

---

## CÔNG NGHỆ ĐỀ XUẤT

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| LLM Provider | Google Gemini (primary) | Miễn phí 1500 req/ngày, hỗ trợ tiếng Việt tốt |
| LLM Fallback | Groq (Llama 3) | Miễn phí, siêu nhanh, tốt cho tác vụ đơn giản |
| LLM Premium | OpenAI GPT-4o-mini | $0.15/1M token, chất lượng cao nhất |
| HTTP Client | Spring RestClient (Java 21) | Native, không cần thêm dependency |
| JSON Parsing | Jackson (có sẵn) | Parse LLM JSON response |
| Async | Spring @Async + ThreadPool | Xử lý batch grading không block |
| Cache | Caffeine (in-memory) | Cache AI response, nhẹ, nhanh |

**Dependency thêm vào `pom.xml`:**
```xml
<!-- Caffeine Cache -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

---

## PROMPT ENGINEERING STRATEGY

Mỗi prompt template tuân theo cấu trúc:

```
1. ROLE: Bạn là giám khảo IELTS với 15 năm kinh nghiệm...
2. CONTEXT: Đây là bài Writing Task 2, đề bài: ...
3. TASK: Hãy chấm điểm theo 4 tiêu chí IELTS...
4. FORMAT: Trả về JSON với cấu trúc sau (KHÔNG thêm text ngoài JSON):
   {
     "overallBand": 6.5,
     "criteria": {
       "taskResponse": { "band": 6.0, "comment": "..." },
       "coherenceCohesion": { "band": 7.0, "comment": "..." },
       "lexicalResource": { "band": 6.0, "comment": "..." },
       "grammaticalRange": { "band": 7.0, "comment": "..." }
     },
     "strengths": ["..."],
     "weaknesses": ["..."],
     "improvementTips": ["..."]
   }
5. EXAMPLE: (few-shot example để tăng accuracy)
6. CONSTRAINTS: Chỉ chấm điểm, KHÔNG viết lại bài, KHÔNG đưa ra ý kiến cá nhân
```

---

## ĐÓNG GÓP VÀO BÁO CÁO

Tích hợp AI giúp bổ sung vào các phần sau của đồ án:

| Phần báo cáo | Nội dung bổ sung |
|---|---|
| **Chương 1 - Tổng quan** | Xu hướng ứng dụng AI trong giáo dục, bài toán IELTS grading |
| **Chương 2 - Cơ sở lý thuyết** | LLM, Prompt Engineering, Multi-Agent Architecture |
| **Chương 3 - Thiết kế** | Kiến trúc AI module, AI Agent design patterns, API design |
| **Chương 4 - Triển khai** | Tích hợp Gemini/OpenAI API, caching strategy, rate limiting |
| **Chương 5 - Kết quả** | So sánh điểm AI vs điểm giáo viên, accuracy rate, user feedback |
| **Hướng phát triển** | AI Speaking với giọng nói, AI tự động sinh bài tập luyện tập cá nhân |

---

## TÀI LIỆU THAM KHẢO THÊM (CHO BÁO CÁO)

1. J. Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", NeurIPS 2022.
2. Google, "Gemini API Documentation", https://ai.google.dev/gemini-api/docs
3. OpenAI, "GPT-4 Technical Report", arXiv:2303.08774, 2023.
4. IELTS, "IELTS Writing Band Descriptors (Public Version)", Cambridge Assessment English.
5. L. Weng, "Prompt Engineering", Lil'Log, 2023. https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/

---

## GHI CHÚ QUAN TRỌNG

1. **KHÔNG dùng AI để tạo đề thi IELTS.** Việc tạo đề đòi hỏi chuyên môn từ hội đồng ra đề IELTS,
   giáo viên được đào tạo. AI không đảm bảo tính chuẩn xác về nội dung học thuật, độ khó,
   và validity của đề thi. Sử dụng AI tạo đề sẽ bị phản biện rất mạnh.

2. **AI chỉ hỗ trợ chấm bài, không thay thế giáo viên.** Điểm AI luôn cần giáo viên phê duyệt
   trước khi công bố cho student.

3. **Minh bạch về AI.** Mọi output AI đều được gắn nhãn rõ ràng để người dùng biết.

4. **Bảo mật dữ liệu.** Bài viết của student KHÔNG được gửi ra ngoài nếu admin tắt tính năng AI.
   API keys được mã hóa lưu trữ.

---

*Ngày lập kế hoạch: 02/06/2026*
*Dự kiến hoàn thành: 12/07/2026*
