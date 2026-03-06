package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.WritingFeedbackTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WritingFeedbackTemplateRepository extends JpaRepository<WritingFeedbackTemplate, Long> {

    // Template của giảng viên + template được chia sẻ
    List<WritingFeedbackTemplate> findByWritingTaskIdAndIsActiveTrueAndIsSharedTrue(Long writingTaskId);

    List<WritingFeedbackTemplate> findByCreatedByIdAndIsActiveTrue(Long createdById);

    List<WritingFeedbackTemplate> findByWritingTaskIdAndCreatedByIdAndIsActiveTrue(
            Long writingTaskId, Long createdById);

    List<WritingFeedbackTemplate> findByIssueTypeAndIsActiveTrueAndIsSharedTrue(String issueType);
}
