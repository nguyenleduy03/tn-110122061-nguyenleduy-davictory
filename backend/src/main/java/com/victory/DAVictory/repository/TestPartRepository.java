package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestPart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestPartRepository extends JpaRepository<TestPart, Long> {

    List<TestPart> findByTestSessionId(Long testSessionId);

    List<TestPart> findByTestSessionIdOrderByOrderIndexAsc(Long testSessionId);

    Optional<TestPart> findByTestSessionIdAndPartId(Long testSessionId, Long partId);

    List<TestPart> findByTestSessionIdAndIsIncluded(Long testSessionId, Boolean isIncluded);

    /**
     * Tìm tất cả TestPart từ các đề thi PUBLISHED dùng cho một Part cụ thể.
     * Dùng để trộn đề: lấy ngẫu nhiên 1 TestPart hoàn chỉnh
     * (bao gồm toàn bộ question groups + questions).
     */
    @Query("SELECT tp FROM TestPart tp " +
           "JOIN tp.testSession ts " +
           "JOIN ts.test t " +
           "WHERE tp.part.id = :partId " +
           "AND t.status = com.victory.DAVictory.enums.TestStatus.PUBLISHED " +
           "AND tp.isIncluded = true")
    List<TestPart> findPublishedTestPartsByPartId(@Param("partId") Long partId);
}
