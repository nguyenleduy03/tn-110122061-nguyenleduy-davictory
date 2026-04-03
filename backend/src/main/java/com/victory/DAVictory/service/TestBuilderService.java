package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.ShuffleTestRequest;
import com.victory.DAVictory.dto.TestFilterRequest;
import com.victory.DAVictory.dto.TestFullResponse;
import com.victory.DAVictory.dto.TestSaveRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.repository.*;
import com.victory.DAVictory.specification.TestSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
    private final TestStatisticRepository testStatisticRepository;
    private final FullTestProgressRepository fullTestProgressRepository;
    private final GuestExamAttemptRepository guestExamAttemptRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PartRepository partRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final QuestionStatisticRepository questionStatisticRepository;
    private final QuestionTagMapRepository questionTagMapRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final QuestionTypeRepository questionTypeRepository;
    private final DriveAssetRenameService driveAssetRenameService;

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
        String previousTitle = null;

        if (req.getId() != null) {
            // ─── Cập nhật đề thi đã có ───
            test = testRepository.findById(req.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID=" + req.getId()));
            previousTitle = test.getTitle();
            test.setTitle(req.getTitle());
            test.setDescription(req.getDescription());
            test.setTestType(req.getTestType());
            test.setIsFullTest(req.getIsFullTest() != null ? req.getIsFullTest() : true);
            test.setDurationMinutes(req.getDurationMinutes());
            test.setTargetBand(req.getTargetBand());

            // Thu thập group ID cũ trước khi xóa cấu trúc
            List<Long> oldGroupIds = testQuestionGroupRepository.findQuestionGroupIdsByTestId(test.getId());

            // Xóa cấu trúc cũ — cascade sẽ xóa TestPart, TestQuestionGroup
            test.getTestSessions().clear();
            testRepository.saveAndFlush(test);

            // Xóa các QuestionGroup không còn được tham chiếu bởi bất kỳ đề thi nào
            for (Long groupId : oldGroupIds) {
                if (testQuestionGroupRepository.findByQuestionGroupId(groupId).isEmpty()
                        && !hasAttemptAnswersForGroup(groupId)) {
                    System.out.println("🗑️ Cleaning up unused group: " + groupId);
                    answerRepository.deleteByQuestionGroupId(groupId);
                    questionOptionRepository.deleteByQuestionGroupId(groupId);
                    questionRepository.deleteByQuestionGroupId(groupId);
                    questionGroupRepository.deleteById(groupId);
                }
            }
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
                        tp.setCustomInstructions(ps.getInstructions());
                        tp.setCustomName(ps.getName());
                        tp.setQuestionCount(ps.getTotalQuestions());
                        tp = testPartRepository.save(tp);

                        // ─── Xử lý QuestionGroups ───
                        if (ps.getQuestionGroups() != null) {
                            for (TestSaveRequest.GroupSave gs : ps.getQuestionGroups()) {
                                QuestionGroup qg;

                                if (gs.getExistingGroupId() != null) {
                                    // Kiểm tra group có tồn tại không
                                    var existingGroup = questionGroupRepository.findById(gs.getExistingGroupId());
                                    
                                    if (existingGroup.isPresent()) {
                                        // Group tồn tại - nếu đã có lịch sử làm bài thì version hóa group mới
                                        // để tránh vi phạm FK attempt_answers -> questions.
                                        qg = existingGroup.get();

                                        if (hasAttemptAnswersForGroup(qg.getId())) {
                                            // Có attempt lịch sử: tạo group mới để giữ nguyên dữ liệu cũ
                                            qg = createQuestionGroupFromSave(part, gs);
                                        } else {
                                            // Không có attempt lịch sử: cập nhật group cũ và thay toàn bộ questions
                                            if (gs.getTitle() != null) qg.setTitle(truncateTitle(gs.getTitle()));
                                            if (gs.getInstructions() != null) qg.setInstructions(gs.getInstructions());
                                            if (gs.getPassageText() != null) qg.setPassageText(gs.getPassageText());
                                            if (gs.getAudioUrl() != null) qg.setAudioUrl(gs.getAudioUrl());
                                            if (gs.getAudioPlayCount() != null) qg.setAudioPlayCount(gs.getAudioPlayCount());
                                            if (gs.getImageUrl() != null) qg.setImageUrl(gs.getImageUrl());
                                            if (gs.getImageWidth() != null) qg.setImageWidth(gs.getImageWidth());
                                            if (gs.getFromQuestion() != null) qg.setFromQuestion(gs.getFromQuestion());
                                            if (gs.getToQuestion() != null) qg.setToQuestion(gs.getToQuestion());
                                            if (gs.getOrderIndex() != null) qg.setOrderIndex(gs.getOrderIndex());
                                            if (gs.getAllowOptionReuse() != null) qg.setAllowOptionReuse(gs.getAllowOptionReuse());
                                            if (gs.getHideOptionsTable() != null) qg.setHideOptionsTable(gs.getHideOptionsTable());
                                            qg = questionGroupRepository.save(qg);

                                            // Xóa cứng theo thứ tự đúng để tránh FK constraint
                                            System.out.println("🗑️ Deleting old questions for group: " + qg.getId());
                                            answerRepository.deleteByQuestionGroupId(qg.getId());
                                            questionOptionRepository.deleteByQuestionGroupId(qg.getId());
                                            questionRepository.deleteByQuestionGroupId(qg.getId());
                                            System.out.println("✅ Deleted old questions, now creating new ones");
                                        }

                                        saveQuestionsForGroup(qg, gs.getQuestions());
                                    } else {
                                        // Group không tồn tại - Tự động tạo mới
                                        qg = createQuestionGroupFromSave(part, gs);
                                        saveQuestionsForGroup(qg, gs.getQuestions());
                                    }
                                } else {
                                    // Không có existingGroupId - Tạo group hoàn toàn mới
                                    qg = createQuestionGroupFromSave(part, gs);
                                    saveQuestionsForGroup(qg, gs.getQuestions());
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

        if (req.getId() != null
                && previousTitle != null
                && req.getTitle() != null
                && !previousTitle.equals(req.getTitle())) {
            driveAssetRenameService.renameAssetsForTestTitleChange(req, previousTitle, req.getTitle());
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
                pr.setName(tp.getCustomName() != null ? tp.getCustomName() : part.getName());
                pr.setOrderIndex(tp.getOrderIndex());
                pr.setTotalQuestions(part.getTotalQuestions());
                pr.setInstructions(tp.getCustomInstructions() != null ? tp.getCustomInstructions() : part.getInstructions());

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
                    gr.setInstructions(tqg.getCustomInstructions() != null ? tqg.getCustomInstructions() : qg.getInstructions());
                    gr.setContentType(qg.getContentType());
                    gr.setPassageText(qg.getPassageText());
                    gr.setAudioUrl(qg.getAudioUrl());
                    gr.setAudioPlayCount(qg.getAudioPlayCount());
                    gr.setImageUrl(qg.getImageUrl());
                    gr.setImageWidth(qg.getImageWidth());
                    gr.setFromQuestion(tqg.getQuestionFrom());
                    gr.setToQuestion(tqg.getQuestionTo());
                    gr.setOrderIndex(tqg.getOrderIndex());
                    gr.setHideOptionsTable(qg.getHideOptionsTable());

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

        // 2. Xác định sessions cần trộn
        List<Session> sessions;
        if ("SINGLE_SKILL".equals(req.getShuffleMode()) && req.getSkillType() != null) {
            // Chỉ lấy session của skill được chọn
            sessions = sessionRepository.findByTestTypeAndSkillTypeOrderByOrderIndexAsc(
                req.getTestType(), req.getSkillType());
        } else {
            // Full test hoặc custom parts
            sessions = sessionRepository.findByTestTypeOrderByOrderIndexAsc(req.getTestType());
        }

        int sessionOrder = 1;
        int globalQuestionNumber = 0;

        for (Session session : sessions) {
            TestSession newTs = new TestSession();
            newTs.setTest(newTest);
            newTs.setSession(session);
            newTs.setOrderIndex(sessionOrder++);
            newTs = testSessionRepository.save(newTs);

            // 3. Lấy parts của session
            List<Part> partsOfSession = partRepository.findBySessionIdOrderByOrderIndexAsc(session.getId());

            int partOrder = 1;
            for (Part part : partsOfSession) {
                // Nếu CUSTOM_PARTS, chỉ lấy parts được chọn
                if ("CUSTOM_PARTS".equals(req.getShuffleMode()) && req.getPartIds() != null) {
                    if (!req.getPartIds().contains(part.getId())) {
                        continue; // Bỏ qua part không được chọn
                    }
                }

                // 4. Tìm TestPart candidates theo nguồn
                List<TestPart> candidates = findCandidateTestParts(part.getId(), req);

                if (candidates.isEmpty()) {
                    continue;
                }

                // 5. Chọn ngẫu nhiên 1 TestPart
                TestPart picked = candidates.get(
                        ThreadLocalRandom.current().nextInt(candidates.size()));

                // 6. Tạo TestPart mới
                TestPart newTp = new TestPart();
                newTp.setTestSession(newTs);
                newTp.setPart(part);
                newTp.setOrderIndex(partOrder++);
                newTp = testPartRepository.save(newTp);

                // 7. Copy TestQuestionGroups
                List<TestQuestionGroup> sourceTqgs = testQuestionGroupRepository
                        .findByTestPartIdOrderByOrderIndexAsc(picked.getId());

                int groupOrder = 1;
                for (TestQuestionGroup srcTqg : sourceTqgs) {
                    int questionsInGroup = srcTqg.getQuestionGroup().getQuestions().size();
                    int fromQ = globalQuestionNumber + 1;
                    int toQ = globalQuestionNumber + questionsInGroup;

                    TestQuestionGroup newTqg = new TestQuestionGroup();
                    newTqg.setTestPart(newTp);
                    newTqg.setQuestionGroup(srcTqg.getQuestionGroup());
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

    /**
     * Tìm TestPart candidates theo nguồn trộn
     */
    private List<TestPart> findCandidateTestParts(Long partId, ShuffleTestRequest req) {
        if ("SPECIFIC_TESTS".equals(req.getShuffleSource()) && req.getSourceTestIds() != null && !req.getSourceTestIds().isEmpty()) {
            // Lấy từ các đề cụ thể
            return testPartRepository.findByPartIdAndTestIds(partId, req.getSourceTestIds());
        } else {
            // Mặc định: tất cả đề PUBLISHED (BY_FILTER tạm thời cũng dùng này)
            return testPartRepository.findPublishedTestPartsByPartId(partId);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  4. LỌC ĐỀ THI
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Map<String, Object> filterTests(TestFilterRequest filter) {
        Specification<Test> spec = TestSpecification.filterTests(filter);
        
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if (filter.getSortBy() != null) {
            Sort.Direction direction = "ASC".equalsIgnoreCase(filter.getSortOrder()) 
                ? Sort.Direction.ASC : Sort.Direction.DESC;
            sort = Sort.by(direction, filter.getSortBy());
        }
        
        Pageable pageable = PageRequest.of(
            filter.getPage() != null ? filter.getPage() : 0,
            filter.getSize() != null ? filter.getSize() : 20,
            sort
        );
        
        Page<Test> page = testRepository.findAll(spec, pageable);
        
        return Map.of(
            "content", page.getContent().stream().map(this::mapTestSummary).toList(),
            "totalElements", page.getTotalElements(),
            "totalPages", page.getTotalPages(),
            "currentPage", page.getNumber(),
            "pageSize", page.getSize()
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  5. LẤY DANH SÁCH ĐỀ THI
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

    @Transactional
    public void permanentlyDeleteTest(Long testId) {
        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));

        List<Long> questionGroupIds = testQuestionGroupRepository.findQuestionGroupIdsByTestId(testId);

        assignmentRepository.deleteByTestId(testId);
        examAttemptRepository.deleteByTestId(testId);
        testStatisticRepository.deleteByTestId(testId);
        testSettingRepository.deleteByTestId(testId);
        fullTestProgressRepository.deleteByTestId(testId);
        guestExamAttemptRepository.deleteByTestId(testId);

        testRepository.delete(test);

        for (Long groupId : questionGroupIds) {
            if (testQuestionGroupRepository.findByQuestionGroupId(groupId).isEmpty()
                    && !hasAttemptAnswersForGroup(groupId)) {
                List<Question> questions = questionRepository.findByQuestionGroupIdOrderByOrderIndexAsc(groupId);
                for (Question question : questions) {
                    Long questionId = question.getId();
                    questionStatisticRepository.deleteByQuestionId(questionId);
                    questionTagMapRepository.deleteByQuestionId(questionId);
                }
                answerRepository.deleteByQuestionGroupId(groupId);
                questionOptionRepository.deleteByQuestionGroupId(groupId);
                questionRepository.deleteByQuestionGroupId(groupId);
                questionGroupRepository.deleteById(groupId);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Truncate title để đảm bảo không vượt quá 500 ký tự
     */
    private String truncateTitle(String title) {
        if (title == null) return "Nhóm câu hỏi";
        if (title.length() <= 500) return title;
        return title.substring(0, 497) + "...";
    }

    private boolean hasAttemptAnswersForGroup(Long groupId) {
        if (groupId == null) return false;
        return attemptAnswerRepository.existsByQuestionQuestionGroupId(groupId);
    }

    private QuestionGroup createQuestionGroupFromSave(Part part, TestSaveRequest.GroupSave gs) {
        QuestionGroup qg = new QuestionGroup();
        qg.setPart(part);
        qg.setTitle(truncateTitle(gs.getTitle()));
        qg.setInstructions(gs.getInstructions());
        qg.setContentType(gs.getContentType());
        qg.setPassageText(gs.getPassageText());
        qg.setAudioUrl(gs.getAudioUrl());
        qg.setAudioPlayCount(gs.getAudioPlayCount() != null ? gs.getAudioPlayCount() : 1);
        qg.setImageUrl(gs.getImageUrl());
        qg.setImageWidth(gs.getImageWidth());
        qg.setFromQuestion(gs.getFromQuestion());
        qg.setToQuestion(gs.getToQuestion());
        qg.setOrderIndex(gs.getOrderIndex());
        qg.setAllowOptionReuse(gs.getAllowOptionReuse() != null ? gs.getAllowOptionReuse() : false);
        qg.setHideOptionsTable(gs.getHideOptionsTable() != null ? gs.getHideOptionsTable() : false);

        if (gs.getQuestions() != null && !gs.getQuestions().isEmpty()) {
            TestSaveRequest.QuestionSave firstQ = gs.getQuestions().get(0);
            QuestionType groupQType = resolveQuestionType(firstQ.getQuestionTypeId(), firstQ.getQuestionTypeCode());
            qg.setQuestionType(groupQType);
        }
        return questionGroupRepository.save(qg);
    }

    private void saveQuestionsForGroup(QuestionGroup qg, List<TestSaveRequest.QuestionSave> questions) {
        if (questions == null) return;
        System.out.println("🔍 Saving " + questions.size() + " questions for group: " + qg.getTitle());
        
        for (int i = 0; i < questions.size(); i++) {
            TestSaveRequest.QuestionSave qs = questions.get(i);
            System.out.println("📝 Question " + (i+1) + ": " + qs.getQuestionText() + " | Answers: " + (qs.getAnswers() != null ? qs.getAnswers().size() : 0));
            
            try {
                Question q = createQuestionFromSave(qg, qs);
                saveOptions(q, qs.getOptions());
                saveAnswers(q, qs.getAnswers());
                System.out.println("✅ Successfully saved question " + (i+1));
            } catch (Exception e) {
                System.err.println("❌ Error saving question " + (i+1) + ": " + e.getMessage());
                e.printStackTrace();
                throw e; // Re-throw để không nuốt exception
            }
        }
    }

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
        System.out.println("💾 Saving " + answers.size() + " answers for question: " + question.getQuestionText());
        
        for (int i = 0; i < answers.size(); i++) {
            TestSaveRequest.AnswerSave as = answers.get(i);
            System.out.println("📝 Answer " + (i+1) + ": '" + as.getAnswerText() + "'");
            
            try {
                Answer ans = new Answer();
                ans.setQuestion(question);
                ans.setAnswerText(as.getAnswerText() != null ? as.getAnswerText() : "");
                ans.setAlternativeAnswers(as.getAlternativeAnswers());
                ans.setIsCaseSensitive(as.getIsCaseSensitive() != null ? as.getIsCaseSensitive() : false);
                ans.setBlankIndex(as.getBlankIndex() != null ? as.getBlankIndex() : 1);
                ans.setWordLimit(as.getWordLimit());
                Answer saved = answerRepository.save(ans);
                System.out.println("✅ Saved answer " + (i+1) + " with ID: " + saved.getId());
            } catch (Exception e) {
                System.err.println("❌ Error saving answer " + (i+1) + ": " + e.getMessage());
                e.printStackTrace();
                throw e;
            }
        }
    }

    private List<TestFullResponse.QuestionResp> mapQuestions(List<Question> questions) {
        List<TestFullResponse.QuestionResp> result = new ArrayList<>();
        for (Question q : questions) {
            TestFullResponse.QuestionResp qr = new TestFullResponse.QuestionResp();
            qr.setId(q.getId());
            qr.setQuestionNumber(q.getQuestionNumber());
            qr.setQuestionCount(q.getQuestionCount());
            qr.setGroupInstruction(q.getGroupInstruction());
            qr.setQuestionText(q.getQuestionText());
            qr.setBlankContext(q.getBlankContext());
            qr.setPinX(q.getPinX());
            qr.setPinY(q.getPinY());
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

    // Helper method để tạo Question từ QuestionSave
    private Question createQuestionFromSave(QuestionGroup qg, TestSaveRequest.QuestionSave qs) {
        Question q = new Question();
        q.setQuestionGroup(qg);
        q.setQuestionNumber(qs.getQuestionNumber());
        q.setQuestionCount(qs.getQuestionCount() != null ? qs.getQuestionCount() : 1);
        q.setGroupInstruction(qs.getGroupInstruction());
        q.setQuestionText(qs.getQuestionText());
        q.setBlankContext(qs.getBlankContext());
        q.setPinX(qs.getPinX());
        q.setPinY(qs.getPinY());
        q.setImageUrl(qs.getImageUrl());
        q.setPoints(qs.getPoints() != null ? qs.getPoints() : 1.0);
        q.setOrderIndex(qs.getOrderIndex());
        
        QuestionType qt = resolveQuestionType(qs.getQuestionTypeId(), qs.getQuestionTypeCode());
        q.setQuestionType(qt);
        
        return questionRepository.save(q);
    }
}
