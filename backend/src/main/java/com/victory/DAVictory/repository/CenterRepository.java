package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Center;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CenterRepository extends JpaRepository<Center, Long> {

    Optional<Center> findByCode(String code);

    boolean existsByCode(String code);

    List<Center> findByIsActiveTrueOrderByNameAsc();

    List<Center> findByCityAndIsActiveTrue(String city);

    List<Center> findByManagerIdAndIsActiveTrue(Long managerId);
}
