package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TestManagementService {

    private final TestRepository testRepository;
    private final TestSessionRepository testSessionRepository;
    private final TestPartRepository testPartRepository;
    private final TestQuestionGroupRepository testQuestionGroupRepository;
    private final TestSettingRepository testSettingRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PartRepository partRepository;
    private final QuestionGroupRepository questionGroupRepository;

    // ===== TEST =====

    @Transactional
    public Test createTest(Test test, Long createdByUserId) {
        User creator = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        test.setCreatedBy(creator);
        test.setStatus(TestStatus.DRAFT);
        Test savedTest = testRepository.save(test);

        // Tự động tạo TestSetting mặc định
        TestSetting defaultSetting = new TestSetting();
        defaultSetting.setTest(savedTest);
        testSettingRepository.save(defaultSetting);

        return savedTest;
    }

    public Test getTestById(Long id) {
        return testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));
    }

    public List<Test> getPublishedTests(TestType testType) {
        if (testType != null) {
            return testRepository.findLatestPublishedByTestType(testType);
        }
        return testRepository.findTopPublishedByAttempts();
    }

    public List<Test> getTestsByStatus(TestStatus status) {
        return testRepository.findByStatus(status);
    }

    public List<Test> searchTests(String keyword) {
        return testRepository.searchByTitle(keyword);
    }

    @Transactional
    public Test updateTestStatus(Long testId, TestStatus newStatus, Long reviewedByUserId) {
        Test test = getTestById(testId);

        if (newStatus == TestStatus.PUBLISHED) {
            test.setPublishedAt(LocalDateTime.now());
            if (reviewedByUserId != null) {
                User reviewer = userRepository.findById(reviewedByUserId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy reviewer"));
                test.setReviewedBy(reviewer);
                test.setReviewedAt(LocalDateTime.now());
            }
        }
        test.setStatus(newStatus);
        return testRepository.save(test);
    }

    @Transactional
    public Test updateTestStatus(Long testId, TestStatus newStatus, Long reviewedByUserId,
                                 String currentUsername, boolean isAdmin) {
        Test test = getTestById(testId);

        if (test.getStatus() == TestStatus.DELETED && !canRestoreDeletedTest(test, currentUsername, isAdmin)) {
            throw new RuntimeException("Chỉ người tạo hoặc admin mới có thể khôi phục đề thi đã xóa");
        }

        if (newStatus == TestStatus.PUBLISHED) {
            test.setPublishedAt(LocalDateTime.now());
            if (reviewedByUserId != null) {
                User reviewer = userRepository.findById(reviewedByUserId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy reviewer"));
                test.setReviewedBy(reviewer);
                test.setReviewedAt(LocalDateTime.now());
            }
        }
        test.setStatus(newStatus);
        return testRepository.save(test);
    }

    @Transactional
    public Test updateTest(Long testId, String title, String description, TestType testType,
                           Boolean isFullTest, Integer durationMinutes, String targetBand) {
        Test test = getTestById(testId);
        if (title != null) test.setTitle(title);
        if (description != null) test.setDescription(description);
        if (testType != null) test.setTestType(testType);
        if (isFullTest != null) test.setIsFullTest(isFullTest);
        if (durationMinutes != null) test.setDurationMinutes(durationMinutes);
        if (targetBand != null) test.setTargetBand(targetBand);
        return testRepository.save(test);
    }

    @Transactional
    public void deleteTest(Long id) {
        Test test = getTestById(id);
        test.setStatus(TestStatus.DELETED);
        testRepository.save(test);
    }

    @Transactional
    public Test restoreTest(Long testId, String currentUsername, boolean isAdmin) {
        Test test = getTestById(testId);
        if (test.getStatus() != TestStatus.DELETED) {
            throw new RuntimeException("Đề thi này không nằm trong thùng rác");
        }
        if (!canRestoreDeletedTest(test, currentUsername, isAdmin)) {
            throw new RuntimeException("Chỉ người tạo hoặc admin mới có thể khôi phục đề thi đã xóa");
        }
        test.setStatus(TestStatus.DRAFT);
        return testRepository.save(test);
    }

    public List<Test> getTestsByCreator(Long userId) {
        return testRepository.findByCreatedById(userId);
    }

    public List<Test> getAllTests() {
        return testRepository.findAll();
    }

    private boolean canRestoreDeletedTest(Test test, String currentUsername, boolean isAdmin) {
        if (isAdmin) return true;
        if (test.getCreatedBy() == null || currentUsername == null || currentUsername.isBlank()) return false;
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));
        return test.getCreatedBy().getId() != null && test.getCreatedBy().getId().equals(currentUser.getId());
    }

    // ===== TEST SESSION =====

    @Transactional
    public TestSession addSessionToTest(Long testId, Long sessionId, Integer orderIndex, Integer durationMinutes) {
        Test test = getTestById(testId);
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session"));

        if (testSessionRepository.findByTestIdAndSessionId(testId, sessionId).isPresent()) {
            throw new RuntimeException("Session này đã được thêm vào đề thi");
        }

        TestSession testSession = new TestSession();
        testSession.setTest(test);
        testSession.setSession(session);
        testSession.setOrderIndex(orderIndex);
        testSession.setDurationMinutes(durationMinutes);
        return testSessionRepository.save(testSession);
    }

    public List<TestSession> getTestSessions(Long testId) {
        return testSessionRepository.findByTestIdOrderByOrderIndexAsc(testId);
    }

    public TestSession getTestSessionById(Long testSessionId) {
        return testSessionRepository.findById(testSessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỹ năng trong đề thi"));
    }

    @Transactional
    public TestSession updateTestSession(Long testSessionId, Boolean isIncluded,
                                         Integer durationMinutes, String instructions, Integer orderIndex) {
        TestSession ts = getTestSessionById(testSessionId);
        if (isIncluded != null)       ts.setIsIncluded(isIncluded);
        if (durationMinutes != null)  ts.setDurationMinutes(durationMinutes);
        if (instructions != null)     ts.setInstructions(instructions);
        if (orderIndex != null)       ts.setOrderIndex(orderIndex);
        return testSessionRepository.save(ts);
    }

    @Transactional
    public void removeSessionFromTest(Long testSessionId) {
        TestSession ts = getTestSessionById(testSessionId);
        testSessionRepository.delete(ts);
    }

    public List<Session> getAvailableSessionsForTest(Long testId) {
        Test test = getTestById(testId);
        List<Session> allSessions = sessionRepository.findByTestTypeOrderByOrderIndexAsc(test.getTestType());
        List<Long> addedSessionIds = testSessionRepository.findByTestIdOrderByOrderIndexAsc(testId)
                .stream().map(ts -> ts.getSession().getId()).toList();
        return allSessions.stream()
                .filter(s -> !addedSessionIds.contains(s.getId()))
                .toList();
    }

    // ===== TEST PART =====

    @Transactional
    public TestPart addPartToTestSession(Long testSessionId, Long partId, Integer orderIndex) {
        TestSession testSession = testSessionRepository.findById(testSessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy test session"));
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy part"));

        if (testPartRepository.findByTestSessionIdAndPartId(testSessionId, partId).isPresent()) {
            throw new RuntimeException("Part này đã được thêm vào test session");
        }

        TestPart testPart = new TestPart();
        testPart.setTestSession(testSession);
        testPart.setPart(part);
        testPart.setOrderIndex(orderIndex);
        return testPartRepository.save(testPart);
    }

    public List<TestPart> getTestParts(Long testSessionId) {
        return testPartRepository.findByTestSessionIdOrderByOrderIndexAsc(testSessionId);
    }

    public TestPart getTestPartById(Long testPartId) {
        return testPartRepository.findById(testPartId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy part trong đề thi"));
    }

    @Transactional
    public TestPart updateTestPart(Long testPartId, Boolean isIncluded,
                                   Integer questionCount, Integer durationMinutes, Integer orderIndex) {
        TestPart tp = getTestPartById(testPartId);
        if (isIncluded != null)      tp.setIsIncluded(isIncluded);
        if (questionCount != null)   tp.setQuestionCount(questionCount);
        if (durationMinutes != null) tp.setDurationMinutes(durationMinutes);
        if (orderIndex != null)      tp.setOrderIndex(orderIndex);
        return testPartRepository.save(tp);
    }

    @Transactional
    public void removePartFromTestSession(Long testPartId) {
        TestPart tp = getTestPartById(testPartId);
        testPartRepository.delete(tp);
    }

    public List<Part> getAvailablePartsForTestSession(Long testSessionId) {
        TestSession ts = testSessionRepository.findById(testSessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy test session"));
        // Lấy tất cả parts của session gốc
        List<Part> allParts = partRepository.findBySessionIdOrderByOrderIndexAsc(
                ts.getSession().getId());
        // Lọc những part chưa thêm vào test session này
        List<Long> addedPartIds = testPartRepository
                .findByTestSessionIdOrderByOrderIndexAsc(testSessionId)
                .stream().map(tp -> tp.getPart().getId()).toList();
        return allParts.stream()
                .filter(p -> !addedPartIds.contains(p.getId()))
                .toList();
    }

    // ===== TEST QUESTION GROUP =====

    @Transactional
    public TestQuestionGroup addQuestionGroupToTestPart(Long testPartId, Long questionGroupId,
                                                         Integer orderIndex, Integer questionFrom, Integer questionTo) {
        TestPart testPart = testPartRepository.findById(testPartId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy test part"));
        QuestionGroup questionGroup = questionGroupRepository.findById(questionGroupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy question group"));

        if (testQuestionGroupRepository.existsByTestPartIdAndQuestionGroupId(testPartId, questionGroupId)) {
            throw new RuntimeException("Question group này đã được thêm vào test part");
        }

        TestQuestionGroup tqg = new TestQuestionGroup();
        tqg.setTestPart(testPart);
        tqg.setQuestionGroup(questionGroup);
        tqg.setOrderIndex(orderIndex);
        tqg.setQuestionFrom(questionFrom);
        tqg.setQuestionTo(questionTo);
        return testQuestionGroupRepository.save(tqg);
    }

    public List<TestQuestionGroup> getTestQuestionGroups(Long testPartId) {
        return testQuestionGroupRepository.findByTestPartIdOrderByOrderIndexAsc(testPartId);
    }

    public TestQuestionGroup getTestQuestionGroupById(Long tqgId) {
        return testQuestionGroupRepository.findById(tqgId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy question group trong đề thi"));
    }

    @Transactional
    public TestQuestionGroup updateTestQuestionGroup(Long tqgId, Integer orderIndex,
                                                      Integer questionFrom, Integer questionTo,
                                                      Boolean isRandomOrder, String customTitle,
                                                      String customInstructions) {
        TestQuestionGroup tqg = getTestQuestionGroupById(tqgId);
        if (orderIndex != null)         tqg.setOrderIndex(orderIndex);
        if (questionFrom != null)       tqg.setQuestionFrom(questionFrom);
        if (questionTo != null)         tqg.setQuestionTo(questionTo);
        if (isRandomOrder != null)      tqg.setIsRandomOrder(isRandomOrder);
        if (customTitle != null)        tqg.setCustomTitle(customTitle);
        if (customInstructions != null) tqg.setCustomInstructions(customInstructions);
        return testQuestionGroupRepository.save(tqg);
    }

    @Transactional
    public void removeQuestionGroupFromTestPart(Long tqgId) {
        TestQuestionGroup tqg = getTestQuestionGroupById(tqgId);
        testQuestionGroupRepository.delete(tqg);
    }

    public List<QuestionGroup> getAvailableQuestionGroupsForTestPart(Long testPartId) {
        TestPart tp = testPartRepository.findById(testPartId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy test part"));
        // Lấy tất cả question groups của part gốc
        List<QuestionGroup> allGroups = questionGroupRepository
                .findByPartIdAndIsActiveTrueOrderByOrderIndexAsc(tp.getPart().getId());
        // Lọc những group chưa thêm vào test part
        List<Long> addedGroupIds = testQuestionGroupRepository
                .findByTestPartIdOrderByOrderIndexAsc(testPartId)
                .stream().map(tqg -> tqg.getQuestionGroup().getId()).toList();
        return allGroups.stream()
                .filter(g -> !addedGroupIds.contains(g.getId()))
                .toList();
    }

    // ===== TEST SETTING =====

    public TestSetting getTestSetting(Long testId) {
        return testSettingRepository.findByTestId(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cài đặt cho đề thi này"));
    }

    @Transactional
    public TestSetting updateTestSetting(Long testId, TestSetting updatedSetting) {
        TestSetting setting = getTestSetting(testId);
        updatedSetting.setId(setting.getId());
        updatedSetting.setTest(setting.getTest());
        return testSettingRepository.save(updatedSetting);
    }
}
