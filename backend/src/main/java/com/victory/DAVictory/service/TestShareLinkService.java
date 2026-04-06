package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.TestShareLink;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.repository.TestRepository;
import com.victory.DAVictory.repository.TestShareLinkRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TestShareLinkService {

    private final TestRepository testRepository;
    private final TestShareLinkRepository testShareLinkRepository;
    private final UserRepository userRepository;

    @Transactional
    public Map<String, Object> generateShareLink(Long testId,
                                                 SkillType skillType,
                                                 boolean refresh,
                                                 String currentUsername,
                                                 boolean isAdminOrManager,
                                                 String baseOrigin) {
        if (testId == null || skillType == null) {
            throw new RuntimeException("Thiếu testId hoặc skillType");
        }

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        if (!isAdminOrManager) {
            Long creatorId = test.getCreatedBy() != null ? test.getCreatedBy().getId() : null;
            if (creatorId == null || !creatorId.equals(currentUser.getId())) {
                throw new RuntimeException("Bạn không có quyền tạo link chia sẻ cho đề này");
            }
        }

        TestShareLink active = testShareLinkRepository
                .findFirstByTestIdAndSkillTypeAndIsActiveTrueOrderByCreatedAtDesc(testId, skillType)
                .orElse(null);

        if (!refresh && active != null) {
            return toResponse(active, baseOrigin);
        }

        testShareLinkRepository.deactivateActiveLinks(testId, skillType, LocalDateTime.now());

        TestShareLink next = new TestShareLink();
        next.setTest(test);
        next.setSkillType(skillType);
        next.setToken(UUID.randomUUID().toString());
        next.setIsActive(true);
        next.setCreatedBy(currentUser);

        next = testShareLinkRepository.save(next);
        return toResponse(next, baseOrigin);
    }

    @Transactional(readOnly = true)
    public boolean validateShareLink(Long testId, SkillType skillType, String token) {
        if (testId == null || skillType == null || token == null || token.isBlank()) {
            return false;
        }

        Test test = testRepository.findById(testId).orElse(null);
        if (test == null || (test.getStatus() != TestStatus.PUBLISHED && test.getStatus() != TestStatus.TEST_EXAM)) {
            return false;
        }

        return testShareLinkRepository
                .findFirstByTestIdAndSkillTypeAndTokenAndIsActiveTrue(testId, skillType, token)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getActiveShareLink(Long testId,
                                                  SkillType skillType,
                                                  String currentUsername,
                                                  boolean isAdminOrManager,
                                                  String baseOrigin) {
        if (testId == null || skillType == null) {
            throw new RuntimeException("Thiếu testId hoặc skillType");
        }

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));

        if (test.getStatus() != TestStatus.PUBLISHED && test.getStatus() != TestStatus.TEST_EXAM) {
            throw new RuntimeException("Chỉ đề ở trạng thái Đã phát hành hoặc Test Exam mới được tạo link chia sẻ công khai");
        }

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        if (!isAdminOrManager) {
            Long creatorId = test.getCreatedBy() != null ? test.getCreatedBy().getId() : null;
            if (creatorId == null || !creatorId.equals(currentUser.getId())) {
                throw new RuntimeException("Bạn không có quyền xem link chia sẻ của đề này");
            }
        }

        TestShareLink active = testShareLinkRepository
                .findFirstByTestIdAndSkillTypeAndIsActiveTrueOrderByCreatedAtDesc(testId, skillType)
                .orElse(null);

        if (active == null) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("exists", false);
            res.put("testId", testId);
            res.put("skillType", skillType.name());
            return res;
        }

        Map<String, Object> res = toResponse(active, baseOrigin);
        res.put("exists", true);
        return res;
    }

    @Transactional
    public boolean deactivateShareLink(Long testId,
                                       SkillType skillType,
                                       String currentUsername,
                                       boolean isAdminOrManager) {
        if (testId == null || skillType == null) {
            throw new RuntimeException("Thiếu testId hoặc skillType");
        }

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        if (!isAdminOrManager) {
            Long creatorId = test.getCreatedBy() != null ? test.getCreatedBy().getId() : null;
            if (creatorId == null || !creatorId.equals(currentUser.getId())) {
                throw new RuntimeException("Bạn không có quyền xóa link chia sẻ của đề này");
            }
        }

        int updated = testShareLinkRepository.deactivateCurrentActiveLink(testId, skillType, LocalDateTime.now());
        return updated > 0;
    }

    private Map<String, Object> toResponse(TestShareLink link, String baseOrigin) {
        String skillPath = switch (link.getSkillType()) {
            case LISTENING -> "listening";
            case READING -> "reading";
            case WRITING -> "writing";
            case SPEAKING -> "speaking";
        };

        String origin = (baseOrigin == null || baseOrigin.isBlank()) ? "" : baseOrigin;
        String shareUrl = String.format("%s/test/%s/%d?guest=1&share=%s",
                origin,
                skillPath,
                link.getTest().getId(),
                link.getToken());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", link.getId());
        res.put("testId", link.getTest().getId());
        res.put("skillType", link.getSkillType().name());
        res.put("token", link.getToken());
        res.put("shareUrl", shareUrl);
        res.put("createdAt", link.getCreatedAt());
        return res;
    }
}
