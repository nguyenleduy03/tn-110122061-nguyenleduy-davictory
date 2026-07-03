package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestRepository extends JpaRepository<Test, Long>, JpaSpecificationExecutor<Test> {

    List<Test> findByStatus(TestStatus status);

    List<Test> findByStatusNot(TestStatus status);

    @Query("SELECT COUNT(t) FROM Test t WHERE t.status <> 'DELETED'")
    long countActive();

    List<Test> findByTestType(TestType testType);

    List<Test> findByTestTypeAndStatus(TestType testType, TestStatus status);

    List<Test> findByCreatedById(Long userId);

    List<Test> findByIsFullTest(Boolean isFullTest);

    @Query("SELECT t FROM Test t WHERE t.title LIKE %:keyword%")
    List<Test> searchByTitle(@Param("keyword") String keyword);

    @Query("SELECT t FROM Test t WHERE t.status = 'PUBLISHED' ORDER BY t.attemptCount DESC")
    List<Test> findTopPublishedByAttempts();

    @Query("SELECT t FROM Test t WHERE t.status = 'PUBLISHED' AND t.testType = :testType ORDER BY t.publishedAt DESC")
    List<Test> findLatestPublishedByTestType(@Param("testType") TestType testType);
}
