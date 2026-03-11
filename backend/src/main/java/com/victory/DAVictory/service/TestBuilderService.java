package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.ShuffleTestRequest;
import com.victory.DAVictory.dto.TestFullResponse;
import com.victory.DAVictory.dto.TestSaveRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Service xử lý logic lưu / tải / trộn đề thi.
 *
 * Cấu trúc DB:
 *   Test → TestSession (→ Session)
 *        → TestPart    (→ Part)
 *        → TestQuestionGroup (→ QuestionGroup → Question → Options/Answers)
 *
 * Trộn đề:
 *   - Đơn vị nhỏ nhất = Part (Listening Part 1 chỉ trộn với Listening Part 1)
 *   - Lấy nguyên Part đã cấu hình từ đề PUBLISHED khác
 */
@Service
@RequiredArgsConstructor
public class TestBuilderService {

    private final TestRepository testRepository;
    private final TestSessionRepository testSessionRepository;
    private final TestPartRepository testPartRepository;
    private final TestQuestionGroupRepository testQuestionGroupRepository;
    private final TestSettingRepository testSettingRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PartRepository partRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final QuestionTypeRepository questionTypeRepository;

    // ═══════════════════════════════════════════════════════════════
    //  1. LƯU TOÀN BỘ ĐỀ THI (Save Full Test)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Lưu toàn bộ cấu trúc đề thi từ TestBuilder frontend.
     * - Tạo/cập nhật Test
     * - Tạo TestSession → TestPart → TestQuestionGroup
     * - Tạo QuestionGroup → Question → QuestionOption / Answer trong ngân hàng
     */
    @Transactional
    public TestFullResponse saveFullTest(TestSaveRequest req) {
        Test test;

        if (req.getId() != null) {
            // ─── Cập nhật đề thi đã có ───
            test = testRepository.findById(req.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID=" + req.getId()));
            test.setTitle(req.getTitle());
            test.setDescription(req.getDescription());
            test.setTestType(req.getTestType());
            test.setIsFullTest(req.getIsFullTest() != null ? req.getIsFullTest() : true);
            test.setDurationMinutes(req.getDurationMinutes());
            test.setTargetBand(req.getTargetBand());

            // Xóa cấu trúc cũ — cascade sẽ xóa TestPart, TestQuestionGroup
            test.getTestSessions().clear();
            testRepository.saveAndFlush(test);
        } else {
            // ─── Tạo đề thi mới ───
            test = new Test();
            test.setTitle(req.getTitle());
            test.setDescription(req.getDescription());
            test.setTestType(req.getTestType());
            test.setIsFullTest(req.getIsFullTest() != null ? req.getIsFullTest() : true);
            test.setDurationMinutes(req.getDurationMinutes());
            test.setTargetBand(req.getTargetBand());
            test.setStatus(TestStatus.DRAFT);
            test.setAttemptCount(0);
            test.setAverageScore(0.0);

            User creator = userRepository.findById(req.getCreatedByUserId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
            test.setCreatedBy(creator);
            test = testRepository.save(test);

            // Tạo TestSetting mặc định
            TestSetting setting = new TestSetting();
            setting.setTest(test);
            testSettingRepository.save(setting);
        }

        // ─── Xử lý Sessions ───
        if (req.getSessions() != null) {
            for (TestSaveRequest.SessionSave ss : req.getSessions()) {
                Session session = sessionRepository.findById(ss.getSessionId())
                        .orElseThrow(() -> new RuntimeException(
                                "Không tìm thấy Session ID=" + ss.getSessionId()));

                TestSession ts = new TestSession();
                ts.setTest(test);
                ts.setSession(session);
                ts.setOrderIndex(ss.getOrderIndex());
                ts.setDurationMinutes(ss.getDurationMinutes());
                ts.setInstructions(ss.getInstructions());
                ts = testSessionRepository.save(ts);

                // ─── Xử lý Parts ───
                if (ss.getParts() != null) {
                    for (TestSaveRequest.PartSave ps : ss.getParts()) {
                        Part part = partRepository.findById(ps.getPartId())
                                .orElseThrow(() -> new RuntimeException(
                                        "Không tìm thấy Part ID=" + ps.getPartId()));

                        TestPart tp = new TestPart();
                        tp.setTestSession(ts);
                        tp.setPart(part);
                        tp.setOrderIndex(ps.getOrderIndex());
                        tp = testPartRepository.save(tp);

                        // ─── Xử lý QuestionGroups ───
                        if (ps.getQuestionGroups() != null) {
                            for (TestSaveRequest.GroupSave gs : ps.getQuestionGroups()) {
                                QuestionGroup qg;

                                if (gs.getExistingGroupId() != null) {
                                    // Tham chiếu group có sẵn trong ngân hàng câu hỏi
                                    qg = questionGroupRepository.findById(gs.getExistingGroupId())
                                            .orElseThrow(() -> new RuntimeException(
                                                    "Không tìm thấy QuestionGroup ID=" + gs.getExistingGroupId()));
                                } else {
                                    // Tạo group mới trong ngân hàng
                                    qg = new QuestionGroup();
                                    qg.setPart(part);
                                    qg.setTitle(gs.getTitle() != null ? gs.getTitle() : "Nhóm câu hỏi");
                                    qg.setContentType(gs.getContentType());
                                    qg.setPassageText(gs.getPassageText());
                                    qg.setAudioUrl(gs.getAudioUrl());
                                    qg.setImageUrl(gs.getImageUrl());
                                    qg.setFromQuestion(gs.getFromQuestion());
                                    qg.setToQuestion(gs.getToQuestion());
                                    qg.setOrderIndex(gs.getOrderIndex());
                                    qg = questionGroupRepository.save(qg);

                                    // Tạo Questions
                                    if (gs.getQuestions() != null) {
                                        for (TestSaveRequest.QuestionSave qs : gs.getQuestions()) {
                                            Question q = new Question();
                                            q.setQuestionGroup(qg);
                                            q.setQuestionNumber(qs.getQuestionNumber());
                                            q.setQuestionText(qs.getQuestionText());
                                            q.setBlankContext(qs.getBlankContext());
                                            q.setImageUrl(qs.getImageUrl());
                                            q.setPoints(qs.getPoints() != null ? qs.getPoints() : 1.0);
                                            q.setOrderIndex(qs.getOrderIndex());

                                            // Tìm QuestionType
                                            QuestionType qt = resolveQuestionType(qs.getQuestionTypeId(), qs.getQuestionTypeCode());
                                            q.setQuestionType(qt);

                                            q = questionRepository.save(q);

                                            // Tạo Options (MCQ, TFNG...)
                                            saveOptions(q, qs.getOptions());

                                            // Tạo Answers (Fill blank, Short answer...)
                                            saveAnswers(q, qs.getAnswers());
                                        }
                                    }
                                }

                                // Tạo TestQuestionGroup (bảng cầu nối)
                                TestQuestionGroup tqg = new TestQuestionGroup();
                                tqg.setTestPart(tp);
                                tqg.setQuestionGroup(qg);
                                tqg.setOrderIndex(gs.getOrderIndex());
                                tqg.setQuestionFrom(gs.getFromQuestion());
                                tqg.setQuestionTo(gs.getToQuestion());
                                testQuestionGroupRepository.save(tqg);
                            }
                        }
                    }
                }
            }
        }

        return loadFullTest(test.getId());
    }

    // ═══════════════════════════════════════════════════════════════
    //  2. TẢI TOÀN BỘ ĐỀ THI (Load Full Test)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tải toàn bộ cấu trúc đề thi bao gồm câu hỏi, đáp án lồng sâu.
     * Trả về DTO phẳng (không có circular reference).
     */
    @Transactional(readOnly = true)
    public TestFullResponse loadFullTest(Long testId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));

        TestFullResponse resp = new TestFullResponse();
        resp.setId(test.getId());
        resp.setTitle(test.getTitle());
        resp.setDescription(test.getDescription());
        resp.setTestType(test.getTestType());
        resp.setStatus(test.getStatus());
        resp.setIsFullTest(test.getIsFullTest());
        resp.setDurationMinutes(test.getDurationMinutes());
        resp.setTargetBand(test.getTargetBand());
        resp.setAttemptCount(test.getAttemptCount());
        resp.setAverageScore(test.getAverageScore());
        resp.setCreatedByUsername(test.getCreatedBy() != null ? test.getCreatedBy().getUsername() : null);
        resp.setCreatedAt(test.getCreatedAt());
        resp.setUpdatedAt(test.getUpdatedAt());

        // ─── Sessions ───
        List<TestSession> testSessions = testSessionRepository.findByTestIdOrderByOrderIndexAsc(testId);
        List<TestFullResponse.SessionResp> sessionResps = new ArrayList<>();

        for (TestSession ts : testSessions) {
            Session session = ts.getSession();

            TestFullResponse.SessionResp sr = new TestFullResponse.SessionResp();
            sr.setTestSessionId(ts.getId());
            sr.setSessionId(session.getId());
            sr.setName(session.getName());
            sr.setSkillType(session.getSkillType());
            sr.setOrderIndex(ts.getOrderIndex());
            sr.setDurationMinutes(ts.getDurationMinutes() != null
                    ? ts.getDurationMinutes() : session.getDurationMinutes());
            sr.setInstructions(ts.getInstructions());
            sr.setTotalQuestions(session.getTotalQuestions());

            // ─── Parts ───
            List<TestPart> testParts = testPartRepository.findByTestSessionIdOrderByOrderIndexAsc(ts.getId());
            List<TestFullResponse.PartResp> partResps = new ArrayList<>();

            for (TestPart tp : testParts) {
                Part part = tp.getPart();

                TestFullResponse.PartResp pr = new TestFullResponse.PartResp();
                pr.setTestPartId(tp.getId());
                pr.setPartId(part.getId());
                pr.setName(part.getName());
                pr.setOrderIndex(tp.getOrderIndex());
                pr.setTotalQuestions(part.getTotalQuestions());
                pr.setInstructions(part.getInstructions());

                // ─── QuestionGroups ───
                List<TestQuestionGroup> tqgs = testQuestionGroupRepository
                        .findByTestPartIdOrderByOrderIndexAsc(tp.getId());
                List<TestFullResponse.GroupResp> groupResps = new ArrayList<>();

                for (TestQuestionGroup tqg : tqgs) {
                    QuestionGroup qg = tqg.getQuestionGroup();

                    TestFullResponse.GroupResp gr = new TestFullResponse.GroupResp();
                    gr.setTestQuestionGroupId(tqg.getId());
                    gr.setQuestionGroupId(qg.getId());
                    gr.setTitle(tqg.getCustomTitle() != null ? tqg.getCustomTitle() : qg.getTitle());
                    gr.setContentType(qg.getContentType());
                    gr.setPassageText(qg.getPassageText());
                    gr.setAudioUrl(qg.getAudioUrl());
                    gr.setImageUrl(qg.getImageUrl());
                    gr.setFromQuestion(tqg.getQuestionFrom());
                    gr.setToQuestion(tqg.getQuestionTo());
                    gr.setOrderIndex(tqg.getOrderIndex());

                    // ─── Questions ───
                    List<Question> questions = questionRepository
                            .findByQuestionGroupIdOrderByOrderIndexAsc(qg.getId());
                    gr.setQuestions(mapQuestions(questions));

                    groupResps.add(gr);
                }

                pr.setQuestionGroups(groupResps);
                partResps.add(pr);
            }

            sr.setParts(partResps);
            sessionResps.add(sr);
        }

        resp.setSessions(sessionResps);
        return resp;
    }

