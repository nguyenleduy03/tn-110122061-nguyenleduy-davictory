package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AssignmentService {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository submissionRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private ClassTeacherRepository classTeacherRepository;

    @Autowired
    private ClassStudentRepository classStudentRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public AssignmentResponse createAssignment(AssignmentRequest request, User currentUser) {
        com.victory.DAVictory.entity.Class clazz = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new RuntimeException("Lớp không tồn tại"));

        validateTeacherAccess(clazz, currentUser);

        Assignment assignment = new Assignment();
        assignment.setClazz(clazz);
        assignment.setCreatedBy(currentUser);
        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setAssignmentType(request.getAssignmentType());
        assignment.setTestId(request.getTestId());
        assignment.setAttachmentUrl(request.getAttachmentUrl());
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setDueDate(request.getDueDate());
        assignment.setIsRequired(request.getIsRequired() != null ? request.getIsRequired() : true);
        assignment.setMaxScore(request.getMaxScore());
        assignment.setStatus(request.getStatus() != null ? request.getStatus() : "DRAFT");
        assignment.setNotes(request.getNotes());
        assignment.setIsActive(true);

        assignment = assignmentRepository.save(assignment);

        return buildResponse(assignment);
    }

    @Transactional
    public AssignmentResponse updateAssignment(Long id, AssignmentRequest request, User currentUser) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        validateTeacherAccess(assignment.getClazz(), currentUser);

        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setAssignmentType(request.getAssignmentType());
        assignment.setTestId(request.getTestId());
        assignment.setAttachmentUrl(request.getAttachmentUrl());
        assignment.setDueDate(request.getDueDate());
        assignment.setIsRequired(request.getIsRequired());
        assignment.setMaxScore(request.getMaxScore());
        assignment.setStatus(request.getStatus());
        assignment.setNotes(request.getNotes());

        assignment = assignmentRepository.save(assignment);

        return buildResponse(assignment);
    }

    @Transactional
    public void deleteAssignment(Long id, User currentUser) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        validateTeacherAccess(assignment.getClazz(), currentUser);

        assignment.setIsActive(false);
        assignmentRepository.save(assignment);
    }

    public AssignmentResponse getAssignmentById(Long id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        return buildResponse(assignment);
    }

    public List<AssignmentResponse> getAssignmentsByClass(Long classId) {
        List<Assignment> assignments = assignmentRepository.findByClazzIdAndIsActiveTrueOrderByDueDateAsc(classId);
        return assignments.stream()
                .map(this::buildResponse)
                .collect(Collectors.toList());
    }

    public List<AssignmentResponse> getMyAssignments(User currentUser) {
        List<Assignment> assignments = assignmentRepository.findByCreatedByIdAndIsActiveTrueOrderByCreatedAtDesc(currentUser.getId());
        return assignments.stream()
                .filter(a -> a.getClazz() != null)
                .map(this::buildResponse)
                .collect(Collectors.toList());
    }

    public List<AssignmentResponse> getMyTemplates(User currentUser) {
        List<Assignment> templates = assignmentRepository.findByCreatedByIdAndIsActiveTrueOrderByCreatedAtDesc(currentUser.getId());
        return templates.stream()
                .filter(a -> a.getClazz() == null)
                .map(this::buildTemplateResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AssignmentResponse createTemplateFromTest(Long testId, AssignmentRequest request, User currentUser) {
        Assignment template = new Assignment();
        template.setClazz(null);
        template.setCreatedBy(currentUser);
        template.setTitle(request.getTitle());
        template.setDescription(request.getDescription());
        template.setAssignmentType(request.getAssignmentType());
        template.setTestId(testId);
        template.setAttachmentUrl(request.getAttachmentUrl());
        template.setMaxScore(request.getMaxScore());
        template.setStatus("TEMPLATE");
        template.setNotes(request.getNotes());
        template.setIsActive(true);

        template = assignmentRepository.save(template);
        return buildTemplateResponse(template);
    }

    public List<AssignmentResponse> getAssignmentsForStudent(Long classId, User student) {
        validateStudentInClass(classId, student);
        // Chỉ lấy bài tập PUBLISHED cho học viên
        List<Assignment> assignments = assignmentRepository.findByClazzIdAndIsActiveTrueOrderByDueDateAsc(classId);
        return assignments.stream()
                .filter(a -> "PUBLISHED".equals(a.getStatus()))
                .map(this::buildResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AssignmentSubmissionResponse submitAssignment(AssignmentSubmissionRequest request, User student) {
        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        if (!"PUBLISHED".equals(assignment.getStatus())) {
            throw new RuntimeException("Bài tập chưa được phát hành");
        }

        validateStudentInClass(assignment.getClazz().getId(), student);

        AssignmentSubmission submission = submissionRepository
                .findByAssignmentIdAndUserId(assignment.getId(), student.getId())
                .orElse(new AssignmentSubmission());

        if ("GRADED".equals(submission.getStatus())) {
            throw new RuntimeException("Bài đã được chấm, không thể nộp lại");
        }

        submission.setAssignment(assignment);
        submission.setUser(student);
        submission.setSubmissionText(request.getSubmissionText());
        submission.setAttachmentUrl(request.getAttachmentUrl());
        submission.setExamAttemptId(request.getExamAttemptId());
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setStatus(isLateSubmission(assignment) ? "LATE" : "SUBMITTED");

        submission = submissionRepository.save(submission);

        return AssignmentSubmissionResponse.fromEntity(submission);
    }

    public AssignmentSubmissionResponse getMySubmission(Long assignmentId, User student) {
        AssignmentSubmission submission = submissionRepository
                .findByAssignmentIdAndUserId(assignmentId, student.getId())
                .orElseThrow(() -> new RuntimeException("Chưa có bài nộp"));

        return AssignmentSubmissionResponse.fromEntity(submission);
    }

    public List<AssignmentSubmissionResponse> getSubmissionsByAssignment(Long assignmentId) {
        List<AssignmentSubmission> submissions = submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
        return submissions.stream()
                .map(AssignmentSubmissionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AssignmentSubmissionResponse gradeSubmission(AssignmentGradeRequest request, User teacher) {
        AssignmentSubmission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new RuntimeException("Bài nộp không tồn tại"));

        validateTeacherAccess(submission.getAssignment().getClazz(), teacher);

        if (submission.getAssignment().getMaxScore() != null && request.getScore() != null) {
            if (request.getScore() < 0 || request.getScore() > submission.getAssignment().getMaxScore()) {
                throw new RuntimeException("Điểm không hợp lệ");
            }
        }

        submission.setScore(request.getScore());
        submission.setFeedback(request.getFeedback());
        submission.setGradedBy(teacher);
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus("GRADED");

        submission = submissionRepository.save(submission);

        return AssignmentSubmissionResponse.fromEntity(submission);
    }

    public List<AssignmentSubmissionResponse> getPendingSubmissions(Long classId) {
        List<AssignmentSubmission> submissions = submissionRepository.findPendingByClassId(classId);
        return submissions.stream()
                .map(AssignmentSubmissionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private AssignmentResponse buildResponse(Assignment assignment) {
        long totalStudents = classStudentRepository.countByClazzIdAndStatus(assignment.getClazz().getId(), "ACTIVE");
        long submittedCount = assignmentRepository.countSubmissions(assignment.getId());
        long gradedCount = submissionRepository.findByAssignmentIdAndStatus(assignment.getId(), "GRADED").size();
        Double avgScore = submissionRepository.findAvgScoreByAssignment(assignment.getId()).orElse(null);

        return AssignmentResponse.fromEntity(assignment, totalStudents, submittedCount, gradedCount, avgScore);
    }

    private AssignmentResponse buildTemplateResponse(Assignment template) {
        return AssignmentResponse.fromEntity(template, 0, 0, 0, null);
    }

    private void validateTeacherAccess(com.victory.DAVictory.entity.Class clazz, User teacher) {
        boolean isAdmin = teacher.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
        boolean isManager = teacher.getRoles().stream().anyMatch(r -> "MANAGER".equals(r.getName()));
        boolean isTeacherOfClass = classTeacherRepository.existsByUserIdAndClazzIdAndIsActiveTrue(teacher.getId(), clazz.getId());
        
        if (!isAdmin && !isManager && !isTeacherOfClass) {
            throw new RuntimeException("Bạn không có quyền truy cập lớp này");
        }
    }

    private void validateStudentInClass(Long classId, User student) {
        boolean isInClass = classStudentRepository.existsByUserIdAndClazzId(student.getId(), classId);
        if (!isInClass) {
            throw new RuntimeException("Bạn không thuộc lớp này");
        }
    }

    private boolean isLateSubmission(Assignment assignment) {
        return assignment.getDueDate() != null && LocalDateTime.now().isAfter(assignment.getDueDate());
    }
}
