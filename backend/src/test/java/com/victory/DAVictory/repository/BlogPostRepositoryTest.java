package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.BlogPost;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class BlogPostRepositoryTest {

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Test
    void testRepositoryIsWired() {
        assertNotNull(blogPostRepository);
    }

    @Test
    void findByDeletedAtIsNullOrderByCreatedAtDesc_returnsList() {
        List<BlogPost> posts = blogPostRepository.findByDeletedAtIsNullOrderByCreatedAtDesc();
        assertNotNull(posts);
    }
}
