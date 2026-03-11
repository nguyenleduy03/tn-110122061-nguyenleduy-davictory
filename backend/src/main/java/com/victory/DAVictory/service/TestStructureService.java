package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.DifficultyLevel;
import com.victory.DAVictory.entity.Part;
import com.victory.DAVictory.entity.Session;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.repository.DifficultyLevelRepository;
import com.victory.DAVictory.repository.PartRepository;
import com.victory.DAVictory.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TestStructureService {

    private final SessionRepository sessionRepository;
    private final PartRepository partRepository;
    private final DifficultyLevelRepository difficultyLevelRepository;

    // ===== DIFFICULTY LEVELS =====
    @Transactional
    public void initializeDifficultyLevels() {
        Object[][] levels = {
            {1, "Beginner",          "4.0-4.5", "Dành cho người mới bắt đầu học IELTS",                "#4CAF50"},
            {2, "Elementary",        "4.5-5.0", "Nắm được cơ bản, cần cải thiện nhiều",                "#8BC34A"},
            {3, "Intermediate",      "5.0-6.0", "Trình độ trung bình, phù hợp mục tiêu band 5-6",      "#FFC107"},
            {4, "Upper-Intermediate","6.0-7.0", "Khá vững, hướng đến band 6.5-7.0",                   "#FF9800"},
            {5, "Advanced",          "7.0-9.0", "Trình độ cao, mục tiêu band 7.0 trở lên",             "#F44336"}
        };

        for (Object[] row : levels) {
            int lvl = (int) row[0];
            if (!difficultyLevelRepository.existsByLevel(lvl)) {
                DifficultyLevel dl = new DifficultyLevel();
                dl.setLevel(lvl);
                dl.setName((String) row[1]);
                dl.setBandRange((String) row[2]);
                dl.setDescription((String) row[3]);
                dl.setColorCode((String) row[4]);
                difficultyLevelRepository.save(dl);
            }
        }
    }

    // ===== SESSIONS =====
    @Transactional
    public void initializeSessions() {
        // Cấu trúc chuẩn IELTS Academic
        Object[][] academicSessions = {
            // skillType,        name,       duration, questions, maxScore, order, instructions
            {SkillType.LISTENING, "Listening", 30, 40, 9.0, 1,
                "Bạn sẽ nghe 4 đoạn hội thoại/độc thoại và trả lời 40 câu hỏi. Mỗi đoạn chỉ được nghe một lần."},
            {SkillType.READING,   "Reading",   60, 40, 9.0, 2,
                "Đọc 3 đoạn văn học thuật (khoảng 2500-3000 từ tổng) và trả lời 40 câu hỏi."},
            {SkillType.WRITING,   "Writing",   60,  2, 9.0, 3,
                "Task 1: Mô tả biểu đồ/sơ đồ (tối thiểu 150 từ). Task 2: Viết luận (tối thiểu 250 từ)."},
            {SkillType.SPEAKING,  "Speaking",  14,  3, 9.0, 4,
                "Bài thi nói gồm 3 phần, phỏng vấn trực tiếp với giám khảo."}
        };

        for (Object[] row : academicSessions) {
            SkillType skill = (SkillType) row[0];
            if (!sessionRepository.existsBySkillTypeAndTestType(skill, TestType.ACADEMIC)) {
                Session s = new Session();
                s.setSkillType(skill);
                s.setTestType(TestType.ACADEMIC);
                s.setName((String) row[1]);
                s.setDurationMinutes((int) row[2]);
                s.setTotalQuestions((int) row[3]);
                s.setMaxScore((double) row[4]);
                s.setOrderIndex((int) row[5]);
                s.setInstructions((String) row[6]);
                s.setIsActive(true);
                sessionRepository.save(s);
            }
        }

        // Cấu trúc IELTS General Training (Listening & Speaking giống Academic)
        Object[][] generalSessions = {
            {SkillType.LISTENING, "Listening", 30, 40, 9.0, 1,
                "Bạn sẽ nghe 4 đoạn hội thoại/độc thoại và trả lời 40 câu hỏi."},
            {SkillType.READING,   "Reading",   60, 40, 9.0, 2,
                "Đọc các văn bản thực tế (quảng cáo, thông báo, tài liệu công việc) và trả lời 40 câu hỏi."},
            {SkillType.WRITING,   "Writing",   60,  2, 9.0, 3,
                "Task 1: Viết thư (tối thiểu 150 từ). Task 2: Viết luận (tối thiểu 250 từ)."},
            {SkillType.SPEAKING,  "Speaking",  14,  3, 9.0, 4,
                "Bài thi nói gồm 3 phần, phỏng vấn trực tiếp với giám khảo."}
        };

        for (Object[] row : generalSessions) {
            SkillType skill = (SkillType) row[0];
            if (!sessionRepository.existsBySkillTypeAndTestType(skill, TestType.GENERAL)) {
                Session s = new Session();
                s.setSkillType(skill);
                s.setTestType(TestType.GENERAL);
                s.setName((String) row[1]);
                s.setDurationMinutes((int) row[2]);
                s.setTotalQuestions((int) row[3]);
                s.setMaxScore((double) row[4]);
                s.setOrderIndex((int) row[5]);
                s.setInstructions((String) row[6]);
                s.setIsActive(true);
                sessionRepository.save(s);
            }
        }
    }

    // ===== PARTS =====
    @Transactional
    public void initializeParts() {
        // Lấy các session Academic đã tạo
        Optional<Session> listening = sessionRepository.findBySkillTypeAndTestType(SkillType.LISTENING, TestType.ACADEMIC);
        Optional<Session> reading   = sessionRepository.findBySkillTypeAndTestType(SkillType.READING,   TestType.ACADEMIC);
        Optional<Session> writing   = sessionRepository.findBySkillTypeAndTestType(SkillType.WRITING,   TestType.ACADEMIC);
        Optional<Session> speaking  = sessionRepository.findBySkillTypeAndTestType(SkillType.SPEAKING,  TestType.ACADEMIC);

        // Parts của Listening (4 parts, mỗi part 10 câu)
        if (listening.isPresent()) {
            Session ls = listening.get();
            Object[][] listeningParts = {
                {1, "Part 1 – Everyday Conversation", 10, "Multiple Choice, Form Completion",
                    "Hội thoại giữa 2 người trong cuộc sống hàng ngày (đặt phòng, hỏi thông tin...)"},
                {2, "Part 2 – Monologue Everyday",    10, "Multiple Choice, Map/Diagram, Table",
                    "Độc thoại về chủ đề hàng ngày (giới thiệu cơ sở, hướng dẫn sự kiện...)"},
                {3, "Part 3 – Academic Discussion",   10, "Multiple Choice, Matching, Short Answer",
                    "Hội thoại học thuật (thảo luận dự án, trao đổi với giảng viên...)"},
                {4, "Part 4 – Academic Lecture",      10, "Note/Table/Flow Chart Completion, Short Answer",
                    "Bài giảng học thuật về một chủ đề khoa học hoặc lịch sử"}
            };
            createPartsIfNotExist(ls, listeningParts, null);
        }

        // Parts của Reading Academic (3 passages, mỗi passage ~13-14 câu)
        if (reading.isPresent()) {
            Session rs = reading.get();
            Object[][] readingParts = {
                {1, "Passage 1", 13, "Multiple Choice, True/False/NG, Matching Headings",
                    "Đoạn văn học thuật đầu tiên, thường dễ nhất"},
                {2, "Passage 2", 13, "Multiple Choice, Matching Information, Short Answer",
                    "Đoạn văn học thuật thứ hai, độ khó trung bình"},
                {3, "Passage 3", 14, "True/False/NG, Matching Features, Sentence Completion",
                    "Đoạn văn học thuật thứ ba, khó và dài nhất"}
            };
            createPartsIfNotExist(rs, readingParts, null);
        }

        // Parts của Writing Academic
        if (writing.isPresent()) {
            Session ws = writing.get();
            Object[][] writingParts = {
                {1, "Task 1 – Report/Description", 1, "Graph/Chart/Diagram/Map Description",
                    "Mô tả biểu đồ, bảng số liệu, sơ đồ hoặc bản đồ (tối thiểu 150 từ, 20 phút)"},
                {2, "Task 2 – Essay",               1, "Argumentative/Discussion/Problem-Solution Essay",
                    "Viết bài luận bình luận, thảo luận hoặc giải quyết vấn đề (tối thiểu 250 từ, 40 phút)"}
            };
            createPartsIfNotExist(ws, writingParts, null);
        }

        // Parts của Speaking
        if (speaking.isPresent()) {
            Session sp = speaking.get();
            Object[][] speakingParts = {
                {1, "Part 1 – Introduction & Interview", 1, "Short Answer, Personal Questions",
                    "Giám khảo hỏi về bản thân, gia đình, sở thích (4-5 phút)"},
                {2, "Part 2 – Long Turn (Cue Card)",     1, "Extended Monologue",
                    "Nói về chủ đề cho sẵn trong 1-2 phút sau 1 phút chuẩn bị"},
                {3, "Part 3 – Two-way Discussion",       1, "Discussion, Opinion, Analysis",
                    "Thảo luận sâu hơn về chủ đề trong Part 2 với giám khảo (4-5 phút)"}
            };
            createPartsIfNotExist(sp, speakingParts, null);
        }
    }

    private void createPartsIfNotExist(Session session, Object[][] partsData, DifficultyLevel difficulty) {
        for (Object[] row : partsData) {
            int orderIdx = (int) row[0];
            if (!partRepository.existsBySessionIdAndOrderIndex(session.getId(), orderIdx)) {
                Part part = new Part();
                part.setSession(session);
                part.setOrderIndex(orderIdx);
                part.setName((String) row[1]);
                part.setTotalQuestions((int) row[2]);
                part.setQuestionFormat((String) row[3]);
                part.setDescription((String) row[4]);
                part.setDifficultyLevel(difficulty);
                part.setIsActive(true);
                partRepository.save(part);
            }
        }
    }

    // ===== QUERY METHODS =====
    public List<Session> getSessionsByTestType(TestType testType) {
        return sessionRepository.findByTestTypeOrderByOrderIndexAsc(testType);
    }

    public List<Session> getAllSessions() {
        return sessionRepository.findAll();
    }

    public List<Part> getPartsBySessionId(Long sessionId) {
        return partRepository.findBySessionIdOrderByOrderIndexAsc(sessionId);
    }

    public List<DifficultyLevel> getAllDifficultyLevels() {
        return difficultyLevelRepository.findAllByOrderByLevelAsc();
    }
}
