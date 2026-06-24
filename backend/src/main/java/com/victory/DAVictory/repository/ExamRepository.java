package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Exam;
import com.victory.DAVictory.entity.Exam;
import com.victory.DAVictory.enums.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {

    List<Exam> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);

    List<Exam> findByStatusOrderByScheduledStartTimeAsc(ExamStatus status);

    @Query("SELECT e FROM Exam e WHERE e.clazz.id = :classId AND e.status IN :statuses")
    List<Exam> findByClazzIdAndStatusIn(@Param("classId") Long classId, @Param("statuses") List<ExamStatus> statuses);

    @Query("SELECT e FROM Exam e WHERE e.status = :status AND e.scheduledStartTime < :time")
    List<Exam> findByStatusAndScheduledStartTimeBefore(@Param("status") ExamStatus status, @Param("time") LocalDateTime time);

    @Query("SELECT e FROM Exam e WHERE e.status = :status AND e.scheduledEndTime < :time")
    List<Exam> findByStatusAndScheduledEndTimeBefore(@Param("status") ExamStatus status, @Param("time") LocalDateTime time);
}