    // ═══════════════════════════════════════════════════════════════
    //  3. TRỘN ĐỀ THI (Shuffle)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Trộn đề thi: Tạo đề mới bằng cách chọn ngẫu nhiên từng Part
     * từ các đề PUBLISHED khác, giữ đúng cấp độ.
     *
     * Ví dụ với ACADEMIC full test:
     *   - Listening Part 1: random lấy 1 Part 1 từ đề PUBLISHED bất kỳ
     *   - Listening Part 2: random lấy 1 Part 2 từ đề PUBLISHED bất kỳ
     *   - ...
     *   - Reading Passage 1: random từ đề khác
     *   - Reading Passage 2: random từ đề khác
     *   - ...
     *
     * Mỗi Part được lấy nguyên vẹn (toàn bộ QuestionGroups + Questions).
     */
    @Transactional
    public TestFullResponse shuffleTest(ShuffleTestRequest req) {
        User creator = userRepository.findById(req.getCreatedByUserId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // 1. Tạo Test mới
        Test newTest = new Test();
        newTest.setTitle(req.getTitle() != null ? req.getTitle() : "Đề trộn ngẫu nhiên");
        newTest.setDescription(req.getDescription());
        newTest.setTestType(req.getTestType());
        newTest.setIsFullTest(req.getIsFullTest() != null ? req.getIsFullTest() : true);
        newTest.setStatus(TestStatus.DRAFT);
        newTest.setAttemptCount(0);
        newTest.setAverageScore(0.0);
        newTest.setCreatedBy(creator);
        newTest = testRepository.save(newTest);

        // Tạo TestSetting mặc định
        TestSetting setting = new TestSetting();
        setting.setTest(newTest);
        testSettingRepository.save(setting);

        // 2. Lấy danh sách sessions theo testType
        List<Session> sessions = sessionRepository.findByTestTypeOrderByOrderIndexAsc(req.getTestType());

        int sessionOrder = 1;
        int globalQuestionNumber = 0; // Đánh số câu hỏi liên tục

        for (Session session : sessions) {
            // Tạo TestSession
            TestSession newTs = new TestSession();
            newTs.setTest(newTest);
            newTs.setSession(session);
            newTs.setOrderIndex(sessionOrder++);
            newTs = testSessionRepository.save(newTs);

            // 3. Lấy danh sách Parts của session
            List<Part> partsOfSession = partRepository.findBySessionIdOrderByOrderIndexAsc(session.getId());

            int partOrder = 1;
            for (Part part : partsOfSession) {
                // 4. Tìm tất cả TestPart từ đề PUBLISHED dùng Part này
                List<TestPart> candidates = testPartRepository.findPublishedTestPartsByPartId(part.getId());

                if (candidates.isEmpty()) {
                    // Không có đề nào PUBLISHED cho Part này → bỏ qua
                    continue;
                }

                // 5. Chọn ngẫu nhiên 1 TestPart
                TestPart picked = candidates.get(
                        ThreadLocalRandom.current().nextInt(candidates.size()));

                // 6. Tạo TestPart mới trong đề trộn
                TestPart newTp = new TestPart();
                newTp.setTestSession(newTs);
                newTp.setPart(part);
                newTp.setOrderIndex(partOrder++);
                newTp = testPartRepository.save(newTp);

                // 7. Copy toàn bộ TestQuestionGroups từ Part được chọn
                List<TestQuestionGroup> sourceTqgs = testQuestionGroupRepository
                        .findByTestPartIdOrderByOrderIndexAsc(picked.getId());

                int groupOrder = 1;
                for (TestQuestionGroup srcTqg : sourceTqgs) {
                    int questionsInGroup = srcTqg.getQuestionGroup().getQuestions().size();
                    int fromQ = globalQuestionNumber + 1;
                    int toQ = globalQuestionNumber + questionsInGroup;

                    TestQuestionGroup newTqg = new TestQuestionGroup();
                    newTqg.setTestPart(newTp);
                    newTqg.setQuestionGroup(srcTqg.getQuestionGroup()); // Tham chiếu cùng QuestionGroup
                    newTqg.setOrderIndex(groupOrder++);
                    newTqg.setQuestionFrom(fromQ);
                    newTqg.setQuestionTo(toQ);
                    newTqg.setIsRandomOrder(srcTqg.getIsRandomOrder());
                    testQuestionGroupRepository.save(newTqg);

                    globalQuestionNumber = toQ;
                }
            }
        }

        // Tính tổng thời gian
        int totalDuration = sessions.stream()
                .mapToInt(Session::getDurationMinutes)
                .sum();
        newTest.setDurationMinutes(totalDuration);
        testRepository.save(newTest);

        return loadFullTest(newTest.getId());
    }

    // ═══════════════════════════════════════════════════════════════
    //  4. LẤY DANH SÁCH ĐỀ THI
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<TestFullResponse> getAllTests() {
        List<Test> tests = testRepository.findAll();
        return tests.stream().map(this::mapTestSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<TestFullResponse> getTestsByStatus(TestStatus status) {
        List<Test> tests = testRepository.findByStatus(status);
        return tests.stream().map(this::mapTestSummary).toList();
    }

    @Transactional
    public void deleteTest(Long testId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));
        test.setStatus(TestStatus.DELETED);
        testRepository.save(test);
    }

    // ═══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    private QuestionType resolveQuestionType(Long typeId, String typeCode) {
        if (typeId != null) {
            QuestionType qt = questionTypeRepository.findById(typeId).orElse(null);
            if (qt != null) return qt;
        }
        if (typeCode != null && !typeCode.isBlank()) {
            QuestionType qt = questionTypeRepository.findByCode(typeCode).orElse(null);
            if (qt != null) return qt;
        }
        // Fallback: dùng FILL_BLANK nếu không tìm thấy (tránh NOT NULL violation)
        return questionTypeRepository.findByCode("FILL_BLANK")
                .orElseThrow(() -> new RuntimeException("Không tìm thấy QuestionType mặc định FILL_BLANK"));
    }

