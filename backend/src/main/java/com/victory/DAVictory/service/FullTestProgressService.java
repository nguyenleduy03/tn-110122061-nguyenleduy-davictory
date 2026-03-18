package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.FullTestProgressResponse;
import com.victory.DAVictory.dto.FullTestProgressSaveRequest;
import com.victory.DAVictory.entity.FullTestProgress;
import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.FullTestProgressRepository;
import com.victory.DAVictory.repository.TestRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FullTestProgressService {

    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";

    private final FullTestProgressRepository fullTestProgressRepository;
    private final UserRepository userRepository;
    private final TestRepository testRepository;

    @Transactional
    public FullTestProgressResponse saveProgress(String username, Long testId, FullTestProgressSaveRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID=" + testId));

        FullTestProgress progress = fullTestProgressRepository
                .findByUserIdAndTestId(user.getId(), test.getId())
                .orElseGet(FullTestProgress::new);

        progress.setUser(user);
        progress.setTest(test);
        progress.setStatus((request.getStatus() == null || request.getStatus().isBlank())
                ? STATUS_IN_PROGRESS
                : request.getStatus());
        progress.setMode(request.getMode());
        progress.setCurrentSection(request.getCurrentSection());
        progress.setCurrentSkill(request.getCurrentSkill());
        progress.setCurrentPartIndex(request.getCurrentPartIndex());
        progress.setProgressPercent(request.getProgressPercent());
        progress.setRoutePath(request.getRoutePath());
        progress.setQueryString(request.getQueryString());
        progress.setSessionStateJson(request.getSessionStateJson());
        progress.setSnapshotJson(request.getSnapshotJson());

        return toResponse(fullTestProgressRepository.save(progress));
    }

    @Transactional(readOnly = true)
    public FullTestProgressResponse getProgress(String username, Long testId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        return fullTestProgressRepository.findByUserIdAndTestId(user.getId(), testId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<FullTestProgressResponse> getMyInProgress(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        return fullTestProgressRepository.findByUserIdAndStatusOrderByUpdatedAtDesc(
                user.getId(), STATUS_IN_PROGRESS)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void clearProgress(String username, Long testId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        fullTestProgressRepository.findByUserIdAndTestId(user.getId(), testId)
                .ifPresent(fullTestProgressRepository::delete);
    }

    private FullTestProgressResponse toResponse(FullTestProgress p) {
        FullTestProgressResponse r = new FullTestProgressResponse();
        r.setId(p.getId());
        r.setUserId(p.getUser() != null ? p.getUser().getId() : null);
        r.setUsername(p.getUser() != null ? p.getUser().getUsername() : null);
        r.setTestId(p.getTest() != null ? p.getTest().getId() : null);

        r.setStatus(p.getStatus());
        r.setMode(p.getMode());
        r.setCurrentSection(p.getCurrentSection());
        r.setCurrentSkill(p.getCurrentSkill());
        r.setCurrentPartIndex(p.getCurrentPartIndex());
        r.setProgressPercent(p.getProgressPercent());
        r.setRoutePath(p.getRoutePath());
        r.setQueryString(p.getQueryString());
        r.setSessionStateJson(p.getSessionStateJson());
        r.setSnapshotJson(p.getSnapshotJson());

        r.setCreatedAt(p.getCreatedAt());
        r.setUpdatedAt(p.getUpdatedAt());
        return r;
    }
}
