package com.victory.DAVictory.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class InternalQueryService {

    private final DataSource dataSource;

    public InternalQueryService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    private static final Set<String> ALL_TABLES = Set.of(
            "users", "tests", "classes", "class_students", "class_teachers",
            "exam_attempts", "attempt_answers", "student_writing_submissions", "writing_scores",
            "speaking_sessions", "speaking_results", "speaking_scores", "speaking_feedback",
            "blog_posts", "questions", "question_groups", "question_options", "answers",
            "exams", "roles", "user_roles", "tags", "student_profiles",
            "student_skill_scores", "writing_prompts", "writing_sample_answers",
            "assignments", "assignment_submissions",
            "media_files", "topic_categories", "user_activity_logs",
            "passage_contents", "question_types", "difficulty_levels",
            "speaking_cue_cards", "speaking_topics", "speaking_frames", "speaking_combos",
            "centers", "test_parts", "test_question_groups", "test_sessions", "test_versions",
            "parts", "sessions", "question_explanations", "question_hints",
            "question_statistics", "question_tag_map", "question_tags",
            "test_settings", "test_share_links", "test_statistics",
            "guest_exam_attempts", "system_configs", "writing_submission_grade_history",
            "exam_attempt_grade_history", "speaking_recordings", "speaking_turns",
            "full_test_progress", "ai_grading_results", "ai_grading_audit_logs",
            "agent_sessions", "agent_tasks", "agent_actions", "agent_logs", "agent_configs",
            "audio_transcripts", "matching_pairs", "attempt_question_times", "attempt_sections"
    );

    public void checkPermission(String table, String role) {
        String roleUpper = (role != null) ? role.toUpperCase() : "STUDENT";

        Set<String> allowed = switch (roleUpper) {
            case "ADMIN", "MANAGER" -> ALL_TABLES;
            case "TEACHER" -> ALL_TABLES.stream()
                    .filter(t -> !List.of("agent_sessions", "agent_tasks", "agent_actions", "agent_logs", "agent_configs",
                            "system_configs", "user_activity_logs").contains(t))
                    .collect(Collectors.toSet());
            default -> Set.of(
                    "tests", "exam_attempts", "student_writing_submissions", "writing_scores",
                    "speaking_sessions", "speaking_results", "speaking_scores",
                    "blog_posts", "classes", "student_profiles", "student_skill_scores",
                    "assignments", "assignment_submissions", "questions", "question_groups",
                    "question_options", "answers", "speaking_cue_cards", "speaking_topics",
                    "speaking_frames", "speaking_combos", "passage_contents", "parts", "sessions",
                    "speaking_feedback", "speaking_recordings", "speaking_turns",
                    "writing_prompts", "writing_sample_answers",
                    "attempt_answers", "class_students", "class_teachers", "users", "exams"
            );
        };

        if (!allowed.contains(table)) {
            throw new SecurityException("Role '" + roleUpper + "' không có quyền truy cập bảng '" + table + "'");
        }
    }

    public List<Map<String, Object>> executeQuery(String table, String sql,
                                                   Map<String, Object> params,
                                                   Integer limit, String role) {
        checkPermission(table, role);

        if (!table.matches("[a-zA-Z_][a-zA-Z0-9_]*")) {
            throw new SecurityException("Invalid table name");
        }

        int limitVal = (limit != null && limit > 0) ? Math.min(limit, 200) : 100;
        String finalSql = sql.trim();
        if (!finalSql.toUpperCase().contains("LIMIT")) {
            finalSql += " LIMIT " + limitVal;
        }

        log.info("Internal execute: {} | role={}", finalSql, roleUpper(role));

        String jdbcSql = finalSql;
        List<String> paramKeys = new ArrayList<>();

        while (true) {
            int colon = jdbcSql.indexOf(":");
            if (colon < 0) break;
            if (colon > 0 && jdbcSql.charAt(colon - 1) == ':') {
                jdbcSql = jdbcSql.substring(0, colon) + jdbcSql.substring(colon + 1);
                continue;
            }
            int end = colon + 1;
            while (end < jdbcSql.length() && (Character.isLetterOrDigit(jdbcSql.charAt(end)) || jdbcSql.charAt(end) == '_')) {
                end++;
            }
            if (end > colon + 1) {
                String key = jdbcSql.substring(colon + 1, end);
                paramKeys.add(key);
                jdbcSql = jdbcSql.substring(0, colon) + "?" + jdbcSql.substring(end);
            } else {
                jdbcSql = jdbcSql.substring(0, colon) + jdbcSql.substring(colon + 1);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(jdbcSql)) {

            for (int i = 0; i < paramKeys.size(); i++) {
                String key = paramKeys.get(i);
                Object value = (params != null) ? params.get(key) : null;
                if (value instanceof Number n) {
                    stmt.setObject(i + 1, n);
                } else {
                    stmt.setObject(i + 1, value);
                }
            }

            try (ResultSet rs = stmt.executeQuery()) {
                ResultSetMetaData meta = rs.getMetaData();
                int colCount = meta.getColumnCount();

                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= colCount; i++) {
                        row.put(meta.getColumnLabel(i), rs.getObject(i));
                    }
                    rows.add(row);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Query execution failed: " + e.getMessage(), e);
        }

        return rows;
    }

    private String roleUpper(String role) {
        return (role != null) ? role.toUpperCase() : "STUDENT";
    }
}
