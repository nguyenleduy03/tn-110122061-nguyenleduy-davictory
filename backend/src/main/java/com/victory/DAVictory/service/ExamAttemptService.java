package com.victory.DAVictory.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.DAVictory.dto.AttemptAnswerSave;
import com.victory.DAVictory.dto.ExamAttemptGradeHistoryResponse;
import com.victory.DAVictory.dto.ExamAttemptManualGradeRequest;
import com.victory.DAVictory.dto.ExamAttemptResponse;
import com.victory.DAVictory.dto.ExamAttemptStartRequest;
import com.victory.DAVictory.dto.ExamAttemptSubmitRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class ExamAttemptService {

    private static final Logger log = LoggerFactory.getLogger(ExamAttemptService.class);

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
    private final JdbcTemplate jdbcTemplate;
    private final AtomicBoolean examHistoryTableChecked = new AtomicBoolean(false);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExamRepository examRepository;
    private final ExamService examService;

    @Transactional
    public ExamAttemptResponse startAttempt(String username, ExamAttemptStartRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        if (req.getTestId() == null || req.getSkillType() == null) {
            throw new RuntimeException("Thiếu testId hoặc skillType");
        }

        // Check exam access if examId is provided
        if (req.getExamId() != null) {
            examService.checkStudentCanAccess(req.getExamId(), user.getId());
        }

        Test test = testRepository.findById(req.getTestId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID=" + req.getTestId()));

        SkillType skillType = req.getSkillType();
        Session session = sessionRepository.findBySkillTypeAndTestType(skillType, test.getTestType())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session cho skill " + skillType));

        TestSession testSession = testSessionRepository.findByTestIdAndSessionId(test.getId(), session.getId())
                .orElseThrow(() -> new RuntimeException("Session này chưa được thêm vào đề thi"));

        Integer attemptNumber = examAttemptRepository.getNextAttemptNumberByTest(user.getId(), test.getId(),
                session.getId());
        if (attemptNumber == null)
            attemptNumber = 1;

        Integer timeLimitSeconds = req.getTimeLimitSeconds();
        if (timeLimitSeconds == null) {
            Integer durationMinutes = testSession.getDurationMinutes() != null 
                ? testSession.getDurationMinutes() 
                : session.getDurationMinutes();
            if (durationMinutes != null) {
                timeLimitSeconds = durationMinutes * 60;
            }
        }

        ExamAttempt attempt = new ExamAttempt();
        attempt.setUser(user);
        attempt.setTest(test);
        attempt.setSession(testSession.getSession());
        attempt.setStatus("IN_PROGRESS");
        attempt.setStartedAt(LocalDateTime.now());
        attempt.setTimeLimitSeconds(timeLimitSeconds);
        attempt.setAttemptNumber(attemptNumber);

        if (req.getExamId() != null) {
            Exam exam = examRepository.findById(req.getExamId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi"));
            attempt.setExam(exam);
        }

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

        // Server-side timer validation
        if (attempt.getTimeLimitSeconds() != null && attempt.getTimeLimitSeconds() > 0) {
            long elapsedSeconds = java.time.Duration.between(attempt.getStartedAt(), LocalDateTime.now()).getSeconds();
            if (elapsedSeconds > attempt.getTimeLimitSeconds() + 60) { // Grace period 60s
                attempt.setStatus("TIMED_OUT");
                examAttemptRepository.save(attempt);
                throw new RuntimeException("Đã quá thời gian làm bài");
            }
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
        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");

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
        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");

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

    @Transactional
    public ExamAttemptResponse getAttemptDetailForTeacher(String teacherUsername, Long attemptId) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        Long studentId = attempt.getUser().getId();
        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");
        
        // Teacher xem bài của chính mình
        if (teacher.getId().equals(studentId)) {
            logAttemptViewIfWriting(attempt, teacher);
            return toResponseWithAnswers(attempt);
        }

        // Kiểm tra GV có dạy học viên này không
        boolean isTeachingStudent = classTeacherRepository.existsByUserIdAndClazzIdInAndIsActiveTrue(
                teacher.getId(),
                classStudentRepository.findByUserIdOrderByEnrolledAtDesc(studentId).stream()
                        .map(cs -> cs.getClazz().getId())
                        .toList());

        if (!isTeachingStudent && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xem bài làm của học viên này");
        }

        logAttemptViewIfWriting(attempt, teacher);
        return toResponseWithAnswers(attempt);
    }

    @Transactional
    public ExamAttemptResponse updateAttemptGrade(String teacherUsername,
            Long attemptId,
            ExamAttemptManualGradeRequest request) {
        if (request == null) {
            throw new RuntimeException("Thiếu dữ liệu chỉnh sửa điểm");
        }

        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        validateTeacherCanAccessAttempt(teacher, attempt);

        Integer oldTotalCorrect = attempt.getTotalCorrect();
        Double oldBandScore = attempt.getBandScore();
        String oldFeedback = attempt.getFeedback();

        boolean hasUpdate = false;

        if (request.getTotalCorrect() != null) {
            if (request.getTotalCorrect() < 0) {
                throw new RuntimeException("Số câu đúng không hợp lệ");
            }
            attempt.setTotalCorrect(request.getTotalCorrect());
            attempt.setRawScore(request.getTotalCorrect().doubleValue());

            Double autoBand = calculateExamBand(
                    attempt.getSession() != null ? attempt.getSession().getSkillType() : null,
                    request.getTotalCorrect());
            if (autoBand != null) {
                attempt.setBandScore(autoBand);
            }
            hasUpdate = true;
        }

        if (request.getBandScore() != null) {
            double band = request.getBandScore();
            if (band < 0 || band > 9) {
                throw new RuntimeException("Band score phải nằm trong khoảng 0.0 đến 9.0");
            }
            attempt.setBandScore(band);
            hasUpdate = true;
        }

        if (request.getFeedback() != null) {
            attempt.setFeedback(request.getFeedback().trim());
            hasUpdate = true;
        }

        if (!hasUpdate) {
            throw new RuntimeException("Không có dữ liệu nào để cập nhật");
        }

        attempt.setStatus("GRADED");
        attempt.setGradedAt(LocalDateTime.now());

        ExamAttempt saved = examAttemptRepository.save(attempt);

        saveGradeHistoryRecord(
                saved,
                teacher,
                oldTotalCorrect,
                oldBandScore,
            oldFeedback);

        return toResponseWithAnswers(saved);
    }

    @Transactional
    public List<ExamAttemptGradeHistoryResponse> getAttemptGradeHistory(String teacherUsername, Long attemptId) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        validateTeacherCanAccessAttempt(teacher, attempt);

        try {
            ensureExamAttemptGradeHistoryTable();

            boolean hasEditedByUserId = hasExamAttemptHistoryColumn("edited_by_user_id");
            boolean hasEditedByUsername = hasExamAttemptHistoryColumn("edited_by_username");
            boolean hasEditedByFullName = hasExamAttemptHistoryColumn("edited_by_full_name");
            boolean hasEditorRole = hasExamAttemptHistoryColumn("editor_role");
            boolean hasOldTotalCorrect = hasExamAttemptHistoryColumn("old_total_correct");
            boolean hasNewTotalCorrect = hasExamAttemptHistoryColumn("new_total_correct");
            boolean hasOldBandScore = hasExamAttemptHistoryColumn("old_band_score");
            boolean hasNewBandScore = hasExamAttemptHistoryColumn("new_band_score");
            boolean hasOldFeedback = hasExamAttemptHistoryColumn("old_feedback");
            boolean hasNewFeedback = hasExamAttemptHistoryColumn("new_feedback");
            boolean hasEditReason = hasExamAttemptHistoryColumn("edit_reason");
            boolean hasEditedAt = hasExamAttemptHistoryColumn("edited_at");

            String joinByUserId = hasEditedByUserId
                    ? "LEFT JOIN users u ON u.id = h.edited_by_user_id"
                    : "LEFT JOIN users u ON 1 = 0";
            String joinByUsername = hasEditedByUsername
                    ? "LEFT JOIN users u_by_username ON u_by_username.username = h.edited_by_username"
                    : "LEFT JOIN users u_by_username ON 1 = 0";
            String orderExpr = hasEditedAt ? "h.edited_at" : "h.id";

            String sql = """
                      SELECT h.id,
                          %s AS edited_by_username,
                          %s AS edited_by_full_name,
                          %s AS editor_role,
                          %s AS old_total_correct,
                          %s AS new_total_correct,
                          %s AS old_band_score,
                          %s AS new_band_score,
                          %s AS old_feedback,
                          %s AS new_feedback,
                          %s AS edit_reason,
                          %s AS edited_at,
                          u.full_name AS editor_full_name_from_user_id,
                          u.username AS editor_username_from_user_id,
                          u_by_username.full_name AS editor_full_name_from_username,
                          u_by_username.username AS editor_username_from_username
                      FROM exam_attempt_grade_history h
                      %s
                      %s
                      WHERE h.exam_attempt_id = ?
                    ORDER BY %s DESC
                    """.formatted(
                    hasEditedByUsername ? "h.edited_by_username" : "NULL",
                    hasEditedByFullName ? "h.edited_by_full_name" : "NULL",
                    hasEditorRole ? "h.editor_role" : "NULL",
                    hasOldTotalCorrect ? "h.old_total_correct" : "NULL",
                    hasNewTotalCorrect ? "h.new_total_correct" : "NULL",
                    hasOldBandScore ? "h.old_band_score" : "NULL",
                    hasNewBandScore ? "h.new_band_score" : "NULL",
                    hasOldFeedback ? "h.old_feedback" : "NULL",
                    hasNewFeedback ? "h.new_feedback" : "NULL",
                    hasEditReason ? "h.edit_reason" : "NULL",
                    hasEditedAt ? "h.edited_at" : "NULL",
                    joinByUserId,
                    joinByUsername,
                    orderExpr
            );

            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                ExamAttemptGradeHistoryResponse dto = new ExamAttemptGradeHistoryResponse();
                dto.setId(rs.getLong("id"));
                String editedByUsername = firstNonBlank(
                        rs.getString("edited_by_username"),
                        rs.getString("editor_username_from_user_id"),
                        rs.getString("editor_username_from_username"));
                dto.setEditedByUsername(editedByUsername);

                String editedByFullName = firstNonBlank(
                        rs.getString("edited_by_full_name"),
                        rs.getString("editor_full_name_from_user_id"),
                        rs.getString("editor_full_name_from_username"),
                        editedByUsername);
                dto.setEditedByFullName(editedByFullName);
                dto.setEditorRole(rs.getString("editor_role"));
                dto.setOldTotalCorrect((Integer) rs.getObject("old_total_correct"));
                dto.setNewTotalCorrect((Integer) rs.getObject("new_total_correct"));
                dto.setOldBandScore(toNullableDouble(rs.getObject("old_band_score")));
                dto.setNewBandScore(toNullableDouble(rs.getObject("new_band_score")));
                dto.setOldFeedback(rs.getString("old_feedback"));
                dto.setNewFeedback(rs.getString("new_feedback"));
                dto.setEditReason(rs.getString("edit_reason"));
                var ts = rs.getTimestamp("edited_at");
                dto.setEditedAt(ts != null ? ts.toLocalDateTime() : null);
                return dto;
            }, attemptId);
        } catch (DataAccessException e) {
            log.warn("Không thể tải lịch sử sửa điểm cho attempt {}", attemptId, e);
            return List.of();
        }
    }

    @Transactional
    public ExamAttemptResponse autoSubmitTimeout(Long attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            throw new RuntimeException("Bài thi đã được nộp hoặc hết hạn");
        }

        // Verify timeout
        if (attempt.getTimeLimitSeconds() != null && attempt.getTimeLimitSeconds() > 0) {
            long elapsedSeconds = java.time.Duration.between(attempt.getStartedAt(), LocalDateTime.now()).getSeconds();
            if (elapsedSeconds < attempt.getTimeLimitSeconds()) {
                throw new RuntimeException("Chưa hết thời gian làm bài");
            }
        }

        attempt.setStatus("TIMED_OUT");
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setTimeSpentSeconds(attempt.getTimeLimitSeconds());

        boolean autoGraded = gradeAttempt(attempt);
        if (autoGraded) {
            attempt.setStatus("GRADED");
            attempt.setGradedAt(LocalDateTime.now());
        }

        attempt = examAttemptRepository.save(attempt);
        return toResponse(attempt);
    }

    @Transactional
    public void backupAnswers(String username, Long attemptId, List<AttemptAnswerSave> answers) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy attempt ID=" + attemptId));

        if (!attempt.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền backup bài này");
        }

        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            throw new RuntimeException("Bài thi đã kết thúc");
        }

        saveAnswers(attempt, answers);
    }

    @Transactional(readOnly = true)
    public List<ExamAttemptResponse> filterAttempts(String teacherUsername, 
                                                     com.victory.DAVictory.dto.ExamAttemptFilterRequest filter) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");

        // Get all attempts based on access rights
        List<ExamAttempt> attempts;
        
        if (filter.getClassId() != null) {
            // Filter by class
            if (!isAdmin) {
                boolean isTeachingClass = classTeacherRepository
                    .existsByUserIdAndClazzIdAndIsActiveTrue(teacher.getId(), filter.getClassId());
                if (!isTeachingClass) {
                    throw new RuntimeException("Bạn không có quyền xem bài làm của lớp này");
                }
            }
            
            if (filter.getStudentId() != null) {
                attempts = examAttemptRepository.findByStudentIdAndClassId(
                    filter.getStudentId(), filter.getClassId());
            } else {
                attempts = examAttemptRepository.findByClassId(filter.getClassId());
            }
        } else if (filter.getStudentId() != null) {
            // Filter by specific student
            attempts = examAttemptRepository.findByUserIdOrderByCreatedAtDesc(filter.getStudentId());
            
            if (!isAdmin && !teacher.getId().equals(filter.getStudentId())) {
                // Check if teacher teaches this student
                List<Long> studentClasses = classStudentRepository
                    .findByUserIdOrderByEnrolledAtDesc(filter.getStudentId())
                    .stream()
                    .map(cs -> cs.getClazz().getId())
                    .toList();
                
                boolean isTeachingStudent = classTeacherRepository
                    .existsByUserIdAndClazzIdInAndIsActiveTrue(teacher.getId(), studentClasses);
                
                if (!isTeachingStudent) {
                    throw new RuntimeException("Bạn không có quyền xem bài làm của học viên này");
                }
            }
        } else if (isAdmin) {
            // Admin sees all
            attempts = examAttemptRepository.findAll();
        } else {
            // Teacher sees attempts from their classes
            List<Long> teacherClasses = classTeacherRepository
                .findByUserIdAndIsActiveTrue(teacher.getId())
                .stream()
                .map(ct -> ct.getClazz().getId())
                .toList();
            
            List<Long> studentIds = classStudentRepository.findAll().stream()
                .filter(cs -> teacherClasses.contains(cs.getClazz().getId()))
                .map(cs -> cs.getUser().getId())
                .distinct()
                .toList();
            
            if (studentIds.isEmpty()) {
                return List.of();
            }
            
            attempts = examAttemptRepository.findByUserIdInOrderByStartedAtDesc(studentIds);
        }

        // Apply filters
        return attempts.stream()
            .filter(a -> filter.getTestId() == null || 
                        (a.getTest() != null && a.getTest().getId().equals(filter.getTestId())))
            .filter(a -> filter.getSkillType() == null || 
                        (a.getSession() != null && a.getSession().getSkillType() == filter.getSkillType()))
            .filter(a -> filter.getStatus() == null || 
                        a.getStatus().equals(filter.getStatus()))
            .filter(a -> filter.getStartDate() == null || 
                        a.getStartedAt().isAfter(filter.getStartDate()))
            .filter(a -> filter.getEndDate() == null || 
                        a.getStartedAt().isBefore(filter.getEndDate()))
            .filter(a -> filter.getMinBandScore() == null || 
                        (a.getBandScore() != null && a.getBandScore() >= filter.getMinBandScore()))
            .filter(a -> filter.getMaxBandScore() == null || 
                        (a.getBandScore() != null && a.getBandScore() <= filter.getMaxBandScore()))
            .sorted((a1, a2) -> {
                if ("DESC".equals(filter.getSortDirection())) {
                    return compareAttempts(a2, a1, filter.getSortBy());
                }
                return compareAttempts(a1, a2, filter.getSortBy());
            })
            .skip((long) filter.getPage() * filter.getSize())
            .limit(filter.getSize())
            .map(this::toResponse)
            .toList();
    }

    private int compareAttempts(ExamAttempt a1, ExamAttempt a2, String sortBy) {
        return switch (sortBy) {
            case "bandScore" -> {
                Double score1 = a1.getBandScore() != null ? a1.getBandScore() : 0.0;
                Double score2 = a2.getBandScore() != null ? a2.getBandScore() : 0.0;
                yield score1.compareTo(score2);
            }
            case "createdAt" -> a1.getCreatedAt().compareTo(a2.getCreatedAt());
            default -> { // submittedAt
                if (a1.getSubmittedAt() == null && a2.getSubmittedAt() == null) yield 0;
                if (a1.getSubmittedAt() == null) yield 1;
                if (a2.getSubmittedAt() == null) yield -1;
                yield a1.getSubmittedAt().compareTo(a2.getSubmittedAt());
            }
        };
    }

    private void validateTeacherCanAccessAttempt(User teacher, ExamAttempt attempt) {
        Long studentId = attempt.getUser().getId();
        if (teacher.getId().equals(studentId)) {
            return;
        }

        boolean isTeachingStudent = classTeacherRepository.existsByUserIdAndClazzIdInAndIsActiveTrue(
                teacher.getId(),
                classStudentRepository.findByUserIdOrderByEnrolledAtDesc(studentId).stream()
                        .map(cs -> cs.getClazz().getId())
                        .toList());

        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");

        if (!isTeachingStudent && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xem/chấm bài làm của học viên này");
        }
    }

    private String resolveEditorRole(User user) {
        boolean isAdmin = hasRoleLike(user, "ADMIN");
        if (isAdmin)
            return "ADMIN";
        boolean isManager = hasRoleLike(user, "MANAGER");
        if (isManager)
            return "MANAGER";
        boolean isTeacher = hasRoleLike(user, "TEACHER");
        if (isTeacher)
            return "TEACHER";
        return "UNKNOWN";
    }

    private boolean hasRoleLike(User user, String expected) {
        if (user == null || user.getRoles() == null || expected == null)
            return false;
        String normalizedExpected = expected.trim().toUpperCase(Locale.ROOT);
        return user.getRoles().stream().anyMatch(role -> {
            String roleName = role != null ? role.getName() : null;
            if (roleName == null || roleName.isBlank())
                return false;
            String normalized = roleName.trim().toUpperCase(Locale.ROOT);
            return normalized.equals(normalizedExpected) || normalized.equals("ROLE_" + normalizedExpected);
        });
    }

    private void logAttemptViewIfWriting(ExamAttempt attempt, User viewer) {
        SkillType skillType = attempt.getSession() != null ? attempt.getSession().getSkillType() : null;
        if (skillType != SkillType.WRITING) {
            return;
        }

        saveGradeHistoryRecord(
                attempt,
                viewer,
                attempt.getTotalCorrect(),
                attempt.getBandScore(),
                attempt.getFeedback());
    }

    private void saveGradeHistoryRecord(ExamAttempt attempt,
            User teacher,
            Integer oldTotalCorrect,
            Double oldBandScore,
            String oldFeedback) {
        try {
            ensureExamAttemptGradeHistoryTable();

            String sql = """
                    INSERT INTO exam_attempt_grade_history (
                        exam_attempt_id,
                        edited_by_user_id,
                        edited_by_username,
                        edited_by_full_name,
                        editor_role,
                        old_total_correct,
                        new_total_correct,
                        old_band_score,
                        new_band_score,
                        old_feedback,
                        new_feedback,
                        edit_reason,
                        edited_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;

            jdbcTemplate.update(
                    sql,
                    attempt.getId(),
                    teacher.getId(),
                    teacher.getUsername(),
                    teacher.getFullName(),
                    resolveEditorRole(teacher),
                    oldTotalCorrect,
                    attempt.getTotalCorrect(),
                    oldBandScore,
                    attempt.getBandScore(),
                    oldFeedback,
                    attempt.getFeedback(),
                    null,
                    java.sql.Timestamp.valueOf(LocalDateTime.now()));
        } catch (DataAccessException e) {
            // Do not block grade saving when history storage is unavailable.
            log.warn("Không thể lưu lịch sử sửa điểm cho attempt {}", attempt.getId(), e);
        }
    }

    private void ensureExamAttemptGradeHistoryTable() {
        if (examHistoryTableChecked.get()) {
            return;
        }

        synchronized (examHistoryTableChecked) {
            if (examHistoryTableChecked.get()) {
                return;
            }

            try {
                String ddl = """
                        CREATE TABLE IF NOT EXISTS exam_attempt_grade_history (
                          id BIGINT NOT NULL AUTO_INCREMENT,
                          exam_attempt_id BIGINT NOT NULL,
                          edited_by_user_id BIGINT NOT NULL,
                          edited_by_username VARCHAR(255) NOT NULL,
                                                    edited_by_full_name VARCHAR(255) NULL,
                          editor_role VARCHAR(20) NOT NULL,
                          old_total_correct INT NULL,
                          new_total_correct INT NULL,
                          old_band_score DECIMAL(3,1) NULL,
                          new_band_score DECIMAL(3,1) NULL,
                          old_feedback TEXT NULL,
                          new_feedback TEXT NULL,
                          edit_reason TEXT NULL,
                          edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (id),
                          KEY idx_eagh_attempt_edited_at (exam_attempt_id, edited_at)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                        """;
                jdbcTemplate.execute(ddl);
                ensureExamAttemptHistoryColumn("edited_by_user_id", "BIGINT NULL");
                ensureExamAttemptHistoryColumn("edited_by_username", "VARCHAR(255) NOT NULL DEFAULT ''");
                ensureExamAttemptHistoryColumn("edited_by_full_name", "VARCHAR(255) NULL");
                ensureExamAttemptHistoryColumn("editor_role", "VARCHAR(20) NOT NULL DEFAULT 'TEACHER'");
                ensureExamAttemptHistoryColumn("old_total_correct", "INT NULL");
                ensureExamAttemptHistoryColumn("new_total_correct", "INT NULL");
                ensureExamAttemptHistoryColumn("old_band_score", "DECIMAL(3,1) NULL");
                ensureExamAttemptHistoryColumn("new_band_score", "DECIMAL(3,1) NULL");
                ensureExamAttemptHistoryColumn("old_feedback", "TEXT NULL");
                ensureExamAttemptHistoryColumn("new_feedback", "TEXT NULL");
                ensureExamAttemptHistoryColumn("edit_reason", "TEXT NULL");
                ensureExamAttemptHistoryColumn("edited_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
                backfillExamAttemptHistoryTeacherFields();
                examHistoryTableChecked.set(true);
            } catch (DataAccessException e) {
                log.warn("Không thể đảm bảo bảng exam_attempt_grade_history tồn tại", e);
            }
        }
    }

    private void ensureExamAttemptHistoryColumn(String columnName, String sqlType) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'exam_attempt_grade_history'
                          AND COLUMN_NAME = ?
                        """,
                Integer.class,
                columnName);

        if (count == null || count == 0) {
            jdbcTemplate.execute("ALTER TABLE exam_attempt_grade_history ADD COLUMN " + columnName + " " + sqlType);
        }
    }

    private boolean hasExamAttemptHistoryColumn(String columnName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME = 'exam_attempt_grade_history'
                              AND COLUMN_NAME = ?
                            """,
                    Integer.class,
                    columnName);
            return count != null && count > 0;
        } catch (DataAccessException e) {
            return false;
        }
    }

    private void backfillExamAttemptHistoryTeacherFields() {
        try {
            jdbcTemplate.update(
                    """
                            UPDATE exam_attempt_grade_history h
                            LEFT JOIN users u ON u.id = h.edited_by_user_id
                            SET h.edited_by_username = COALESCE(NULLIF(h.edited_by_username, ''), u.username, h.edited_by_username)
                            WHERE h.edited_by_username IS NULL OR h.edited_by_username = ''
                            """
            );
        } catch (DataAccessException e) {
            log.warn("Không thể backfill edited_by_username cho exam_attempt_grade_history", e);
        }

        if (!hasExamAttemptHistoryColumn("edited_by_full_name")) {
            return;
        }

        try {
            jdbcTemplate.update(
                    """
                            UPDATE exam_attempt_grade_history h
                            LEFT JOIN users u ON u.id = h.edited_by_user_id
                            SET h.edited_by_full_name = COALESCE(NULLIF(h.edited_by_full_name, ''), u.full_name, h.edited_by_full_name)
                            WHERE h.edited_by_full_name IS NULL OR h.edited_by_full_name = ''
                            """
            );
        } catch (DataAccessException e) {
            log.warn("Không thể backfill edited_by_full_name cho exam_attempt_grade_history", e);
        }
    }

    @Transactional
    public void saveAnswers(ExamAttempt attempt, List<AttemptAnswerSave> answers) {
        if (answers == null)
            return;
        for (AttemptAnswerSave save : answers) {
            if (save.getQuestionId() == null)
                continue;
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
            if (answered)
                totalAnswered++;

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
        if (autoGrade) {
            attempt.setBandScore(calculateExamBand(skill, totalCorrect));
        }
        return autoGrade;
    }

    private Double calculateExamBand(SkillType skillType, Integer totalCorrect) {
        if (skillType == null || totalCorrect == null)
            return null;
        int correct = Math.max(0, totalCorrect);

        if (skillType == SkillType.LISTENING) {
            return scoreToBand(correct, new int[] { 39, 37, 35, 32, 30, 26, 23, 18, 16, 13, 10, 8, 6, 4, 2, 1, 0 },
                    new double[] { 9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.0,
                            0.0 });
        }

        if (skillType == SkillType.READING) {
            return scoreToBand(correct, new int[] { 39, 37, 35, 33, 30, 27, 23, 19, 15, 13, 10, 8, 6, 4, 2, 1, 0 },
                    new double[] { 9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.0,
                            0.0 });
        }

        return null;
    }

    private Double scoreToBand(int score, int[] thresholds, double[] bands) {
        for (int i = 0; i < thresholds.length; i++) {
            if (score >= thresholds[i]) {
                return bands[i];
            }
        }
        return null;
    }

    private boolean isAnswerCorrect(Question question, AttemptAnswer aa) {
        if (question == null || question.getQuestionType() == null)
            return false;
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

            List<String> answerList = parseAnswerList(aa);
            if (!answerList.isEmpty()) {
                return equalsIgnoreOrder(normalizeList(answerList), normalizeList(correctOptions));
            }

            String single = firstNonBlank(aa.getSelectedOptionLabel(), aa.getTextAnswer());
            return isInNormalized(single, correctOptions);
        }

        if (qt.getHasTextAnswer() || qt.getHasMatching()) {
            List<Answer> answers = answerRepository.findByQuestionIdOrderByBlankIndexAsc(question.getId());
            List<List<String>> acceptedGroups = collectShortAnswerAcceptedGroups(answers);
            if (acceptedGroups.isEmpty()) {
                return false;
            }

            List<String> submittedAnswers = parseAnswerList(aa);
            if (!submittedAnswers.isEmpty()) {
                return matchesShortAnswerGroups(acceptedGroups, submittedAnswers);
            }

            String single = firstNonBlank(aa.getTextAnswer(), aa.getSelectedOptionLabel());
            return matchesShortAnswerGroups(acceptedGroups, List.of(single));
        }

        return false;
    }

    private boolean hasAnyAnswer(AttemptAnswerSave save) {
        return (save.getSelectedOptionLabel() != null && !save.getSelectedOptionLabel().isBlank())
                || (save.getTextAnswer() != null && !save.getTextAnswer().isBlank())
                || hasMeaningfulMatchingAnswer(save.getMatchingAnswer());
    }

    private boolean hasMeaningfulMatchingAnswer(String matchingAnswer) {
        if (matchingAnswer == null || matchingAnswer.isBlank()) {
            return false;
        }

        try {
            List<String> values = objectMapper.readValue(matchingAnswer, new TypeReference<List<String>>() {
            });
            return values.stream().anyMatch(value -> value != null && !value.isBlank());
        } catch (Exception e) {
            return true;
        }
    }

    private List<String> parseAlternativeAnswers(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<String> parseAnswerList(AttemptAnswer aa) {
        if (aa.getMatchingAnswer() == null || aa.getMatchingAnswer().isBlank())
            return Collections.emptyList();
        try {
            return objectMapper.readValue(aa.getMatchingAnswer(), new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<List<String>> collectShortAnswerAcceptedGroups(List<Answer> answers) {
        if (answers == null || answers.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Integer, List<String>> grouped = new TreeMap<>();
        for (Answer ans : answers) {
            if (ans == null || Boolean.TRUE.equals(ans.getIsSample())) {
                continue;
            }

            Integer blankIndex = ans.getBlankIndex() != null ? ans.getBlankIndex() : 1;
            List<String> bucket = grouped.computeIfAbsent(blankIndex, key -> new ArrayList<>());

            if (ans.getAnswerText() != null && !ans.getAnswerText().isBlank()) {
                bucket.add(ans.getAnswerText());
            }
            if (ans.getAlternativeAnswers() != null && !ans.getAlternativeAnswers().isBlank()) {
                bucket.addAll(parseAlternativeAnswers(ans.getAlternativeAnswers()));
            }
        }

        return grouped.values().stream()
                .map(this::normalizeList)
                .filter(group -> !group.isEmpty())
                .toList();
    }

    private boolean matchesShortAnswerGroups(List<List<String>> acceptedGroups, List<String> submittedAnswers) {
        if (acceptedGroups == null || acceptedGroups.isEmpty()) {
            return false;
        }

        List<String> normalizedSubmitted = normalizeList(submittedAnswers);

        if (acceptedGroups.size() == 1) {
            String single = normalizedSubmitted.isEmpty() ? "" : normalizedSubmitted.get(0);
            return isInNormalized(single, acceptedGroups.get(0));
        }

        if (normalizedSubmitted.size() != acceptedGroups.size()) {
            return false;
        }

        for (int i = 0; i < acceptedGroups.size(); i++) {
            String userValue = normalizedSubmitted.get(i);
            List<String> accepted = acceptedGroups.get(i);
            if (!isInNormalized(userValue, accepted)) {
                return false;
            }
        }

        return true;
    }

    private String normalize(String val) {
        if (val == null)
            return "";
        return val.trim().toLowerCase(Locale.ROOT);
    }

    private List<String> normalizeList(List<String> values) {
        return values.stream().map(this::normalize).filter(v -> !v.isBlank()).toList();
    }

    private boolean equalsIgnoreOrder(List<String> a, List<String> b) {
        if (a.size() != b.size())
            return false;
        return a.stream().allMatch(b::contains);
    }

    private boolean isInNormalized(String value, List<String> candidates) {
        if (value == null || value.isBlank())
            return false;
        String n = normalize(value);
        return candidates.stream().anyMatch(c -> normalize(c).equals(n));
    }

    private String firstNonBlank(String... values) {
        if (values == null)
            return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Double toNullableDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.valueOf(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
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
        r.setFeedback(attempt.getFeedback());
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
