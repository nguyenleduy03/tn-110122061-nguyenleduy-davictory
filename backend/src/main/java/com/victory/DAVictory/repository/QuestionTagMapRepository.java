package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionTagMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionTagMapRepository extends JpaRepository<QuestionTagMap, Long> {

    List<QuestionTagMap> findByQuestionId(Long questionId);

    List<QuestionTagMap> findByTagId(Long tagId);

    Optional<QuestionTagMap> findByQuestionIdAndTagId(Long questionId, Long tagId);

    boolean existsByQuestionIdAndTagId(Long questionId, Long tagId);

    void deleteByQuestionIdAndTagId(Long questionId, Long tagId);

    void deleteByQuestionId(Long questionId);

    // Lấy tất cả câu hỏi có gắn tag cụ thể
    @Query("SELECT qtm.question.id FROM QuestionTagMap qtm WHERE qtm.tag.id = :tagId")
    List<Long> findQuestionIdsByTagId(@Param("tagId") Long tagId);

    // Lấy tất cả câu hỏi có gắn tất cả các tag trong danh sách (AND search)
    @Query("SELECT qtm.question.id FROM QuestionTagMap qtm WHERE qtm.tag.id IN :tagIds " +
           "GROUP BY qtm.question.id HAVING COUNT(DISTINCT qtm.tag.id) = :tagCount")
    List<Long> findQuestionIdsByAllTagIds(@Param("tagIds") List<Long> tagIds,
                                          @Param("tagCount") long tagCount);
}
