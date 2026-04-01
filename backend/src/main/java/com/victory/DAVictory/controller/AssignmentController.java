package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.service.AssignmentService;
import com.victory.DAVictory.service.AssignmentServiceExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@CrossOrigin(origins = "*")
public class AssignmentController {

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AssignmentServiceExtension assignmentServiceExtension;

    @Autowired
    private com.victory.DAVictory.repository.UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<AssignmentResponse> createAssignment(
            @RequestBody AssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        System.out.println("=== CREATE ASSIGNMENT ===");
        System.out.println("User: " + userDetails.getUsername());
        System.out.println("Authorities: " + userDetails.getAuthorities());
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentResponse response = assignmentService.createAssignment(request, currentUser);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<AssignmentResponse> updateAssignment(
            @PathVariable Long id,
            @RequestBody AssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentResponse response = assignmentService.updateAssignment(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        assignmentService.deleteAssignment(id, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> getAssignment(@PathVariable Long id) {
        AssignmentResponse response = assignmentService.getAssignmentById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<List<AssignmentResponse>> getAssignmentsByClass(@PathVariable Long classId) {
        List<AssignmentResponse> responses = assignmentService.getAssignmentsByClass(classId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/my-assignments")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<List<AssignmentResponse>> getMyAssignments(
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<AssignmentResponse> responses = assignmentService.getMyAssignments(currentUser);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/templates")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<AssignmentResponse>> getMyTemplates(
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<AssignmentResponse> responses = assignmentService.getMyTemplates(currentUser);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/from-test/{testId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<AssignmentResponse> createTemplateFromTest(
            @PathVariable Long testId,
            @RequestBody AssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentResponse response = assignmentService.createTemplateFromTest(testId, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/student/class/{classId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AssignmentResponse>> getAssignmentsForStudent(
            @PathVariable Long classId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<AssignmentResponse> responses = assignmentService.getAssignmentsForStudent(classId, currentUser);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/submit")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AssignmentSubmissionResponse> submitAssignment(
            @RequestBody AssignmentSubmissionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentSubmissionResponse response = assignmentService.submitAssignment(request, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getSubmissions(@PathVariable Long assignmentId) {
        List<AssignmentSubmissionResponse> responses = assignmentService.getSubmissionsByAssignment(assignmentId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{assignmentId}/my-submission")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AssignmentSubmissionResponse> getMySubmission(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentSubmissionResponse response = assignmentService.getMySubmission(assignmentId, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<AssignmentSubmissionResponse> gradeSubmission(
            @RequestBody AssignmentGradeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentSubmissionResponse response = assignmentService.gradeSubmission(request, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/class/{classId}/pending")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getPendingSubmissions(@PathVariable Long classId) {
        List<AssignmentSubmissionResponse> responses = assignmentService.getPendingSubmissions(classId);
        return ResponseEntity.ok(responses);
    }

    // NEW ENDPOINTS

    @GetMapping("/{assignmentId}/my-submissions")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getMySubmissions(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<AssignmentSubmissionResponse> responses = assignmentServiceExtension.getMySubmissions(assignmentId, currentUser);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{assignmentId}/submit-manual")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AssignmentSubmissionResponse> submitManual(
            @PathVariable Long assignmentId,
            @RequestBody ManualSubmissionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentSubmissionResponse response = assignmentServiceExtension.submitManual(assignmentId, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assignmentId}/submit-test")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AssignmentSubmissionResponse> submitTest(
            @PathVariable Long assignmentId,
            @RequestBody TestSubmissionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentSubmissionResponse response = assignmentServiceExtension.submitTest(assignmentId, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<AssignmentSubmissionResponse> gradeSubmissionById(
            @PathVariable Long submissionId,
            @RequestBody GradeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AssignmentSubmissionResponse response = assignmentServiceExtension.gradeSubmissionById(submissionId, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions/{submissionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<AssignmentSubmissionResponse> getSubmissionById(@PathVariable Long submissionId) {
        AssignmentSubmissionResponse response = assignmentServiceExtension.getSubmissionById(submissionId);
        return ResponseEntity.ok(response);
    }
}
