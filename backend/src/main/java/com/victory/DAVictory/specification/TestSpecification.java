package com.victory.DAVictory.specification;

import com.victory.DAVictory.dto.TestFilterRequest;
import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.TestSession;
import com.victory.DAVictory.entity.Session;
import com.victory.DAVictory.enums.SkillType;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Specification để build dynamic query cho filter Test
 */
public class TestSpecification {

    public static Specification<Test> filterTests(TestFilterRequest filter) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Search theo title (case-insensitive)
            if (filter.getSearch() != null && !filter.getSearch().trim().isEmpty()) {
                String searchPattern = "%" + filter.getSearch().trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("title")), 
                    searchPattern
                ));
            }

            // 2. Filter theo testType (ACADEMIC / GENERAL)
            if (filter.getTestType() != null) {
                predicates.add(criteriaBuilder.equal(root.get("testType"), filter.getTestType()));
            }

            // 3. Filter theo status
            if (filter.getStatus() != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), filter.getStatus()));
            }

            // 4. Filter theo isFullTest
            if (filter.getIsFullTest() != null) {
                predicates.add(criteriaBuilder.equal(root.get("isFullTest"), filter.getIsFullTest()));
            }

            // 5. Filter theo skillType (cần JOIN với TestSession và Session)
            if (filter.getSkillType() != null) {
                // Subquery để check xem test có session với skillType này không
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<TestSession> testSessionRoot = subquery.from(TestSession.class);
                Join<TestSession, Session> sessionJoin = testSessionRoot.join("session");
                
                subquery.select(testSessionRoot.get("test").get("id"))
                    .where(criteriaBuilder.and(
                        criteriaBuilder.equal(testSessionRoot.get("test").get("id"), root.get("id")),
                        criteriaBuilder.equal(sessionJoin.get("skillType"), filter.getSkillType()),
                        criteriaBuilder.isTrue(testSessionRoot.get("isIncluded"))
                    ));
                
                predicates.add(criteriaBuilder.exists(subquery));
            }

            // 6. Filter theo targetBand
            if (filter.getTargetBand() != null && !filter.getTargetBand().trim().isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("targetBand"), filter.getTargetBand().trim()));
            }

            // 7. Filter theo duration range
            if (filter.getMinDuration() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                    root.get("durationMinutes"), 
                    filter.getMinDuration()
                ));
            }
            if (filter.getMaxDuration() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                    root.get("durationMinutes"), 
                    filter.getMaxDuration()
                ));
            }

            // 8. Filter theo createdBy
            if (filter.getCreatedById() != null) {
                predicates.add(criteriaBuilder.equal(
                    root.get("createdBy").get("id"), 
                    filter.getCreatedById()
                ));
            }

            // 9. Filter theo date range
            if (filter.getCreatedFrom() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                    root.get("createdAt"), 
                    filter.getCreatedFrom()
                ));
            }
            if (filter.getCreatedTo() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                    root.get("createdAt"), 
                    filter.getCreatedTo()
                ));
            }

            // Combine all predicates with AND
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
