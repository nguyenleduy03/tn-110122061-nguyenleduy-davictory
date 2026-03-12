package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.entity.QuestionGroup;
import com.victory.DAVictory.entity.StudentWritingSubmission;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.QuestionGroupRepository;
import com.victory.DAVictory.repository.StudentWritingSubmissionRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WritingService {

    private final StudentWritingSubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final QuestionGroupRepository questionGroupRepository;

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

    // ─── Mapper ─────────────────────────────────────────────────────
    private WritingSubmissionResponse toResponse(StudentWritingSubmission s) {
        WritingSubmissionResponse r = new WritingSubmissionResponse();
        r.setId(s.getId());
        r.setUserId(s.getUser().getId());
        r.setUsername(s.getUser().getUsername());

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
}
