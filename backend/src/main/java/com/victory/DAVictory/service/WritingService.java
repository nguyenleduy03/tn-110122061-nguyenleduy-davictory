package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.dto.WritingGradeRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WritingService {

    private final StudentWritingSubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final ClassStudentRepository classStudentRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final WritingScoreRepository writingScoreRepository;
    private final WritingScoringCriteriaRepository writingScoringCriteriaRepository;

    // ─── Nộp bài Writing ────────────────────────────────────────────
    @Transactional
    public WritingSubmissionResponse submitWriting(String username, WritingSubmitRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        QuestionGroup group = questionGroupRepository.findById(req.getQuestionGroupId())
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy question group ID=" + req.getQuestionGroupId()));

        // Tính số thứ tự lần nộp
        Integer attemptNumber = submissionRepository
                .getNextAttemptNumberByGroup(user.getId(), group.getId());
        if (attemptNumber == null) attemptNumber = 1;

        StudentWritingSubmission submission = new StudentWritingSubmission();
        submission.setUser(user);
        submission.setQuestionGroup(group);
        submission.setSubmissionText(req.getSubmissionText() != null ? req.getSubmissionText() : "");
        submission.setWordCount(req.getWordCount() != null ? req.getWordCount() : 0);
        submission.setTimeTakenSeconds(req.getTimeTakenSeconds());
        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setAttemptNumber(attemptNumber);

        submission = submissionRepository.save(submission);
        return toResponse(submission);
    }

    // ─── Lấy danh sách bài viết của học viên ────────────────────────
    @Transactional(readOnly = true)
    public List<WritingSubmissionResponse> getMySubmissions(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        return submissionRepository
                .findByUserIdOrderBySubmittedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─── Lấy bài nộp cho giáo viên ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<WritingSubmissionResponse> getSubmissionsForTeacher(String teacherUsername) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên: " + teacherUsername));

        // Lấy tất cả học viên trong các lớp mà giáo viên này dạy
        List<Long> studentIds = classStudentRepository.findStudentIdsByTeacherUsername(teacherUsername);
        
        if (studentIds.isEmpty()) {
            return List.of();
        }

        List<StudentWritingSubmission> submissions = submissionRepository.findByUserIdInOrderBySubmittedAtDesc(studentIds);
        return submissions.stream()
                .map(this::toResponse)
                .toList();
    }

    // ─── Lấy tất cả bài làm (writing + exam attempts) cho giáo viên ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getAllSubmissionsForTeacher(String teacherUsername) {
        List<Long> studentIds = classStudentRepository.findStudentIdsByTeacherUsername(teacherUsername);
        
        if (studentIds.isEmpty()) {
            return Map.of("writingSubmissions", List.of(), "examAttempts", List.of());
        }

        // Lấy writing submissions
        List<StudentWritingSubmission> writings = submissionRepository.findByUserIdInOrderBySubmittedAtDesc(studentIds);
        List<WritingSubmissionResponse> writingResponses = writings.stream().map(this::toResponse).toList();

        // Lấy exam attempts (Reading, Listening, Speaking)
        List<ExamAttempt> attempts = examAttemptRepository.findByUserIdInOrderByStartedAtDesc(studentIds);
        List<Map<String, Object>> attemptResponses = attempts.stream().map(a -> Map.of(
            "id", (Object) a.getId(),
            "userId", (Object) a.getUser().getId(),
            "username", (Object) a.getUser().getUsername(),
            "examType", (Object) (a.getSession() != null && a.getSession().getSkillType() != null ? a.getSession().getSkillType().toString() : "UNKNOWN"),
            "examTitle", (Object) (a.getTest() != null ? a.getTest().getTitle() : "N/A"),
            "status", (Object) a.getStatus(),
            "bandScore", (Object) (a.getBandScore() != null ? a.getBandScore() : 0.0),
            "startedAt", (Object) a.getStartedAt(),
            "submittedAt", (Object) a.getSubmittedAt()
        )).toList();

        return Map.of(
            "writingSubmissions", writingResponses,
            "examAttempts", attemptResponses
        );
    }

    // ─── Lấy chi tiết một bài viết ─────────────────────────────────
    @Transactional(readOnly = true)
    public WritingSubmissionResponse getSubmission(Long submissionId, String username) {
        StudentWritingSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp ID=" + submissionId));

        // Chỉ cho phép xem bài của chính mình (hoặc giáo viên/admin xem qua endpoint khác)
        if (!submission.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền xem bài này");
        }
        return toResponse(submission);
    }

    // ─── Lấy chi tiết bài viết cho giáo viên ─────────────────────────────────
    @Transactional(readOnly = true)
    public WritingSubmissionResponse getSubmissionForTeacher(Long submissionId, String teacherUsername) {
        StudentWritingSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp ID=" + submissionId));

        // Kiểm tra giáo viên có quyền xem bài này không (học viên phải trong lớp của GV)
        List<Long> studentIds = classStudentRepository.findStudentIdsByTeacherUsername(teacherUsername);
        if (!studentIds.contains(submission.getUser().getId())) {
            throw new RuntimeException("Không có quyền xem bài này");
        }
        
        return toResponse(submission);
    }

    // ─── Mapper ─────────────────────────────────────────────────────
    private WritingSubmissionResponse toResponse(StudentWritingSubmission s) {
        WritingSubmissionResponse r = new WritingSubmissionResponse();
        r.setId(s.getId());
        r.setUserId(s.getUser().getId());
        r.setUsername(s.getUser().getUsername());

        List<ClassStudent> activeClassMemberships = classStudentRepository.findByUserIdAndStatus(s.getUser().getId(), "ACTIVE");
        List<Long> classIds = activeClassMemberships.stream().map(cs -> cs.getClazz().getId()).toList();
        List<String> classCodes = activeClassMemberships.stream().map(cs -> cs.getClazz().getCode()).toList();
        List<String> classNames = activeClassMemberships.stream().map(cs -> cs.getClazz().getName()).toList();
        r.setClassIds(classIds);
        r.setClassCodes(classCodes);
        r.setClassNames(classNames);
        r.setClassId(classIds.isEmpty() ? null : classIds.get(0));
        r.setClassCode(classCodes.isEmpty() ? null : classCodes.get(0));
        r.setClassName(classNames.isEmpty() ? null : classNames.get(0));

        if (s.getQuestionGroup() != null) {
            r.setQuestionGroupId(s.getQuestionGroup().getId());
            r.setGroupTitle(s.getQuestionGroup().getTitle());
        }

        r.setSubmissionText(s.getSubmissionText());
        r.setWordCount(s.getWordCount());
        r.setTimeTakenSeconds(s.getTimeTakenSeconds());
        r.setStatus(s.getStatus());
        r.setSubmittedAt(s.getSubmittedAt());
        r.setOverallBandScore(s.getOverallBandScore());
        r.setOverallFeedback(s.getOverallFeedback());
        r.setGradedByUsername(s.getGradedBy() != null ? s.getGradedBy().getUsername() : null);
        r.setAttemptNumber(s.getAttemptNumber());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }

    // ─── Chấm bài Writing ────────────────────────────────────────────
    @Transactional
    public WritingSubmissionResponse gradeWriting(Long submissionId, String teacherUsername, WritingGradeRequest req) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        
        StudentWritingSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        
        // Xóa điểm cũ nếu có
        writingScoreRepository.deleteBySubmissionId(submissionId);
        
        // Lưu điểm từng tiêu chí
        double totalScore = 0;
        int count = 0;
        
        for (WritingGradeRequest.CriteriaScore cs : req.getCriteriaScores()) {
            WritingScoringCriteria criteria = writingScoringCriteriaRepository.findById(cs.getCriteriaId())
                    .orElseThrow(() -> new RuntimeException("Criteria not found"));
            
            WritingScore score = new WritingScore();
            score.setSubmission(submission);
            score.setCriteria(criteria);
            score.setScore(cs.getScore());
            score.setFeedback(cs.getFeedback());
            score.setScoredBy(teacher);
            score.setScoredAt(LocalDateTime.now());
            writingScoreRepository.save(score);
            
            totalScore += cs.getScore();
            count++;
        }
        
        // Tính band score trung bình
        double avgBand = count > 0 ? roundBandScore(totalScore / count) : 0;
        
        submission.setBandScore(avgBand);
        submission.setOverallFeedback(req.getOverallFeedback());
        submission.setGradedBy(teacher);
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus("GRADED");
        submissionRepository.save(submission);
        
        return toResponse(submission);
    }
    
    private double roundBandScore(double score) {
        // Làm tròn theo quy tắc IELTS: .25 -> .5, .75 -> up
        double decimal = score - Math.floor(score);
        if (decimal < 0.25) return Math.floor(score);
        if (decimal < 0.75) return Math.floor(score) + 0.5;
        return Math.ceil(score);
    }
}
