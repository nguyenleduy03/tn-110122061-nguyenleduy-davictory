package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TestAttemptService {

    private final ExamAttemptRepository examAttemptRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final AttemptQuestionTimeRepository attemptQuestionTimeRepository;
    private final TestRepository testRepository;
    private final TestSessionRepository testSessionRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final QuestionOptionRepository questionOptionRepository;

    /**
     * Bắt đầu bài thi mới
     * - Full test: tất cả 4 kỹ năng
     * - Single skill: chỉ 1 kỹ năng
     * - Practice: thi thử không tính điểm
     */
    @Transactional
    public TestAttemptResponse startTest(String username, TestAttemptRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        Test test = testRepository.findById(request.getTestId())
                .orElseThrow(() -> new RuntimeException("Test not found: " + request.getTestId()));

        // Xác định loại bài thi
        String attemptType;
        List<SkillType> skillsToTest;
        
        if (request.getSkills() == null || request.getSkills().isEmpty()) {
            // Full test - tất cả kỹ năng
            attemptType = "FULL_TEST";
            skillsToTest = Arrays.asList(SkillType.LISTENING, SkillType.READING, 
                                        SkillType.WRITING, SkillType.SPEAKING);
        } else if (request.getSkills().size() == 1) {
            // Single skill
            attemptType = "SINGLE_SKILL";
            skillsToTest = request.getSkills();
        } else {
            // Multiple skills (custom)
            attemptType = "CUSTOM";
            skillsToTest = request.getSkills();
        }

        if (Boolean.TRUE.equals(request.getIsPractice())) {
            attemptType = "PRACTICE_" + attemptType;
        }

        // Tính tổng thời gian
        int totalTimeSeconds = 0;
        if (request.getTimeLimitMinutes() != null) {
            totalTimeSeconds = request.getTimeLimitMinutes() * 60;
        } else {
            // Tính từ sessions
            for (SkillType skill : skillsToTest) {
                Session session = sessionRepository.findBySkillTypeAndTestType(skill, test.getTestType())
                        .orElseThrow(() -> new RuntimeException("Session not found for skill: " + skill));
                TestSession testSession = testSessionRepository.findByTestIdAndSessionId(test.getId(), session.getId())
                        .orElse(null);
                
                if (testSession != null && testSession.getDurationMinutes() != null) {
                    totalTimeSeconds += testSession.getDurationMinutes() * 60;
                } else if (session.getDurationMinutes() != null) {
                    totalTimeSeconds += session.getDurationMinutes() * 60;
                }
            }
        }

        // Tạo attempt chính (cho skill đầu tiên hoặc full test)
        Session firstSession = sessionRepository.findBySkillTypeAndTestType(
                skillsToTest.get(0), test.getTestType())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        Integer attemptNumber = examAttemptRepository.getNextAttemptNumber(user.getId());
        if (attemptNumber == null) attemptNumber = 1;

        ExamAttempt mainAttempt = new ExamAttempt();
        mainAttempt.setUser(user);
        mainAttempt.setTest(test);
        mainAttempt.setSession(firstSession);
        mainAttempt.setStatus("IN_PROGRESS");
        mainAttempt.setStartedAt(LocalDateTime.now());
        mainAttempt.setTimeLimitSeconds(totalTimeSeconds);
        mainAttempt.setAttemptNumber(attemptNumber);
        mainAttempt.setAttemptType(attemptType);
        
        mainAttempt = examAttemptRepository.save(mainAttempt);

        // Tạo AttemptAnswer cho tất cả câu hỏi trong các skills được chọn
        List<TestAttemptResponse.SessionAttemptInfo> sessionInfos = new ArrayList<>();
        
        for (SkillType skill : skillsToTest) {
            Session session = sessionRepository.findBySkillTypeAndTestType(skill, test.getTestType())
                    .orElseThrow(() -> new RuntimeException("Session not found for skill: " + skill));
            
            TestSession testSession = testSessionRepository.findByTestIdAndSessionId(test.getId(), session.getId())
                    .orElse(null);
            
            if (testSession == null || !testSession.getIsIncluded()) {
                continue; // Skip nếu session không được include trong test
            }

            // Lấy tất cả questions trong session này
            List<Question> questions = questionRepository.findAllBySessionId(session.getId());
            
            // Tạo AttemptAnswer cho mỗi câu hỏi
            for (Question question : questions) {
                AttemptAnswer attemptAnswer = new AttemptAnswer();
                attemptAnswer.setExamAttempt(mainAttempt);
                attemptAnswer.setQuestion(question);
                attemptAnswer.setIsAnswered(false);
                attemptAnswer.setIsCorrect(false);
                attemptAnswer.setIsFlagged(false);
                attemptAnswer.setPoints(0.0);
                attemptAnswerRepository.save(attemptAnswer);
            }

            // Thêm session info
            TestAttemptResponse.SessionAttemptInfo info = new TestAttemptResponse.SessionAttemptInfo();
            info.setSessionId(session.getId());
            info.setSkillType(skill.name());
            info.setSessionName(session.getName());
            info.setDurationMinutes(testSession.getDurationMinutes() != null ? 
                    testSession.getDurationMinutes() : session.getDurationMinutes());
            info.setTotalQuestions(questions.size());
            info.setAnsweredQuestions(0);
            info.setIsCompleted(false);
            sessionInfos.add(info);
        }

        // Build response
        TestAttemptResponse response = new TestAttemptResponse();
        response.setAttemptId(mainAttempt.getId());
        response.setTestId(test.getId());
        response.setTestTitle(test.getTitle());
        response.setAttemptType(attemptType);
        response.setSessions(sessionInfos);
        response.setStartedAt(mainAttempt.getStartedAt());
        response.setExpiresAt(mainAttempt.getStartedAt().plusSeconds(totalTimeSeconds));
        response.setTimeLimitSeconds(totalTimeSeconds);
        response.setStatus("IN_PROGRESS");

        return response;
    }

    /**
     * Lưu câu trả lời (tạm thời hoặc cuối cùng)
     */
    @Transactional
    public TestAttemptResponse saveAnswers(String username, SubmitAnswersRequest request) {
        ExamAttempt attempt = examAttemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + request.getAttemptId()));

        if (!attempt.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized access to attempt");
        }

        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            throw new RuntimeException("Attempt is not in progress");
        }

        // Lưu từng câu trả lời
        for (SubmitAnswersRequest.QuestionAnswer qa : request.getAnswers()) {
            AttemptAnswer attemptAnswer = attemptAnswerRepository
                    .findByExamAttemptIdAndQuestionId(attempt.getId(), qa.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Answer record not found for question: " + qa.getQuestionId()));

            // Lưu câu trả lời
            if (qa.getAnswerText() != null) {
                attemptAnswer.setAnswerText(qa.getAnswerText());
            }
            if (qa.getAnswerList() != null && !qa.getAnswerList().isEmpty()) {
                attemptAnswer.setAnswerText(String.join("|||", qa.getAnswerList()));
            }
            
            attemptAnswer.setIsAnswered(qa.getAnswerText() != null || 
                    (qa.getAnswerList() != null && !qa.getAnswerList().isEmpty()));
            attemptAnswer.setIsFlagged(qa.getIsFlagged() != null ? qa.getIsFlagged() : false);
            
            attemptAnswerRepository.save(attemptAnswer);

            // Lưu thời gian làm bài
            if (qa.getTimeSpentSeconds() != null && qa.getTimeSpentSeconds() > 0) {
                AttemptQuestionTime timeRecord = attemptQuestionTimeRepository
                        .findByExamAttemptIdAndQuestionId(attempt.getId(), qa.getQuestionId())
                        .orElse(new AttemptQuestionTime());
                
                timeRecord.setExamAttempt(attempt);
                timeRecord.setQuestion(attemptAnswer.getQuestion());
                timeRecord.setTimeSpentSeconds(qa.getTimeSpentSeconds());
                attemptQuestionTimeRepository.save(timeRecord);
            }
        }

        // Nếu là final submit, chấm điểm và hoàn thành
        if (Boolean.TRUE.equals(request.getIsFinalSubmit())) {
            return finalizeAttempt(attempt);
        }

        // Trả về trạng thái hiện tại
        return buildAttemptResponse(attempt);
    }

    /**
     * Hoàn thành bài thi và chấm điểm
     */
    @Transactional
    public TestAttemptResponse finalizeAttempt(ExamAttempt attempt) {
        attempt.setCompletedAt(LocalDateTime.now());
        attempt.setStatus("COMPLETED");

        // Chấm điểm tất cả câu trả lời
        List<AttemptAnswer> answers = attemptAnswerRepository.findByExamAttemptId(attempt.getId());
        
        int totalCorrect = 0;
        double totalPoints = 0.0;

        for (AttemptAnswer attemptAnswer : answers) {
            if (!attemptAnswer.getIsAnswered()) {
                continue;
            }

            Question question = attemptAnswer.getQuestion();
            boolean isCorrect = checkAnswer(question, attemptAnswer.getAnswerText());
            
            attemptAnswer.setIsCorrect(isCorrect);
            attemptAnswer.setPoints(isCorrect ? 1.0 : 0.0);
            attemptAnswerRepository.save(attemptAnswer);

            if (isCorrect) {
                totalCorrect++;
                totalPoints += 1.0;
            }
        }

        // Tính band score (dựa trên skill)
        Double bandScore = calculateBandScore(attempt.getSession().getSkillType(), totalCorrect, answers.size());
        attempt.setBandScore(bandScore);
        attempt.setTotalPoints(totalPoints);
        
        examAttemptRepository.save(attempt);

        return buildAttemptResponse(attempt);
    }

    /**
     * Kiểm tra câu trả lời đúng/sai
     */
    private boolean checkAnswer(Question question, String userAnswer) {
        if (userAnswer == null || userAnswer.trim().isEmpty()) {
            return false;
        }

        List<Answer> correctAnswers = answerRepository.findByQuestionIdOrderByBlankIndexAsc(question.getId());
        
        if (correctAnswers.isEmpty()) {
            // Multiple choice - check options
            List<QuestionOption> correctOptions = questionOptionRepository
                    .findByQuestionIdAndIsCorrectTrue(question.getId());
            
            if (correctOptions.isEmpty()) {
                return false;
            }

            String normalized = normalizeAnswer(userAnswer);
            return correctOptions.stream()
                    .anyMatch(opt -> normalizeAnswer(opt.getOptionText()).equals(normalized));
        }

        // Fill-in-blank / Short answer
        String normalized = normalizeAnswer(userAnswer);
        return correctAnswers.stream()
                .anyMatch(ans -> {
                    String correctText = normalizeAnswer(ans.getAnswerText());
                    if (correctText.equals(normalized)) {
                        return true;
                    }
                    // Check alternative answers
                    if (ans.getAlternativeAnswers() != null) {
                        String[] alternatives = ans.getAlternativeAnswers().split("\\|\\|\\|");
                        return Arrays.stream(alternatives)
                                .anyMatch(alt -> normalizeAnswer(alt).equals(normalized));
                    }
                    return false;
                });
    }

    /**
     * Chuẩn hóa câu trả lời để so sánh
     */
    private String normalizeAnswer(String answer) {
        if (answer == null) return "";
        return answer.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", " ");
    }

    /**
     * Tính band score IELTS dựa trên số câu đúng
     */
    private Double calculateBandScore(SkillType skillType, int correctAnswers, int totalQuestions) {
        if (totalQuestions == 0) return 0.0;
        
        double percentage = (double) correctAnswers / totalQuestions * 100;

        // Band score conversion (IELTS standard)
        if (skillType == SkillType.LISTENING || skillType == SkillType.READING) {
            if (correctAnswers >= 39) return 9.0;
            if (correctAnswers >= 37) return 8.5;
            if (correctAnswers >= 35) return 8.0;
            if (correctAnswers >= 32) return 7.5;
            if (correctAnswers >= 30) return 7.0;
            if (correctAnswers >= 26) return 6.5;
            if (correctAnswers >= 23) return 6.0;
            if (correctAnswers >= 18) return 5.5;
            if (correctAnswers >= 15) return 5.0;
            if (correctAnswers >= 13) return 4.5;
            if (correctAnswers >= 10) return 4.0;
            return 3.5;
        }

        // Writing & Speaking - manual grading required
        return null;
    }

    /**
     * Build response từ attempt
     */
    private TestAttemptResponse buildAttemptResponse(ExamAttempt attempt) {
        TestAttemptResponse response = new TestAttemptResponse();
        response.setAttemptId(attempt.getId());
        response.setTestId(attempt.getTest().getId());
        response.setTestTitle(attempt.getTest().getTitle());
        response.setAttemptType(attempt.getAttemptType());
        response.setStartedAt(attempt.getStartedAt());
        response.setTimeLimitSeconds(attempt.getTimeLimitSeconds());
        response.setStatus(attempt.getStatus());
        
        if (attempt.getTimeLimitSeconds() != null) {
            response.setExpiresAt(attempt.getStartedAt().plusSeconds(attempt.getTimeLimitSeconds()));
        }

        // Get session info
        List<TestAttemptResponse.SessionAttemptInfo> sessionInfos = new ArrayList<>();
        TestAttemptResponse.SessionAttemptInfo info = new TestAttemptResponse.SessionAttemptInfo();
        info.setSessionId(attempt.getSession().getId());
        info.setSkillType(attempt.getSession().getSkillType().name());
        info.setSessionName(attempt.getSession().getName());
        info.setDurationMinutes(attempt.getSession().getDurationMinutes());
        
        List<AttemptAnswer> answers = attemptAnswerRepository.findByExamAttemptId(attempt.getId());
        info.setTotalQuestions(answers.size());
        info.setAnsweredQuestions((int) answers.stream().filter(AttemptAnswer::getIsAnswered).count());
        info.setIsCompleted("COMPLETED".equals(attempt.getStatus()));
        
        sessionInfos.add(info);
        response.setSessions(sessionInfos);

        return response;
    }

    /**
     * Lấy kết quả chi tiết sau khi hoàn thành
     */
    @Transactional(readOnly = true)
    public TestResultResponse getTestResult(String username, Long attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        if (!attempt.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized access to attempt");
        }

        if (!"COMPLETED".equals(attempt.getStatus())) {
            throw new RuntimeException("Attempt is not completed yet");
        }

        TestResultResponse response = new TestResultResponse();
        response.setAttemptId(attempt.getId());
        response.setTestTitle(attempt.getTest().getTitle());
        response.setAttemptType(attempt.getAttemptType());
        response.setStartedAt(attempt.getStartedAt());
        response.setCompletedAt(attempt.getCompletedAt());
        
        if (attempt.getCompletedAt() != null && attempt.getStartedAt() != null) {
            response.setTotalTimeSeconds((int) java.time.Duration.between(
                    attempt.getStartedAt(), attempt.getCompletedAt()).getSeconds());
        }

        // Overall scores
        List<AttemptAnswer> answers = attemptAnswerRepository.findByExamAttemptId(attempt.getId());
        int totalQuestions = answers.size();
        int correctAnswers = (int) answers.stream().filter(AttemptAnswer::getIsCorrect).count();
        
        response.setOverallBand(attempt.getBandScore());
        response.setTotalQuestions(totalQuestions);
        response.setCorrectAnswers(correctAnswers);
        response.setAccuracyPercent(totalQuestions > 0 ? (double) correctAnswers / totalQuestions * 100 : 0.0);

        // Skill breakdown
        TestResultResponse.SkillResult skillResult = new TestResultResponse.SkillResult();
        skillResult.setSkillType(attempt.getSession().getSkillType().name());
        skillResult.setBandScore(attempt.getBandScore());
        skillResult.setTotalQuestions(totalQuestions);
        skillResult.setCorrectAnswers(correctAnswers);
        skillResult.setAccuracyPercent(response.getAccuracyPercent());
        response.setSkillResults(Collections.singletonList(skillResult));

        // Question details
        List<TestResultResponse.QuestionResult> questionResults = new ArrayList<>();
        int questionNumber = 1;
        
        for (AttemptAnswer aa : answers) {
            TestResultResponse.QuestionResult qr = new TestResultResponse.QuestionResult();
            qr.setQuestionId(aa.getQuestion().getId());
            qr.setQuestionNumber(questionNumber++);
            qr.setQuestionType(aa.getQuestion().getQuestionType().getName());
            qr.setUserAnswer(aa.getAnswerText());
            
            // Get correct answer
            List<Answer> correctAns = answerRepository.findByQuestionIdOrderByBlankIndexAsc(aa.getQuestion().getId());
            if (!correctAns.isEmpty()) {
                qr.setCorrectAnswer(correctAns.stream()
                        .map(Answer::getAnswerText)
                        .collect(Collectors.joining(", ")));
            }
            
            qr.setIsCorrect(aa.getIsCorrect());
            qr.setPoints(aa.getPoints());
            
            questionResults.add(qr);
        }
        
        response.setQuestionResults(questionResults);

        return response;
    }
}