    private void saveOptions(Question question, List<TestSaveRequest.OptionSave> options) {
        if (options == null) return;
        for (TestSaveRequest.OptionSave os : options) {
            QuestionOption opt = new QuestionOption();
            opt.setQuestion(question);
            opt.setOptionLabel(os.getOptionLabel());
            opt.setOptionText(os.getOptionText() != null ? os.getOptionText() : "");
            opt.setIsCorrect(os.getIsCorrect() != null ? os.getIsCorrect() : false);
            opt.setOrderIndex(os.getOrderIndex() != null ? os.getOrderIndex() : 0);
            questionOptionRepository.save(opt);
        }
    }

    private void saveAnswers(Question question, List<TestSaveRequest.AnswerSave> answers) {
        if (answers == null) return;
        for (TestSaveRequest.AnswerSave as : answers) {
            Answer ans = new Answer();
            ans.setQuestion(question);
            ans.setAnswerText(as.getAnswerText() != null ? as.getAnswerText() : "");
            ans.setAlternativeAnswers(as.getAlternativeAnswers());
            ans.setIsCaseSensitive(as.getIsCaseSensitive() != null ? as.getIsCaseSensitive() : false);
            ans.setBlankIndex(as.getBlankIndex() != null ? as.getBlankIndex() : 1);
            ans.setWordLimit(as.getWordLimit());
            answerRepository.save(ans);
        }
    }

