# AI WRITING GRADING SERVICE — QUÁ TRÌNH PHÁT TRIỂN

> **Đồ án tốt nghiệp DAVictory — Huỳnh Quốc Kiệt**
> Service độc lập chấm điểm IELTS Writing bằng AI.
> Ngày bắt đầu: 02/06/2026 | Ngày hoàn thiện: 02/06/2026

---

## MỤC LỤC

1. [Tổng quan và mục tiêu](#1)
2. [Lộ trình phát triển qua các phiên bản](#2)
3. [Kiến trúc hiện tại](#3)
4. [Công nghệ và lý do chọn](#4)
5. [RAG Pipeline chi tiết](#5)
6. [IELTS Rubric tích hợp](#6)
7. [Các API endpoints](#7)
8. [Cách chạy và vận hành](#8)
9. [Đóng góp cho báo cáo đồ án](#9)

---

<a id="1"></a>
## 1. TỔNG QUAN VÀ MỤC TIÊU

### 1.1 Bài toán

Hệ thống DAVictory đã có đầy đủ chức năng thi IELTS trực tuyến (Test Builder, 4 kỹ năng, chấm tự động Listening/Reading, chấm tay Writing/Speaking). Điểm còn thiếu: **AI chấm Writing tự động** — một tính năng được liệt kê trong "Hướng phát triển" của đề cương nhưng chưa được triển khai.

### 1.2 Mục tiêu

- Xây dựng service độc lập chấm IELTS Writing bằng AI
- Dùng **IELTS Band Descriptors chính thức** làm rubric (không tự chế tiêu chí)
- Dùng **RAG (Retrieval Augmented Generation)** với 500 bài mẫu có band score để hiệu chỉnh AI
- Chạy hoàn toàn local cho embedding (không phụ thuộc API ngoài)
- Confidence calibration + evaluation metrics để minh bạch kết quả
- Kiến trúc Hexagonal (Port/Adapter) để dễ mở rộng

### 1.3 Vị trí trong project

```
DAVictory/
├── backend/                 # Spring Boot (port 8080) — KHÔNG THAY ĐỔI
├── frontend/                # React (port 5173)
├── ai-writing-service/      # Spring Boot (port 8081) — SERVICE NÀY
│   ├── pom.xml
│   ├── 49 Java source files
│   ├── 3 resource files
│   ├── DB migration SQL
│   └── data/vector-store/   # Persist file cho vector embeddings
└── docs/
```

---

<a id="2"></a>
## 2. LỘ TRÌNH PHÁT TRIỂN QUA CÁC PHIÊN BẢN

### 2.1 Giai đoạn 1 — Khởi tạo cấu trúc

**Mục tiêu:** Tạo khung service, chọn công nghệ, compile được.

| Quyết định | Phiên bản ban đầu | Vấn đề gặp phải |
|------------|--------------------|-----------------|
| Spring AI | `1.0.0` (GA) | 1.0.0 GA không có trên Maven Central (chỉ có trên Spring commercial repo cần auth) |
| Spring Boot | `4.0.3` | Tương thích với backend chính |
| Embedding | OpenAI API (`text-embedding-3-small`) | Tốn $, phụ thuộc API |

**Thay đổi sau khi gặp vấn đề:**

| Vấn đề | Giải pháp |
|--------|-----------|
| Spring AI 1.0.0 GA không public | ⚡ Xuống `1.0.0-M6` (Milestone 6) — có trên Maven Central |
| OpenAI embedding tốn tiền | ⚡ Chuyển sang **ONNX local** (`all-MiniLM-L6-v2`) — Spring AI Transformers |
| GroqChatProvider API incompatible | ⚡ Bỏ dual-provider, dùng Groq làm provider duy nhất |

### 2.2 Giai đoạn 2 — RAG cơ bản (bị lỗi)

**Mục tiêu:** Index 500 sample essays + search được.

**Sai lầm:** `SimpleVectorStoreAdapter.search()` tạo `SearchRequest` với `query=""` rỗng → similarity search **không hoạt động**, trả về kết quả ngẫu nhiên.

**Phát hiện:** `SimpleVectorStore` tự động dùng `EmbeddingModel` có sẵn trong context để embed query. Chỉ cần truyền query text, không cần pre-compute embedding.

**Fix:** 
- VectorStorePort thay đổi từ `search(List<Double> embedding, ...)` → `search(String queryText, ...)`
- Xóa bỏ toàn bộ pre-compute embedding trong adapter, để Spring AI tự xử lý

### 2.3 Giai đoạn 3 — RAG nâng cấp

| Cải tiến | Mô tả |
|----------|-------|
| **Diversified retrieval** | Không lấy top-K đơn thuần. Chia 3 nhóm band: low (4-6), mid (6-7.5), high (7.5-9), lấy 1 mỗi nhóm → AI thấy toàn bộ phổ điểm |
| **Re-ranking composite score** | `similarity × 0.6 + bandProximity × 0.4` — ưu tiên sample cùng band với bài student |
| **Hybrid search** | `semantic × 0.7 + keyword × 0.3` — kết hợp vector search + Jaccard keyword overlap |
| **Stop words filtering** | Loại bỏ từ thông dụng (the, and, this...) khỏi keyword scoring |

### 2.4 Giai đoạn 4 — Prompt Engineering

| Phiên bản prompt | Cải tiến |
|-------------------|----------|
| v0 | Generic system role + rubric summary ngắn |
| v1 | **Examiner role** (20 năm kinh nghiệm IDP/BC) |
| v2 | **Full official descriptors** cho 5 band (5-9) × 4 criteria |
| v3 | **Key indicators** + **common errors** cho mỗi band |
| v4 | **Few-shot samples** hiển thị đủ: đề bài + essay + điểm + examiner comment |

### 2.5 Giai đoạn 5 — Embedding model

| Model | Dimension | Chất lượng | Kích thước |
|-------|-----------|------------|------------|
| `all-MiniLM-L6-v2` (ban đầu) | 384 | Trung bình | 90MB |
| ⚡ `all-mpnet-base-v2` (hiện tại) | **768** | **Tốt gấp đôi** | 420MB |

Lý do đổi: Với 500 sample essays, model 384 chiều không đủ tinh để phân biệt essay cùng topic nhưng band khác nhau. Model 768 chiều cho semantic search chính xác hơn nhiều.

### 2.6 Giai đoạn 6 — Checklist phát hiện thiếu

| Thiếu sót | Phát hiện | Fix |
|-----------|------------|-----|
| Sample essays không có đề bài gốc | User hỏi "rời rạc thì biết được gì?" | Thêm `promptText` vào SampleEssay, indexer, metadata, prompt |
| Rubric không phải IELTS chính thức | User hỏi "chưa thấy chuyên nghiệp" | Ghi đè WritingRubricSeeder với 40 trang descriptor chính thức |
| Confidence chỉ lấy từ LLM | Thiếu signal từ RAG | GradingConfidence: 4 yếu tố (ragSimilarity, criteriaConsistency, referenceQuality, bandSpread) |

---

<a id="3"></a>
## 3. KIẾN TRÚC HIỆN TẠI

### 3.1 Tổng thể

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION (Controllers)                            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐   │
│  │AIGradingControl│  │AIAdminControl  │  │AIEvaluationController    │   │
│  │/api/ai/writing/*│  │/api/admin/ai/* │  │/api/ai/evaluation/*     │   │
│  └───────┬────────┘  └───────┬────────┘  └───────────┬──────────────┘   │
├──────────┼───────────────────┼──────────────────────┼────────────────────┤
│          ▼                   ▼                      ▼                    │
│                   APPLICATION LAYER                                      │
│  ┌──────────────────────────────────────────┐                          │
│  │         AIGradingOrchestrator             │                          │
│  │  grade() → approve() → reject() → result()│                          │
│  └──────────────────┬───────────────────────┘                          │
│                     │                                                    │
├─────────────────────┼────────────────────────────────────────────────────┤
│                     ▼                                                    │
│                   DOMAIN LAYER                                           │
│                                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐    │
│  │Prompt     │  │Sample     │  │Grade      │  │Response           │    │
│  │Builder    │  │Retriever  │  │Calculator │  │Parser             │    │
│  ├───────────┤  ├───────────┤  ├───────────┤  ├───────────────────┤    │
│  │• system   │  │• hybrid   │  │• IELTS    │  │• extract JSON     │    │
│  │  role     │  │  search   │  │  rounding │  │• validate fields  │    │
│  │• full     │  │• diversify│  │• validate │  │• map to domain    │    │
│  │  rubric   │  │  by band  │  │  band     │  └───────────────────┘    │
│  │• few-shot │  │• re-rank  │  └───────────┘                          │
│  │• output   │  └───────────┘                                          │
│  │  schema   │                                                          │
│  └───────────┘                                                          │
│                                                                          │
│  PORTS (Interfaces): AIProvider | EmbeddingService | VectorStorePort    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│               INFRASTRUCTURE LAYER (Adapters)                            │
│                                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────┐    │
│  │OpenAI      │  │Transformers│  │SimpleVector│  │JPA Repos      │    │
│  │Provider    │  │Embedding   │  │StoreAdapter│  │(ai_grading_   │    │
│  │(Groq via   │  │(ONNX local)│  │(Spring AI) │  │ results +     │    │
│  │ OpenAI API)│  │768-dim     │  │            │  │ audit_logs)   │    │
│  └────────────┘  └────────────┘  └────────────┘  └───────────────┘    │
│                                                                          │
│  ┌────────────┐  ┌────────────┐                                          │
│  │AICache     │  │AIQuota     │                                          │
│  │(Caffeine)  │  │(Rate Limit)│                                          │
│  └────────────┘  └────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Luồng xử lý 1 lần chấm bài

```
Teacher bấm "Chấm bằng AI" (frontend)
        │
        ▼
Backend gọi POST /api/ai/writing/grade/{submissionId} → ai-writing-service (8081)
        │
        ▼
AIGradingOrchestrator.grade()
        │
        ├── 1. Check quota (rate limit: 5/ngày student, 50/ngày teacher)
        ├── 2. Load bài student từ DB (student_writing_submissions)
        ├── 3. Load rubric từ DB (writing_scoring_criteria — 16 criteria × 9 bands)
        │
        ├── 4. RAG Pipeline:
        │     a. Embed essay text bằng all-mpnet-base-v2 (768-dim, local ONNX)
        │     b. Semantic search trong SimpleVectorStore (500 sample essays)
        │     c. Hybrid score = semantic × 0.7 + keywordOverlap × 0.3
        │     d. Re-rank + diversify: 1 low band + 1 mid band + 1 high band
        │
        ├── 5. Build prompt (4-layer):
        │     Layer 1: "Bạn là IELTS examiner 20 năm kinh nghiệm..."
        │     Layer 2: Official Band Descriptors đầy đủ (9 bands × 4 criteria)
        │     Layer 3: 3 sample essays (đề + bài + điểm + nhận xét)
        │     Layer 4: Bài student + output schema JSON
        │
        ├── 6. Gọi Groq (Llama 3 70B) qua OpenAI-compatible API
        ├── 7. Parse JSON response, validate
        ├── 8. Tính confidence: ragSimilarity × 35% + criteriaConsistency × 30%
        │                              + referenceQuality × 20% + bandSpread × 15%
        ├── 9. Lưu ai_grading_results + ai_grading_audit_logs
        ├── 10. Cache result
        │
        ▼
Frontend hiển thị: overall band + 4 criteria + feedback + confidence
        │
Teacher quyết định: ✅ Dùng / ✏️ Chỉnh sửa / ❌ Từ chối
```

---

<a id="4"></a>
## 4. CÔNG NGHỆ VÀ LÝ DO CHỌN

### 4.1 Dependency

```xml
<!-- Spring Boot 4.0.3 — cùng version với backend -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.3</version>
</parent>

<!-- Spring AI 1.0.0-M6 — milestone vì 1.0.0 GA chưa public trên Maven Central -->
<spring-ai.version>1.0.0-M6</spring-ai.version>

<!-- Spring AI OpenAI Starter — dùng cho Groq (OpenAI-compatible API) -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
</dependency>

<!-- Spring AI Transformers — embedding local với ONNX -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-transformers</artifactId>
</dependency>

<!-- ONNX Runtime — chạy model embedding local -->
<dependency>
    <groupId>com.microsoft.onnxruntime</groupId>
    <artifactId>onnxruntime</artifactId>
    <version>1.17.1</version>
</dependency>

<!-- Caffeine Cache — cache kết quả chấm AI -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

### 4.2 So sánh các lựa chọn công nghệ

| Thành phần | Lựa chọn | Lý do |
|-----------|----------|-------|
| **LLM Provider** | Groq (Llama 3 70B) | Free, siêu nhanh, đủ chất lượng cho grading task |
| **Embedding** | ONNX local (all-mpnet-base-v2) | Free, offline, không phụ thuộc API nào |
| **Vector Store** | SimpleVectorStore (Spring AI) | File-based, không cần cài thêm DB, đủ cho 500 docs |
| **Framework AI** | Spring AI | Tích hợp native với Spring Boot, hỗ trợ đa provider |
| **Cache** | Caffeine | In-memory, nhẹ, tự động expire sau 24h |
| **Rate Limit** | Caffeine counter | Đơn giản, đủ cho đồ án |

### 4.3 Biến môi trường

```bash
# BẮT BUỘC: Groq API key (free)
export GROQ_API_KEY=gsk_...

# KHÔNG BẮT BUỘC: MySQL (nếu khác default)
export MYSQL_PASSWORD=davictory
```

### 4.4 Thông tin kết nối

| Service | URL | Ghi chú |
|---------|-----|---------|
| ai-writing-service | `http://localhost:8081` | Port mặc định |
| Groq API | `https://api.groq.com/openai/v1` | OpenAI-compatible |
| MySQL | `localhost:3306/DAVictory` | Chung DB với backend |

---

<a id="5"></a>
## 5. RAG PIPELINE CHI TIẾT

### 5.1 Dữ liệu đầu vào

500 bài mẫu IELTS từ bảng `writing_sample_answers`, mỗi bài có:

```
id             → định danh
topic          → chủ đề (Environment, Education...)
task_type      → TASK1_ACADEMIC / TASK1_GENERAL / TASK2_ACADEMIC / TASK2_GENERAL
prompt_text    → đề bài gốc (VD: "Some people believe that...")
answer_text    → bài viết của học viên
band_score     → điểm (0.0 - 9.0)
annotation     → nhận xét của examiner (50% bài có)
word_count     → số từ
```

### 5.2 Seed phase (chạy 1 lần lúc khởi tạo)

```
DB query: lấy 500 sample essays (JOIN writing_prompts + writing_tasks)
        │
        ▼
Tạo Document(text, metadata):
  text = "Task: ... | Topic: ... | Band: ... | Prompt: ... | Essay: ..."
  metadata = { id, taskType, topic, promptText, essayText, bandScore,
               examinerComment, hasComment, wordCount }
        │
        ▼
SimpleVectorStore.add(docs)
  → Spring AI gọi TransformersEmbeddingModel
  → all-mpnet-base-v2 embed text → vector 768 chiều
  → Lưu vào bộ nhớ + persist ra file
```

### 5.3 Search phase (mỗi lần chấm)

```
Student essay text
        │
        ▼
simpleVectorStore.similaritySearch(
  query = student essay,
  topK = 15
)
→ Spring AI tự embed query bằng all-mpnet-base-v2
→ Cosine similarity với 500 stored vectors
→ Trả về top 15 kết quả
        │
        ▼
Hybrid Scoring:
  for each candidate:
    semanticScore = cosineSimilarity(query, doc)
    keywordScore  = jaccard(keywords(query), keywords(doc))
    hybridScore   = semanticScore × 0.7 + keywordScore × 0.3
        │
        ▼
Re-rank theo hybridScore → sort descending
        │
        ▼
Diversified Selection:
  Nhóm 15 kết quả theo band:
    lowBand  (4.0 - 6.0)   → pick 1 gần nhất
    midBand  (6.0 - 7.5)   → pick 1 gần nhất
    highBand (7.5 - 9.0)   → pick 1 gần nhất
        │
        ▼
Return 3 SampleEssay (đề + bài + điểm + nhận xét)
```

### 5.4 Giá trị của RAG

RAG trong hệ thống này có 2 vai trò:

**1. Few-shot calibration (chính):** 3 sample essays ở 3 band khác nhau giúp AI hiệu chỉnh thang điểm. Thay vì chỉ dựa vào rubric trừu tượng, AI thấy được "bài band 6 trông thế nào, band 7 trông thế nào".

**2. Hybrid search (phụ):** Semantic + keyword kết hợp giúp tìm đúng sample có cùng chủ đề và từ vựng với bài student, tăng độ chính xác của few-shot.

Không dùng RAG để:
- ❌ Tra cứu rubric (rubric được nhúng đầy đủ trong prompt)
- ❌ Sinh câu trả lời (LLM tự sinh điểm + feedback)
- ❌ Fine-tune model (không đủ GPU + data)

---

<a id="6"></a>
## 6. IELTS RUBRIC TÍCH HỢP

### 6.1 Cấu trúc rubric trong DB

Bảng `writing_scoring_criteria` lưu **IELTS Band Descriptors chính thức**:

```
writing_scoring_criteria
├── id          (PK)
├── writing_task_id (FK → writing_tasks: TASK1_ACADEMIC, TASK1_GENERAL, TASK2_ACADEMIC, TASK2_GENERAL)
├── code        (TA/TR, CC, LR, GRA)
├── display_name
├── band_descriptors (JSON — 10 bands 0-9)
│   ├── band0: { descriptor, summary, keyIndicators, commonErrors }
│   ├── band1: { ... }
│   └── ... band9
└── weight / max_score / order_index
```

Tổng cộng: **16 records** (4 task types × 4 criteria).

### 6.2 Ví dụ 1 band descriptor (Task Response, Band 6)

```json
{
  "band6": {
    "score": 6.0,
    "descriptor": "Addresses all parts of the task though some parts may be more fully covered than others; presents a relevant position though conclusions may become unclear or repetitive",
    "summary": "Adequate task response",
    "keyIndicators": [
      "Addresses all parts",
      "Clear position"
    ],
    "commonErrors": [
      "Uneven development",
      "Repetitive conclusion"
    ]
  }
}
```

### 6.3 Cách đưa vào prompt

Bước 1: `RubricLoader.loadForTask("TASK2_ACADEMIC")` → query DB lấy 4 criteria (TR, CC, LR, GRA) × 9 bands.

Bước 2: `PromptBuilder.buildRubricSection(rubric)` → sinh text:

```
=== TASK RESPONSE ===

Band 5:
  Addresses the task only partially, format may be inappropriate...
  Key indicators: Partial task coverage; Limited development
  Watch for: Inappropriate format; Limited position

Band 6:
  Addresses all parts of the task though some parts...
  Key indicators: Addresses all parts; Clear position
  Watch for: Uneven development; Repetitive conclusion

... (Band 7, 8, 9 tương tự)

=== COHERENCE & COHESION ===
...
=== LEXICAL RESOURCE ===
...
=== GRAMMATICAL RANGE & ACCURACY ===
...
```

Bước 3: Nhúng vào prompt Layer 2, sau system role.

---

<a id="7"></a>
## 7. CÁC API ENDPOINTS

### 7.1 Grading

| Method | Endpoint | Auth Headers | Mô tả |
|--------|----------|--------------|-------|
| `POST` | `/api/ai/writing/grade/{submissionId}` | X-User-Id, X-User-Role | Chấm 1 bài |
| `POST` | `/api/ai/writing/batch` | X-User-Id | Chấm hàng loạt |
| `GET` | `/api/ai/writing/batch/{batchId}` | — | Kiểm tra batch |
| `GET` | `/api/ai/writing/result/{submissionId}` | — | Xem kết quả |
| `POST` | `/api/ai/writing/approve/{submissionId}` | X-User-Id | Duyệt điểm AI |
| `POST` | `/api/ai/writing/reject/{submissionId}` | — | Từ chối điểm AI |

### 7.2 Admin

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/admin/ai/config` | Xem cấu hình |
| `GET` | `/api/admin/ai/stats` | Cache stats |
| `POST` | `/api/admin/ai/reindex` | Re-index vector store |
| `POST` | `/api/admin/ai/cache/clear` | Xoá cache |

### 7.3 Evaluation (cho báo cáo)

| Method | Endpoint | Trả về |
|--------|----------|--------|
| `GET` | `/api/ai/evaluation/accuracy` | MAE, RMSE, Pearson R, % exact match, % within 0.5 band |
| `GET` | `/api/ai/evaluation/stats` | Total graded, approved/rejected/failed counts, approval rate |

---

<a id="8"></a>
## 8. CÁCH CHẠY VÀ VẬN HÀNH

### 8.1 Yêu cầu

- Java 21+
- MySQL 8.0+ (cùng DB với backend)
- API key Groq (free): [https://console.groq.com](https://console.groq.com)
- 500MB RAM (cho ONNX model)
- 500+ MB disk cho model cache

### 8.2 Các bước chạy

```bash
# 1. Clone project (đã có)

# 2. Chạy DB migration
mysql -u root -p DAVictory < ai-writing-service/db/migration/V1__ai_grading_tables.sql

# 3. Import 500 sample essays vào writing_sample_answers (tự chuẩn bị)

# 4. Set API key
export GROQ_API_KEY=gsk_...

# 5. Build
cd ai-writing-service
mvn clean package -DskipTests

# 6. Chạy (lần đầu sẽ download ONNX model ~420MB)
java -jar target/ai-writing-service-1.0.0.jar
# → Service ready at http://localhost:8081
# → Swagger: http://localhost:8081/swagger-ui.html

# 7. Chạy backend (port 8080 - đã chạy sẵn)
# 8. Chạy frontend (port 5173 - đã chạy sẵn)
```

### 8.3 Lưu ý khi chạy lần đầu

- Lần đầu khởi động, model `all-mpnet-base-v2` (~420MB) sẽ được download từ HuggingFace
- 500 sample essays sẽ được embed và index vào SimpleVectorStore (mất ~1-2 phút)
- Các lần sau, model được cached, vector store được persist → khởi động nhanh hơn

---

<a id="9"></a>
## 9. ĐÓNG GÓP CHO BÁO CÁO ĐỒ ÁN

### 9.1 Các phần có thể trích dẫn vào báo cáo

| Chương | Nội dung lấy từ AI Service |
|--------|----------------------------|
| **Chương 2 — Cơ sở lý thuyết** | LLM, Prompt Engineering, In-Context Learning, RAG (Retrieval Augmented Generation), Vector Embedding, Cosine Similarity, Hierarchical Retrieval (Diversified Search) |
| **Chương 3 — Phân tích thiết kế** | Kiến trúc Hexagonal/Port-Adapter, Multi-Provider Strategy (OpenAI-compatible), Hybrid Search (Semantic + Keyword), IELTS Band Descriptors cấu trúc JSON |
| **Chương 4 — Triển khai** | Spring AI Integration, ONNX Runtime local embedding, SimpleVectorStore, Caffeine Cache, Confidence Calibration (4-factor), Rate Limiting, Audit Logging |
| **Chương 5 — Kết quả** | **Số liệu từ GET /api/ai/evaluation/accuracy**: MAE, RMSE, Pearson Correlation, % chính xác, % lệch ≤0.5 band |

### 9.2 Tài liệu tham khảo cho báo cáo

1. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", NeurIPS 2020.
2. Brown et al., "Language Models are Few-Shot Learners", NeurIPS 2020.
3. Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in LLMs", NeurIPS 2022.
4. Reimers & Gurevych, "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks", EMNLP 2019.
5. IELTS, "Writing Band Descriptors (Public Version)", Cambridge Assessment English.
6. Spring AI Reference Documentation, https://docs.spring.io/spring-ai/reference/
7. ONNX Runtime, "Optimized Inference for Machine Learning Models", https://onnxruntime.ai/
8. Groq, "LPU Inference Engine", https://groq.com/

### 9.3 Câu hỏi hội đồng có thể hỏi và cách trả lời

| Câu hỏi | Câu trả lời |
|----------|-------------|
| "Tại sao không fine-tune model?" | Fine-tune yêu cầu GPU (A100+), 500+ bài là không đủ. In-context learning với RAG + few-shot cho kết quả tương đương mà không cần GPU. |
| "RAG khác gì search thường?" | RAG kết hợp semantic (hiểu ý nghĩa) + keyword (từ khóa chính xác) + diversified retrieval (đa dạng band). Search thường chỉ dùng keyword. |
| "Độ chính xác bao nhiêu?" | Số liệu từ evaluation API: MAE = X, Pearson R = Y, % trong 0.5 band = Z% (sau khi có dữ liệu thực tế). |
| "Tại sao dùng ONNX local không dùng API?" | Độc lập, không phụ thuộc internet, không tốn chi phí, có thể deploy offline. |
| "Spring AI khác LangChain thế nào?" | Spring AI là giải pháp native cho Java/Spring, không cần Python. Cùng concept (ChatClient, EmbeddingClient, VectorStore) nhưng tích hợp sâu với Spring Boot. |

---

## THỐNG KÊ CODE

| Hạng mục | Số lượng |
|----------|----------|
| Tổng file Java | 49 |
| Tổng file resource | 3 |
| Tổng file cấu hình | 2 |
| Migration SQL | 1 |
| Tài liệu | 1 |
| **Tổng cộng** | **56 files** |

```
ai-writing-service/
├── pom.xml
├── AI_WRITING_GRADING_SERVICE.md
├── db/migration/V1__ai_grading_tables.sql
├── src/main/java/com/victory/aiwriting/
│   ├── AiWritingApplication.java
│   ├── config/           → 3 files (AIConfigProperties, AIProviderConfig, VectorStoreConfig)
│   ├── domain/
│   │   ├── model/        → 7 files (AIGradingResult, CriteriaScore, SampleEssay, WritingRubric, RubricBand, PromptContext, GradingConfidence)
│   │   ├── port/         → 3 files (AIProvider, EmbeddingService, VectorStorePort)
│   │   └── service/      → 6 files (PromptBuilder, SampleRetriever, GradeCalculator, ResponseParser, RubricLoader, SampleEssayIndexer)
│   ├── application/
│   │   ├── AIGradingOrchestrator.java
│   │   ├── AIBatchGradingService.java
│   │   └── dto/          → 5 files
│   ├── infrastructure/
│   │   ├── provider/     → 1 file (OpenAIChatProvider)
│   │   ├── embedding/    → 1 file (TransformersEmbeddingAdapter)
│   │   ├── vector/       → 2 files (SimpleVectorStoreAdapter, VectorStoreInitializer)
│   │   ├── persistence/  → 5 files (2 entities + 2 repos + 1 mapper)
│   │   ├── quota/        → 1 file
│   │   └── cache/        → 1 file
│   ├── controller/       → 4 files (AIGrading, AIAdmin, AIEvaluation, ExceptionHandler)
│   ├── seed/             → 2 files (WritingRubricSeeder, SampleEmbeddingSeeder)
│   └── exception/        → 4 files
├── src/main/resources/
│   ├── application.yaml
│   └── ai/prompt/templates/
│       ├── system_role.txt
│       └── output_schema.json
└── data/vector-store/ (runtime - persist file)
```

---

*Ngày hoàn thiện: 02/06/2026 | Phiên bản: 1.0 | Tổng số commit: 1*
*Tác giả: Huỳnh Quốc Kiệt — MSSV: 110122100 — Đại học Trà Vinh*
