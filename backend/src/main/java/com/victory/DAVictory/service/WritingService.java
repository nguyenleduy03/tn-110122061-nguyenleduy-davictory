package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.dto.WritingGradeRequest;
import com.victory.DAVictory.dto.WritingGradeHistoryResponse;
import com.victory.DAVictory.entity.*;
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
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class WritingService {

    private static final Logger log = LoggerFactory.getLogger(WritingService.class);

    private final StudentWritingSubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final ClassStudentRepository classStudentRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final WritingScoreRepository writingScoreRepository;
    private final WritingScoringCriteriaRepository writingScoringCriteriaRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AtomicBoolean writingHistoryTableChecked = new AtomicBoolean(false);

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
    @Transactional
    public WritingSubmissionResponse getSubmissionForTeacher(Long submissionId, String teacherUsername) {
        StudentWritingSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nộp ID=" + submissionId));

        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên: " + teacherUsername));

        validateTeacherCanAccessSubmission(teacher, submission);
        logWritingSubmissionView(submission, teacher);
        
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
        r.setGradedAt(s.getGradedAt());
        r.setOverallBandScore(s.getOverallBandScore());
        r.setOverallFeedback(s.getOverallFeedback());
        r.setGradedByUsername(s.getGradedBy() != null ? s.getGradedBy().getUsername() : null);
        r.setGradedByFullName(s.getGradedBy() != null ? s.getGradedBy().getFullName() : null);
        r.setAttemptNumber(s.getAttemptNumber());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }

    @Transactional
    public List<WritingGradeHistoryResponse> getWritingGradeHistory(Long submissionId, String teacherUsername) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        StudentWritingSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài writing ID=" + submissionId));

        validateTeacherCanAccessSubmission(teacher, submission);

        try {
            ensureWritingGradeHistoryTable();

            boolean hasEditedByUserId = hasWritingHistoryColumn("edited_by_user_id");
            boolean hasEditedByUsername = hasWritingHistoryColumn("edited_by_username");
            boolean hasEditedByFullName = hasWritingHistoryColumn("edited_by_full_name");
            boolean hasEditorRole = hasWritingHistoryColumn("editor_role");
            boolean hasOldBandScore = hasWritingHistoryColumn("old_band_score");
            boolean hasNewBandScore = hasWritingHistoryColumn("new_band_score");
            boolean hasOldFeedback = hasWritingHistoryColumn("old_feedback");
            boolean hasNewFeedback = hasWritingHistoryColumn("new_feedback");
            boolean hasEditReason = hasWritingHistoryColumn("edit_reason");
            boolean hasEditedAt = hasWritingHistoryColumn("edited_at");

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
                      FROM writing_submission_grade_history h
                      %s
                      %s
                      WHERE h.writing_submission_id = ?
                    ORDER BY %s DESC
                    """.formatted(
                    hasEditedByUsername ? "h.edited_by_username" : "NULL",
                    hasEditedByFullName ? "h.edited_by_full_name" : "NULL",
                    hasEditorRole ? "h.editor_role" : "NULL",
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
                WritingGradeHistoryResponse dto = new WritingGradeHistoryResponse();
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
                dto.setOldBandScore(toNullableDouble(rs.getObject("old_band_score")));
                dto.setNewBandScore(toNullableDouble(rs.getObject("new_band_score")));
                dto.setOldFeedback(rs.getString("old_feedback"));
                dto.setNewFeedback(rs.getString("new_feedback"));
                dto.setEditReason(rs.getString("edit_reason"));
                var ts = rs.getTimestamp("edited_at");
                dto.setEditedAt(ts != null ? ts.toLocalDateTime() : null);
                return dto;
            }, submissionId);
        } catch (DataAccessException e) {
            log.warn("Không thể tải lịch sử chấm Writing cho submission {}", submissionId, e);
            return List.of();
        }
    }

    // ─── Chấm bài Writing ────────────────────────────────────────────
    @Transactional
    public WritingSubmissionResponse gradeWriting(Long submissionId, String teacherUsername, WritingGradeRequest req) {
        if (req == null) {
            throw new RuntimeException("Thiếu dữ liệu chấm bài");
        }

        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        
        StudentWritingSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        validateTeacherCanAccessSubmission(teacher, submission);

        Double oldBandScore = submission.getOverallBandScore();
        String oldFeedback = submission.getOverallFeedback();

        List<WritingGradeRequest.CriteriaScore> criteriaScores = req.getCriteriaScores() != null
                ? req.getCriteriaScores()
                : List.of();

        Double finalBand;

        if (!criteriaScores.isEmpty()) {
            // Xóa điểm cũ nếu có và giáo viên đang chấm lại theo rubric.
            writingScoreRepository.deleteBySubmissionId(submissionId);

            double totalScore = 0;
            int count = 0;

            for (WritingGradeRequest.CriteriaScore cs : criteriaScores) {
                if (cs.getCriteriaId() == null || cs.getScore() == null) continue;

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

            if (count == 0) {
                throw new RuntimeException("Vui lòng nhập điểm rubric hợp lệ để chấm bài");
            }

            finalBand = roundBandScore(totalScore / count);
        } else if (req.getOverallBandScore() != null) {
            finalBand = validateAndNormalizeBand(req.getOverallBandScore());
        } else if (submission.getOverallBandScore() != null) {
            // Cho phép cập nhật feedback mà không đổi điểm band.
            finalBand = submission.getOverallBandScore();
        } else {
            throw new RuntimeException("Vui lòng cung cấp điểm band hoặc rubric để chấm bài");
        }
        
        submission.setOverallBandScore(finalBand);
        submission.setOverallFeedback(normalizeFeedback(req.getOverallFeedback()));
        submission.setGradedBy(teacher);
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus("GRADED");
        submissionRepository.save(submission);

        saveWritingGradeHistoryRecord(submission, teacher, oldBandScore, oldFeedback);
        
        return toResponse(submission);
    }

    private String normalizeFeedback(String feedback) {
        if (feedback == null) return null;
        String trimmed = feedback.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Double validateAndNormalizeBand(Double value) {
        if (value == null) return null;
        if (value < 0 || value > 9) {
            throw new RuntimeException("Band score phải nằm trong khoảng 0.0 - 9.0");
        }
        return roundBandScore(value);
    }

    private void validateTeacherCanAccessSubmission(User teacher, StudentWritingSubmission submission) {
        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");
        if (isAdmin) return;

        List<Long> studentIds = classStudentRepository.findStudentIdsByTeacherUsername(teacher.getUsername());
        if (!studentIds.contains(submission.getUser().getId())) {
            throw new RuntimeException("Không có quyền xem/chấm bài này");
        }
    }

    private boolean hasRoleLike(User user, String expected) {
        if (user == null || user.getRoles() == null || expected == null) return false;
        String normalizedExpected = expected.trim().toUpperCase(Locale.ROOT);
        return user.getRoles().stream().anyMatch(role -> {
            String roleName = role != null ? role.getName() : null;
            if (roleName == null || roleName.isBlank()) return false;
            String normalized = roleName.trim().toUpperCase(Locale.ROOT);
            return normalized.equals(normalizedExpected) || normalized.equals("ROLE_" + normalizedExpected);
        });
    }

    private String resolveEditorRole(User user) {
        if (hasRoleLike(user, "ADMIN")) return "ADMIN";
        if (hasRoleLike(user, "MANAGER")) return "MANAGER";
        if (hasRoleLike(user, "TEACHER")) return "TEACHER";
        return "UNKNOWN";
    }

    private void logWritingSubmissionView(StudentWritingSubmission submission, User viewer) {
        saveWritingGradeHistoryRecord(
                submission,
                viewer,
                submission.getOverallBandScore(),
                submission.getOverallFeedback());
    }

    private void saveWritingGradeHistoryRecord(StudentWritingSubmission submission,
                                               User teacher,
                                               Double oldBandScore,
                                               String oldFeedback) {
        try {
            ensureWritingGradeHistoryTable();

            String sql = """
                    INSERT INTO writing_submission_grade_history (
                        writing_submission_id,
                        edited_by_user_id,
                        edited_by_username,
                        edited_by_full_name,
                        editor_role,
                        old_band_score,
                        new_band_score,
                        old_feedback,
                        new_feedback,
                        edit_reason,
                        edited_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;

            jdbcTemplate.update(
                    sql,
                    submission.getId(),
                    teacher.getId(),
                    teacher.getUsername(),
                    teacher.getFullName(),
                    resolveEditorRole(teacher),
                    oldBandScore,
                    submission.getOverallBandScore(),
                    oldFeedback,
                    submission.getOverallFeedback(),
                    null,
                    java.sql.Timestamp.valueOf(LocalDateTime.now())
            );
        } catch (DataAccessException e) {
            log.warn("Không thể lưu lịch sử chấm Writing cho submission {}", submission.getId(), e);
        }
    }

    private void ensureWritingGradeHistoryTable() {
        if (writingHistoryTableChecked.get()) {
            return;
        }

        synchronized (writingHistoryTableChecked) {
            if (writingHistoryTableChecked.get()) {
                return;
            }

            try {
                String ddl = """
                        CREATE TABLE IF NOT EXISTS writing_submission_grade_history (
                          id BIGINT NOT NULL AUTO_INCREMENT,
                          writing_submission_id BIGINT NOT NULL,
                          edited_by_user_id BIGINT NOT NULL,
                          edited_by_username VARCHAR(255) NOT NULL,
                                                    edited_by_full_name VARCHAR(255) NULL,
                          editor_role VARCHAR(20) NOT NULL,
                          old_band_score DECIMAL(3,1) NULL,
                          new_band_score DECIMAL(3,1) NULL,
                          old_feedback TEXT NULL,
                          new_feedback TEXT NULL,
                          edit_reason TEXT NULL,
                          edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (id),
                          KEY idx_wsgh_submission_edited_at (writing_submission_id, edited_at)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                        """;
                jdbcTemplate.execute(ddl);
                ensureWritingHistoryColumn("edited_by_user_id", "BIGINT NULL");
                ensureWritingHistoryColumn("edited_by_username", "VARCHAR(255) NOT NULL DEFAULT ''");
                ensureWritingHistoryColumn("edited_by_full_name", "VARCHAR(255) NULL");
                ensureWritingHistoryColumn("editor_role", "VARCHAR(20) NOT NULL DEFAULT 'TEACHER'");
                ensureWritingHistoryColumn("old_band_score", "DECIMAL(3,1) NULL");
                ensureWritingHistoryColumn("new_band_score", "DECIMAL(3,1) NULL");
                ensureWritingHistoryColumn("old_feedback", "TEXT NULL");
                ensureWritingHistoryColumn("new_feedback", "TEXT NULL");
                ensureWritingHistoryColumn("edit_reason", "TEXT NULL");
                ensureWritingHistoryColumn("edited_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
                backfillWritingHistoryTeacherFields();
                writingHistoryTableChecked.set(true);
            } catch (DataAccessException e) {
                log.warn("Không thể đảm bảo bảng writing_submission_grade_history tồn tại", e);
            }
        }
    }

    private void ensureWritingHistoryColumn(String columnName, String sqlType) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'writing_submission_grade_history'
                          AND COLUMN_NAME = ?
                        """,
                Integer.class,
                columnName);

        if (count == null || count == 0) {
            jdbcTemplate.execute("ALTER TABLE writing_submission_grade_history ADD COLUMN " + columnName + " " + sqlType);
        }
    }

    private boolean hasWritingHistoryColumn(String columnName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME = 'writing_submission_grade_history'
                              AND COLUMN_NAME = ?
                            """,
                    Integer.class,
                    columnName);
            return count != null && count > 0;
        } catch (DataAccessException e) {
            return false;
        }
    }

    private void backfillWritingHistoryTeacherFields() {
        try {
            jdbcTemplate.update(
                    """
                            UPDATE writing_submission_grade_history h
                            LEFT JOIN users u ON u.id = h.edited_by_user_id
                            SET h.edited_by_username = COALESCE(NULLIF(h.edited_by_username, ''), u.username, h.edited_by_username)
                            WHERE h.edited_by_username IS NULL OR h.edited_by_username = ''
                            """
            );
        } catch (DataAccessException e) {
            log.warn("Không thể backfill edited_by_username cho writing_submission_grade_history", e);
        }

        if (!hasWritingHistoryColumn("edited_by_full_name")) {
            return;
        }

        try {
            jdbcTemplate.update(
                    """
                            UPDATE writing_submission_grade_history h
                            LEFT JOIN users u ON u.id = h.edited_by_user_id
                            SET h.edited_by_full_name = COALESCE(NULLIF(h.edited_by_full_name, ''), u.full_name, h.edited_by_full_name)
                            WHERE h.edited_by_full_name IS NULL OR h.edited_by_full_name = ''
                            """
            );
        } catch (DataAccessException e) {
            log.warn("Không thể backfill edited_by_full_name cho writing_submission_grade_history", e);
        }
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
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
    
    private double roundBandScore(double score) {
        // Làm tròn theo quy tắc IELTS: .25 -> .5, .75 -> up
        double decimal = score - Math.floor(score);
        if (decimal < 0.25) return Math.floor(score);
        if (decimal < 0.75) return Math.floor(score) + 0.5;
        return Math.ceil(score);
    }
}
