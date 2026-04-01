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
public class AssignmentServiceExtension {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository submissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExamAttemptRepository examAttemptRepository;

    /**
     * Get all submissions of a student for an assignment
     */
    public List<AssignmentSubmissionResponse> getMySubmissions(Long assignmentId, User student) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        List<AssignmentSubmission> submissions = submissionRepository
                .findByAssignmentAndUserOrderByAttemptNumberDesc(assignment, student);

        return submissions.stream()
                .map(this::toSubmissionResponse)
                .collect(Collectors.toList());
    }

    /**
     * Submit MANUAL type assignment
     */
    @Transactional
    public AssignmentSubmissionResponse submitManual(Long assignmentId, ManualSubmissionRequest request, User student) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        if (!"MANUAL".equals(assignment.getType())) {
            throw new RuntimeException("This assignment is not MANUAL type");
        }

        // Check maxAttempts
        int currentAttempts = submissionRepository.countByAssignmentAndUser(assignment, student);
        if (assignment.getMaxAttempts() != null && currentAttempts >= assignment.getMaxAttempts()) {
            throw new RuntimeException("Maximum attempts reached");
        }

        // Check deadline
        if (assignment.getDueDate() != null && LocalDateTime.now().isAfter(assignment.getDueDate())) {
            if (!assignment.getAllowLateSubmission()) {
                throw new RuntimeException("Deadline passed and late submission not allowed");
            }
        }

        AssignmentSubmission submission = new AssignmentSubmission();
        submission.setAssignment(assignment);
        submission.setUser(student);
        submission.setAttemptNumber(currentAttempts + 1);
        submission.setSubmissionText(request.getSubmissionText());
        submission.setAttachmentUrl(request.getAttachmentUrl());
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setStatus("SUBMITTED");

        submission = submissionRepository.save(submission);
        return toSubmissionResponse(submission);
    }

    /**
     * Submit TEST type assignment (auto-called when test completed)
     */
    @Transactional
    public AssignmentSubmissionResponse submitTest(Long assignmentId, TestSubmissionRequest request, User student) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        if (!"TEST".equals(assignment.getType())) {
            throw new RuntimeException("This assignment is not TEST type");
        }

        ExamAttempt examAttempt = examAttemptRepository.findById(request.getExamAttemptId())
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        // Check if already submitted for this exam attempt
        if (submissionRepository.existsByExamAttemptId(request.getExamAttemptId())) {
            throw new RuntimeException("Submission already exists for this exam attempt");
        }

        // Check maxAttempts
        int currentAttempts = submissionRepository.countByAssignmentAndUser(assignment, student);
        if (assignment.getMaxAttempts() != null && currentAttempts >= assignment.getMaxAttempts()) {
            throw new RuntimeException("Maximum attempts reached");
        }

        AssignmentSubmission submission = new AssignmentSubmission();
        submission.setAssignment(assignment);
        submission.setUser(student);
        submission.setAttemptNumber(currentAttempts + 1);
        submission.setExamAttemptId(request.getExamAttemptId());
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setScore(examAttempt.getBandScore() != null ? examAttempt.getBandScore() : examAttempt.getRawScore());
        submission.setStatus("GRADED"); // Auto-graded from exam
        submission.setGradedAt(LocalDateTime.now());

        submission = submissionRepository.save(submission);
        return toSubmissionResponse(submission);
    }

    /**
     * Grade submission by ID
     */
    @Transactional
    public AssignmentSubmissionResponse gradeSubmissionById(Long submissionId, GradeRequest request, User teacher) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        Assignment assignment = submission.getAssignment();

        // Validate score
        if (assignment.getMaxScore() != null && request.getScore() > assignment.getMaxScore()) {
            throw new RuntimeException("Score exceeds maximum score");
        }

        submission.setScore(request.getScore());
        submission.setFeedback(request.getFeedback());
        submission.setStatus("GRADED");
        submission.setGradedBy(teacher);
        submission.setGradedAt(LocalDateTime.now());

        submission = submissionRepository.save(submission);
        return toSubmissionResponse(submission);
    }

    /**
     * Get submission by ID
     */
    public AssignmentSubmissionResponse getSubmissionById(Long submissionId) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        return toSubmissionResponse(submission);
    }

    private AssignmentSubmissionResponse toSubmissionResponse(AssignmentSubmission submission) {
        AssignmentSubmissionResponse response = new AssignmentSubmissionResponse();
        response.setId(submission.getId());
        response.setAssignmentId(submission.getAssignment().getId());
        response.setStudentId(submission.getUser().getId());
        response.setStudentName(submission.getUser().getFullName());
        response.setAttemptNumber(submission.getAttemptNumber());
        response.setSubmissionText(submission.getSubmissionText());
        response.setAttachmentUrl(submission.getAttachmentUrl());
        response.setExamAttemptId(submission.getExamAttemptId());
        response.setSubmittedAt(submission.getSubmittedAt());
        response.setStatus(submission.getStatus());
        response.setScore(submission.getScore());
        response.setFeedback(submission.getFeedback());
        response.setGradedAt(submission.getGradedAt());
        if (submission.getGradedBy() != null) {
            response.setGradedBy(submission.getGradedBy().getFullName());
        }
        return response;
    }
}
