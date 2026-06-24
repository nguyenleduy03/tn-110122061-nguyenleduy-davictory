package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    List<BlogPost> findByDeletedAtIsNullOrderByCreatedAtDesc();
    List<BlogPost> findByDeletedAtIsNullAndStatusOrderByCreatedAtDesc(String status);
    List<BlogPost> findByDeletedAtIsNullAndSourceOrderByCreatedAtDesc(String source);
}