    private List<TestFullResponse.QuestionResp> mapQuestions(List<Question> questions) {
        List<TestFullResponse.QuestionResp> result = new ArrayList<>();
        for (Question q : questions) {
            TestFullResponse.QuestionResp qr = new TestFullResponse.QuestionResp();
            qr.setId(q.getId());
            qr.setQuestionNumber(q.getQuestionNumber());
            qr.setQuestionText(q.getQuestionText());
            qr.setBlankContext(q.getBlankContext());
            qr.setImageUrl(q.getImageUrl());
            qr.setPoints(q.getPoints());
            qr.setOrderIndex(q.getOrderIndex());

            if (q.getQuestionType() != null) {
                qr.setQuestionTypeId(q.getQuestionType().getId());
                qr.setQuestionTypeCode(q.getQuestionType().getCode());
                qr.setQuestionTypeName(q.getQuestionType().getDisplayName());
            }
            // Options
            List<QuestionOption> opts = questionOptionRepository
                    .findByQuestionIdOrderByOrderIndexAsc(q.getId());
            qr.setOptions(opts.stream().map(opt -> {
                TestFullResponse.OptionResp or = new TestFullResponse.OptionResp();
                or.setId(opt.getId());
                or.setOptionLabel(opt.getOptionLabel());
                or.setOptionText(opt.getOptionText());
                or.setIsCorrect(opt.getIsCorrect());
                or.setOrderIndex(opt.getOrderIndex());
                return or;
            }).toList());

            // Answers
            List<Answer> answers = answerRepository
                    .findByQuestionIdOrderByBlankIndexAsc(q.getId());
            qr.setAnswers(answers.stream().map(ans -> {
                TestFullResponse.AnswerResp ar = new TestFullResponse.AnswerResp();
                ar.setId(ans.getId());
                ar.setAnswerText(ans.getAnswerText());
                ar.setAlternativeAnswers(ans.getAlternativeAnswers());
                ar.setIsCaseSensitive(ans.getIsCaseSensitive());
                ar.setBlankIndex(ans.getBlankIndex());
                ar.setWordLimit(ans.getWordLimit());
                return ar;
            }).toList());

            result.add(qr);
        }
        return result;
    }

    private TestFullResponse mapTestSummary(Test test) {
        TestFullResponse resp = new TestFullResponse();
        resp.setId(test.getId());
        resp.setTitle(test.getTitle());
        resp.setDescription(test.getDescription());
        resp.setTestType(test.getTestType());
        resp.setStatus(test.getStatus());
        resp.setIsFullTest(test.getIsFullTest());
        resp.setDurationMinutes(test.getDurationMinutes());
        resp.setTargetBand(test.getTargetBand());
        resp.setAttemptCount(test.getAttemptCount());
        resp.setAverageScore(test.getAverageScore());
        resp.setCreatedByUsername(test.getCreatedBy() != null ? test.getCreatedBy().getUsername() : null);
        resp.setCreatedAt(test.getCreatedAt());
        resp.setUpdatedAt(test.getUpdatedAt());
        return resp;
    }
}
