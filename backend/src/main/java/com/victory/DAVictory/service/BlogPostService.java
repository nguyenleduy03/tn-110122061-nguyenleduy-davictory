package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.BlogPostListResponse;
import com.victory.DAVictory.dto.BlogPostResponse;
import com.victory.DAVictory.entity.BlogPost;
import com.victory.DAVictory.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogPostService {

    private static final Logger log = LoggerFactory.getLogger(BlogPostService.class);
    private static final Pattern IMG_SRC_PATTERN = Pattern.compile("src=\"/uploads/articles/([^\"]+)\"");

    private final BlogPostRepository blogPostRepository;

    @Value("${app.agent.uploads.dir:../ai-agent-python/uploads}")
    private String uploadsDir;

    public List<BlogPostListResponse> listPosts(String status) {
        List<BlogPost> posts;
        if (status != null && !status.isEmpty()) {
            posts = blogPostRepository.findByDeletedAtIsNullAndStatusOrderByCreatedAtDesc(status);
        } else {
            posts = blogPostRepository.findByDeletedAtIsNullOrderByCreatedAtDesc();
        }
        return posts.stream().map(this::toListResponse).collect(Collectors.toList());
    }

    public BlogPostResponse getPost(Long id) {
        BlogPost post = blogPostRepository.findById(id).orElse(null);
        if (post == null || post.getDeletedAt() != null) return null;
        return toResponse(post);
    }

    public void deletePost(Long id) {
        blogPostRepository.findById(id).ifPresent(post -> {
            deleteImages(post);
            post.setDeletedAt(LocalDateTime.now());
            blogPostRepository.save(post);
        });
    }

    private void deleteImages(BlogPost post) {
        List<String> filenames = new java.util.ArrayList<>();

        // Extract from thumbnail
        if (post.getThumbnail() != null && post.getThumbnail().contains("/uploads/articles/")) {
            String fn = post.getThumbnail().substring(post.getThumbnail().lastIndexOf('/') + 1);
            if (!fn.isEmpty()) filenames.add(fn);
        }

        // Extract from content img tags
        if (post.getContent() != null) {
            Matcher m = IMG_SRC_PATTERN.matcher(post.getContent());
            while (m.find()) {
                filenames.add(m.group(1));
            }
        }

        Path base = Paths.get(uploadsDir, "articles");
        for (String fn : filenames.stream().distinct().collect(Collectors.toList())) {
            try {
                Path file = base.resolve(fn);
                if (Files.exists(file)) {
                    Files.delete(file);
                    log.info("Deleted image file: {}", file);
                }
            } catch (Exception e) {
                log.warn("Failed to delete image {}: {}", fn, e.getMessage());
            }
        }
    }

    public BlogPostResponse publishPost(Long id) {
        BlogPost post = blogPostRepository.findById(id).orElse(null);
        if (post == null || post.getDeletedAt() != null) return null;
        post.setStatus("published");
        post.setPublishedAt(LocalDateTime.now());
        blogPostRepository.save(post);
        return toResponse(post);
    }

    private BlogPostListResponse toListResponse(BlogPost post) {
        BlogPostListResponse r = new BlogPostListResponse();
        r.setId(post.getId());
        r.setTitle(post.getTitle());
        r.setStatus(post.getStatus());
        r.setPreview(post.getContent() != null ? post.getContent().substring(0, Math.min(150, post.getContent().length())) : "");
        r.setThumbnail(post.getThumbnail());
        r.setTags(post.getTags() != null ? Arrays.asList(post.getTags().split(",")) : List.of());
        r.setReadingTime(post.getReadingTime());
        r.setCreatedAt(post.getCreatedAt());
        r.setCategoryId(post.getCategoryId());
        return r;
    }

    private BlogPostResponse toResponse(BlogPost post) {
        BlogPostResponse r = new BlogPostResponse();
        r.setId(post.getId());
        r.setTitle(post.getTitle());
        r.setSlug(post.getSlug());
        r.setContent(post.getContent());
        r.setExcerpt(post.getExcerpt());
        r.setThumbnail(post.getThumbnail());
        r.setTags(post.getTags() != null ? Arrays.asList(post.getTags().split(",")) : List.of());
        r.setMetaDescription(post.getMetaDescription());
        r.setStatus(post.getStatus());
        r.setReadingTime(post.getReadingTime());
        r.setSource(post.getSource());
        r.setCreatedBy(post.getCreatedBy() != null ? post.getCreatedBy().getFullName() : null);
        r.setCreatedAt(post.getCreatedAt());
        r.setUpdatedAt(post.getUpdatedAt());
        r.setPublishedAt(post.getPublishedAt());
        r.setCategoryId(post.getCategoryId());
        return r;
    }
}
