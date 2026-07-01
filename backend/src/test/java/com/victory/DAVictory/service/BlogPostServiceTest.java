package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.BlogPost;
import com.victory.DAVictory.repository.BlogPostRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogPostServiceTest {

    @Mock
    private BlogPostRepository blogPostRepository;

    @InjectMocks
    private BlogPostService blogPostService;

    @Test
    void getPost_returnsNull_whenNotFound() {
        when(blogPostRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertNull(blogPostService.getPost(999L));
    }

    @Test
    void getPost_returnsPost_whenFound() {
        BlogPost post = new BlogPost();
        post.setId(1L);
        post.setTitle("Test Post");
        post.setContent("Content");
        post.setStatus("published");
        post.setSource("manual");
        when(blogPostRepository.findById(1L)).thenReturn(Optional.of(post));

        var result = blogPostService.getPost(1L);
        assertNotNull(result);
        assert(result.getTitle().equals("Test Post"));
    }
}
