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
    public void deleteTest(Long id) {
        Test test = getTestById(id);
        test.setStatus(TestStatus.DELETED);
        testRepository.save(test);
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
