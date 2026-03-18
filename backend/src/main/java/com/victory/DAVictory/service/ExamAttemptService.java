package com.victory.DAVictory.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.DAVictory.dto.AttemptAnswerSave;
import com.victory.DAVictory.dto.ExamAttemptResponse;
import com.victory.DAVictory.dto.ExamAttemptStartRequest;
import com.victory.DAVictory.dto.ExamAttemptSubmitRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ExamAttemptService {

    private final ExamAttemptRepository examAttemptRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final TestRepository testRepository;
    private final SessionRepository sessionRepository;
    private final TestSessionRepository testSessionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final UserRepository userRepository;
    private final ClassTeacherRepository classTeacherRepository;
    private final ClassStudentRepository classStudentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ExamAttemptResponse startAttempt(String username, ExamAttemptStartRequest req) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        if (req.getTestId() == null || req.getSkillType() == null) {
            throw new RuntimeException("Thiếu testId hoặc skillType");
        }

        Test test = testRepository.findById(req.getTestId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID=" + req.getTestId()));

        SkillType skillType = req.getSkillType();
        Session session = sessionRepository.findBySkillTypeAndTestType(skillType, test.getTestType())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy session cho skill " + skillType));

        TestSession testSession = testSessionRepository.findByTestIdAndSessionId(test.getId(), session.getId())
            .orElseThrow(() -> new RuntimeException("Session này chưa được thêm vào đề thi"));

        Integer attemptNumber = examAttemptRepository.getNextAttemptNumberByTest(user.getId(), test.getId(), session.getId());
        if (attemptNumber == null) attemptNumber = 1;

        ExamAttempt attempt = new ExamAttempt();
        attempt.setUser(user);
        attempt.setTest(test);
        attempt.setSession(testSession.getSession());
        attempt.setStatus("IN_PROGRESS");
        attempt.setStartedAt(LocalDateTime.now());
        attempt.setTimeLimitSeconds(req.getTimeLimitSeconds());
        attempt.setAttemptNumber(attemptNumber);

        attempt = examAttemptRepository.save(attempt);
        return toResponse(attempt);
    }

    @Transactional
    public ExamAttemptResponse submitAttempt(String username, Long attemptId, ExamAttemptSubmitRequest req) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        if (!attempt.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền nộp bài cho attempt này");
        }

        if (req != null && req.getAnswers() != null) {
            saveAnswers(attempt, req.getAnswers());
        }

        attempt.setTimeSpentSeconds(req != null ? req.getTimeSpentSeconds() : null);
        attempt.setSubmittedAt(LocalDateTime.now());

        boolean autoGraded = gradeAttempt(attempt);
        if (autoGraded) {
            attempt.setStatus("GRADED");
            attempt.setGradedAt(LocalDateTime.now());
        } else {
            attempt.setStatus("SUBMITTED");
        }

        attempt = examAttemptRepository.save(attempt);
        return toResponse(attempt);
    }

    @Transactional(readOnly = true)
    public List<ExamAttemptResponse> getMyAttempts(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        return examAttemptRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ExamAttemptResponse> getAllAttempts() {
        return examAttemptRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ExamAttemptResponse getAttempt(Long attemptId, String username) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        if (!attempt.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền xem attempt này");
        }

        return toResponse(attempt);
    }

    @Transactional(readOnly = true)
    public List<ExamAttemptResponse> getAttemptsByClass(String teacherUsername, Long classId) {
        User teacher = userRepository.findByUsername(teacherUsername)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        // Kiểm tra GV có dạy lớp này không (hoặc là ADMIN/MANAGER)
        boolean isTeacher = classTeacherRepository.existsByUserIdAndClazzIdAndIsActiveTrue(teacher.getId(), classId);
        boolean isAdmin = teacher.getRoles().stream()
            .anyMatch(r -> r.getName().equals("ADMIN") || r.getName().equals("MANAGER"));

        if (!isTeacher && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xem bài làm của lớp này");
        }

        return examAttemptRepository.findByClassId(classId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ExamAttemptResponse> getStudentAttemptsByClass(String teacherUsername, Long classId, Long studentId) {
        User teacher = userRepository.findByUsername(teacherUsername)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        // Kiểm tra GV có dạy lớp này không
        boolean isTeacher = classTeacherRepository.existsByUserIdAndClazzIdAndIsActiveTrue(teacher.getId(), classId);
        boolean isAdmin = teacher.getRoles().stream()
            .anyMatch(r -> r.getName().equals("ADMIN") || r.getName().equals("MANAGER"));

        if (!isTeacher && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xem bài làm của lớp này");
        }

        // Kiểm tra học viên có trong lớp không
        boolean isStudentInClass = classStudentRepository.existsByUserIdAndClazzId(studentId, classId);
        if (!isStudentInClass) {
            throw new RuntimeException("Học viên không thuộc lớp này");
        }

        return examAttemptRepository.findByStudentIdAndClassId(studentId, classId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ExamAttemptResponse getAttemptDetailForTeacher(String teacherUsername, Long attemptId) {
        User teacher = userRepository.findByUsername(teacherUsername)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        // Kiểm tra GV có dạy học viên này không
        Long studentId = attempt.getUser().getId();
        boolean isTeachingStudent = classTeacherRepository.existsByUserIdAndClazzIdInAndIsActiveTrue(
            teacher.getId(),
            classStudentRepository.findByUserIdOrderByEnrolledAtDesc(studentId).stream()
                .map(cs -> cs.getClazz().getId())
                .toList()
        );

        boolean isAdmin = teacher.getRoles().stream()
            .anyMatch(r -> r.getName().equals("ADMIN") || r.getName().equals("MANAGER"));

        if (!isTeachingStudent && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xem bài làm của học viên này");
        }

        return toResponseWithAnswers(attempt);
    }

    @Transactional
    public void saveAnswers(ExamAttempt attempt, List<AttemptAnswerSave> answers) {
        if (answers == null) return;
        for (AttemptAnswerSave save : answers) {
            if (save.getQuestionId() == null) continue;
            Question question = questionRepository.findById(save.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy question ID=" + save.getQuestionId()));

            AttemptAnswer attemptAnswer = attemptAnswerRepository
                .findByExamAttemptIdAndQuestionId(attempt.getId(), question.getId())
                .orElseGet(AttemptAnswer::new);

            attemptAnswer.setExamAttempt(attempt);
            attemptAnswer.setQuestion(question);
            attemptAnswer.setSelectedOptionLabel(save.getSelectedOptionLabel());
            attemptAnswer.setTextAnswer(save.getTextAnswer());
            attemptAnswer.setMatchingAnswer(save.getMatchingAnswer());
            attemptAnswer.setIsFlagged(save.getIsFlagged() != null ? save.getIsFlagged() : false);
            attemptAnswer.setAnsweredAt(LocalDateTime.now());

            boolean isAnswered = hasAnyAnswer(save);
            attemptAnswer.setIsAnswered(isAnswered);

            attemptAnswerRepository.save(attemptAnswer);
        }
    }

    private boolean gradeAttempt(ExamAttempt attempt) {
        SkillType skill = attempt.getSession().getSkillType();
        boolean autoGrade = skill == SkillType.LISTENING || skill == SkillType.READING;

        List<AttemptAnswer> attemptAnswers = attemptAnswerRepository.findByExamAttemptId(attempt.getId());
        int totalAnswered = 0;
        int totalCorrect = 0;
        double rawScore = 0.0;

        for (AttemptAnswer aa : attemptAnswers) {
            boolean answered = Boolean.TRUE.equals(aa.getIsAnswered());
            if (answered) totalAnswered++;

            if (!autoGrade) {
                aa.setIsCorrect(null);
                aa.setPointsEarned(null);
                attemptAnswerRepository.save(aa);
                continue;
            }

            Question question = aa.getQuestion();
            boolean isCorrect = isAnswerCorrect(question, aa);
            aa.setIsCorrect(isCorrect);
            aa.setPointsEarned(isCorrect ? (question.getPoints() != null ? question.getPoints() : 1.0) : 0.0);
            attemptAnswerRepository.save(aa);

            if (isCorrect) {
                totalCorrect++;
                rawScore += aa.getPointsEarned() != null ? aa.getPointsEarned() : 1.0;
            }
        }

        attempt.setTotalAnswered(totalAnswered);
        attempt.setTotalCorrect(totalCorrect);
        attempt.setRawScore(rawScore);
        return autoGrade;
    }

    private boolean isAnswerCorrect(Question question, AttemptAnswer aa) {
        if (question == null || question.getQuestionType() == null) return false;
        QuestionType qt = question.getQuestionType();

        if (qt.getHasOptions()) {
            List<String> correctOptions = questionOptionRepository
                .findByQuestionIdOrderByOrderIndexAsc(question.getId())
                .stream()
                .filter(QuestionOption::getIsCorrect)
                .map(opt -> opt.getOptionText() != null && !opt.getOptionText().isBlank()
                    ? opt.getOptionText() : opt.getOptionLabel())
                .filter(s -> s != null && !s.isBlank())
                .toList();

            List<String> answerList = parseAnswerList(aa);
            if (!answerList.isEmpty()) {
                return equalsIgnoreOrder(normalizeList(answerList), normalizeList(correctOptions));
            }

            String single = firstNonBlank(aa.getSelectedOptionLabel(), aa.getTextAnswer());
            return isInNormalized(single, correctOptions);
        }

        if (qt.getHasTextAnswer() || qt.getHasMatching()) {
            List<Answer> answers = answerRepository.findByQuestionIdOrderByBlankIndexAsc(question.getId());
            List<String> correctAnswers = new ArrayList<>();
            for (Answer ans : answers) {
                if (ans.getAnswerText() != null && !ans.getAnswerText().isBlank()) {
                    correctAnswers.add(ans.getAnswerText());
                }
                if (ans.getAlternativeAnswers() != null && !ans.getAlternativeAnswers().isBlank()) {
                    correctAnswers.addAll(parseAlternativeAnswers(ans.getAlternativeAnswers()));
                }
            }

            String single = firstNonBlank(aa.getTextAnswer(), aa.getSelectedOptionLabel());
            return isInNormalized(single, correctAnswers);
        }

        return false;
    }

    private boolean hasAnyAnswer(AttemptAnswerSave save) {
        return (save.getSelectedOptionLabel() != null && !save.getSelectedOptionLabel().isBlank())
            || (save.getTextAnswer() != null && !save.getTextAnswer().isBlank())
            || (save.getMatchingAnswer() != null && !save.getMatchingAnswer().isBlank());
    }

    private List<String> parseAlternativeAnswers(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<String> parseAnswerList(AttemptAnswer aa) {
        if (aa.getMatchingAnswer() == null || aa.getMatchingAnswer().isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(aa.getMatchingAnswer(), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String normalize(String val) {
        if (val == null) return "";
        return val.trim().toLowerCase(Locale.ROOT);
    }

    private List<String> normalizeList(List<String> values) {
        return values.stream().map(this::normalize).filter(v -> !v.isBlank()).toList();
    }

    private boolean equalsIgnoreOrder(List<String> a, List<String> b) {
        if (a.size() != b.size()) return false;
        return a.stream().allMatch(b::contains);
    }

    private boolean isInNormalized(String value, List<String> candidates) {
        if (value == null || value.isBlank()) return false;
        String n = normalize(value);
        return candidates.stream().anyMatch(c -> normalize(c).equals(n));
    }

    private String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }

    private ExamAttemptResponse toResponse(ExamAttempt attempt) {
        ExamAttemptResponse r = new ExamAttemptResponse();
        r.setId(attempt.getId());
        r.setTestId(attempt.getTest() != null ? attempt.getTest().getId() : null);
        r.setTestTitle(attempt.getTest() != null ? attempt.getTest().getTitle() : null);
        r.setSessionId(attempt.getSession() != null ? attempt.getSession().getId() : null);
        r.setSkillType(attempt.getSession() != null ? attempt.getSession().getSkillType() : null);
        r.setUserId(attempt.getUser() != null ? attempt.getUser().getId() : null);
        r.setUsername(attempt.getUser() != null ? attempt.getUser().getUsername() : null);
        r.setStatus(attempt.getStatus());
        r.setStartedAt(attempt.getStartedAt());
        r.setSubmittedAt(attempt.getSubmittedAt());
        r.setGradedAt(attempt.getGradedAt());
        r.setTimeLimitSeconds(attempt.getTimeLimitSeconds());
        r.setTimeSpentSeconds(attempt.getTimeSpentSeconds());
        r.setTotalAnswered(attempt.getTotalAnswered());
        r.setTotalCorrect(attempt.getTotalCorrect());
        r.setRawScore(attempt.getRawScore());
        r.setBandScore(attempt.getBandScore());
        r.setAttemptNumber(attempt.getAttemptNumber());
        return r;
    }

    private ExamAttemptResponse toResponseWithAnswers(ExamAttempt attempt) {
        ExamAttemptResponse r = toResponse(attempt);
        
        // Thêm chi tiết câu trả lời
        List<AttemptAnswer> answers = attemptAnswerRepository.findByExamAttemptIdOrderByQuestionIdAsc(attempt.getId());
        r.setAnswers(answers.stream().map(ans -> {
            var dto = new AttemptAnswerSave();
            dto.setQuestionId(ans.getQuestion().getId());
            dto.setTextAnswer(ans.getTextAnswer());
            dto.setSelectedOptionLabel(ans.getSelectedOptionLabel());
            dto.setMatchingAnswer(ans.getMatchingAnswer());
            dto.setIsFlagged(ans.getIsFlagged());
            return dto;
        }).toList());
        
        return r;
    }
}
