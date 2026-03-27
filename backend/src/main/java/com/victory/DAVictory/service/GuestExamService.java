package com.victory.DAVictory.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GuestExamService {

    private final GuestExamAttemptRepository guestAttemptRepository;
    private final TestRepository testRepository;
    private final SessionRepository sessionRepository;
    private final TestSessionRepository testSessionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public GuestExamResponse startGuestAttempt(GuestExamStartRequest req) {
        if (req.getFullName() == null || req.getFullName().isBlank()) {
            throw new RuntimeException("Vui lòng nhập họ tên");
        }
        if (req.getTestId() == null || req.getSkillType() == null) {
            throw new RuntimeException("Thiếu testId hoặc skillType");
        }

        // Rate limiting: Max 5 attempts per email per day
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
            long recentAttempts = guestAttemptRepository.countByEmailAndCreatedAtAfter(
                req.getEmail(), oneDayAgo
            );
            if (recentAttempts >= 5) {
                throw new RuntimeException("Bạn đã vượt quá số lần làm bài trong ngày (tối đa 5 lần)");
            }
        }

        Test test = testRepository.findById(req.getTestId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));

        Session session = sessionRepository.findBySkillTypeAndTestType(req.getSkillType(), test.getTestType())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session"));

        TestSession testSession = testSessionRepository.findByTestIdAndSessionId(test.getId(), session.getId())
                .orElseThrow(() -> new RuntimeException("Session chưa được thêm vào đề thi"));

        Integer timeLimitSeconds = req.getTimeLimitSeconds();
        if (timeLimitSeconds == null) {
            Integer durationMinutes = testSession.getDurationMinutes() != null 
                ? testSession.getDurationMinutes() 
                : session.getDurationMinutes();
            if (durationMinutes != null) {
                timeLimitSeconds = durationMinutes * 60;
            }
        }

        GuestExamAttempt attempt = new GuestExamAttempt();
        attempt.setFullName(req.getFullName().trim());
        attempt.setEmail(req.getEmail() != null ? req.getEmail().trim() : null);
        attempt.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        attempt.setTest(test);
        attempt.setSession(session);
        attempt.setStatus("IN_PROGRESS");
        attempt.setStartedAt(LocalDateTime.now());
        attempt.setTimeLimitSeconds(timeLimitSeconds);

        attempt = guestAttemptRepository.save(attempt);
        return toResponse(attempt);
    }

    @Transactional
    public GuestExamResponse submitGuestAttempt(Long attemptId, GuestExamSubmitRequest req) {
        GuestExamAttempt attempt = guestAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài thi"));

        if (req != null && req.getAnswers() != null) {
            try {
                attempt.setAnswersJson(objectMapper.writeValueAsString(req.getAnswers()));
            } catch (Exception e) {
                throw new RuntimeException("Lỗi lưu câu trả lời");
            }
        }

        attempt.setTimeSpentSeconds(req != null ? req.getTimeSpentSeconds() : null);
        attempt.setSubmittedAt(LocalDateTime.now());

        boolean autoGraded = gradeGuestAttempt(attempt, req != null ? req.getAnswers() : null);
        attempt.setStatus(autoGraded ? "GRADED" : "SUBMITTED");

        attempt = guestAttemptRepository.save(attempt);
        return toResponse(attempt);
    }

    private boolean gradeGuestAttempt(GuestExamAttempt attempt, List<AttemptAnswerSave> answers) {
        SkillType skill = attempt.getSession().getSkillType();
        boolean autoGrade = skill == SkillType.LISTENING || skill == SkillType.READING;

        if (!autoGrade || answers == null) return false;

        int totalAnswered = 0;
        int totalCorrect = 0;
        double rawScore = 0.0;

        for (AttemptAnswerSave ans : answers) {
            if (ans.getQuestionId() == null) continue;

            Question question = questionRepository.findById(ans.getQuestionId()).orElse(null);
            if (question == null) continue;

            boolean answered = hasAnyAnswer(ans);
            if (answered) totalAnswered++;

            boolean isCorrect = isAnswerCorrect(question, ans);
            if (isCorrect) {
                totalCorrect++;
                rawScore += question.getPoints() != null ? question.getPoints() : 1.0;
            }
        }

        attempt.setTotalAnswered(totalAnswered);
        attempt.setTotalCorrect(totalCorrect);
        attempt.setRawScore(rawScore);
        attempt.setBandScore(calculateBand(skill, totalCorrect));
        return true;
    }

    private boolean isAnswerCorrect(Question question, AttemptAnswerSave ans) {
        if (question == null || question.getQuestionType() == null) return false;
        QuestionType qt = question.getQuestionType();

        if (qt.getHasOptions()) {
            List<String> correctOptions = questionOptionRepository
                    .findByQuestionIdOrderByOrderIndexAsc(question.getId())
                    .stream()
                    .filter(QuestionOption::getIsCorrect)
                    .map(opt -> opt.getOptionText() != null && !opt.getOptionText().isBlank()
                            ? opt.getOptionText()
                            : opt.getOptionLabel())
                    .filter(s -> s != null && !s.isBlank())
                    .toList();

            String single = firstNonBlank(ans.getSelectedOptionLabel(), ans.getTextAnswer());
            return isInNormalized(single, correctOptions);
        }

        if (qt.getHasTextAnswer() || qt.getHasMatching()) {
            List<Answer> answers = answerRepository.findByQuestionIdOrderByBlankIndexAsc(question.getId());
            List<String> correctAnswers = new ArrayList<>();
            for (Answer a : answers) {
                if (a.getAnswerText() != null && !a.getAnswerText().isBlank()) {
                    correctAnswers.add(a.getAnswerText());
                }
                if (a.getAlternativeAnswers() != null && !a.getAlternativeAnswers().isBlank()) {
                    correctAnswers.addAll(parseAlternativeAnswers(a.getAlternativeAnswers()));
                }
            }

            String single = firstNonBlank(ans.getTextAnswer(), ans.getSelectedOptionLabel());
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

    private String normalize(String val) {
        if (val == null) return "";
        return val.trim().toLowerCase(Locale.ROOT);
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

    private Double calculateBand(SkillType skillType, Integer totalCorrect) {
        if (skillType == null || totalCorrect == null) return null;
        int correct = Math.max(0, totalCorrect);

        if (skillType == SkillType.LISTENING) {
            return scoreToBand(correct, new int[]{39,37,35,32,30,26,23,18,16,13,10,8,6,4,2,1,0},
                    new double[]{9.0,8.5,8.0,7.5,7.0,6.5,6.0,5.5,5.0,4.5,4.0,3.5,3.0,2.5,2.0,1.0,0.0});
        }

        if (skillType == SkillType.READING) {
            return scoreToBand(correct, new int[]{39,37,35,33,30,27,23,19,15,13,10,8,6,4,2,1,0},
                    new double[]{9.0,8.5,8.0,7.5,7.0,6.5,6.0,5.5,5.0,4.5,4.0,3.5,3.0,2.5,2.0,1.0,0.0});
        }

        return null;
    }

    private Double scoreToBand(int score, int[] thresholds, double[] bands) {
        for (int i = 0; i < thresholds.length; i++) {
            if (score >= thresholds[i]) return bands[i];
        }
        return null;
    }

    private GuestExamResponse toResponse(GuestExamAttempt attempt) {
        GuestExamResponse r = new GuestExamResponse();
        r.setId(attempt.getId());
        r.setFullName(attempt.getFullName());
        r.setEmail(attempt.getEmail());
        r.setTestId(attempt.getTest() != null ? attempt.getTest().getId() : null);
        r.setTestTitle(attempt.getTest() != null ? attempt.getTest().getTitle() : null);
        r.setSessionId(attempt.getSession() != null ? attempt.getSession().getId() : null);
        r.setSkillType(attempt.getSession() != null ? attempt.getSession().getSkillType() : null);
        r.setStatus(attempt.getStatus());
        r.setStartedAt(attempt.getStartedAt());
        r.setSubmittedAt(attempt.getSubmittedAt());
        r.setTimeLimitSeconds(attempt.getTimeLimitSeconds());
        r.setTimeSpentSeconds(attempt.getTimeSpentSeconds());
        r.setTotalAnswered(attempt.getTotalAnswered());
        r.setTotalCorrect(attempt.getTotalCorrect());
        r.setRawScore(attempt.getRawScore());
        r.setBandScore(attempt.getBandScore());
        return r;
    }
}
