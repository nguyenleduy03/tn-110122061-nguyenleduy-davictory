package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.CreateExamRequest;
import com.victory.DAVictory.dto.ExamResponse;
import com.victory.DAVictory.entity.Class;
import com.victory.DAVictory.entity.Exam;
import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.ExamStatus;
import com.victory.DAVictory.enums.ExamType;
import com.victory.DAVictory.repository.ClassRepository;
import com.victory.DAVictory.repository.ClassStudentRepository;
import com.victory.DAVictory.repository.ExamAttemptRepository;
import com.victory.DAVictory.repository.ExamRepository;
import com.victory.DAVictory.repository.TestRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamService {

    private static final Logger log = LoggerFactory.getLogger(ExamService.class);

    private final ExamRepository examRepository;
    private final TestRepository testRepository;
    private final ClassRepository classRepository;
    private final ClassStudentRepository classStudentRepository;
    private final UserRepository userRepository;
    private final ExamAttemptRepository examAttemptRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Transactional
    public ExamResponse createExam(CreateExamRequest req, String username) {
        User teacher = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Test test = testRepository.findById(req.getTestId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID=" + req.getTestId()));

        Exam exam = new Exam();
        exam.setTitle(req.getTitle());
        exam.setDescription(req.getDescription());
        exam.setExamType(ExamType.valueOf(req.getExamType()));
        exam.setStatus(ExamStatus.SCHEDULED);
        exam.setTest(test);
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setMaxAttempts(req.getMaxAttempts() != null ? req.getMaxAttempts() : 1);
        exam.setAllowReviewAfterSubmit(req.getAllowReviewAfterSubmit() != null ? req.getAllowReviewAfterSubmit() : false);
        exam.setLateEntryMinutes(req.getLateEntryMinutes() != null ? req.getLateEntryMinutes() : 15);
        exam.setCreatedBy(teacher);

        if (req.getExamType().equals("CLASS_EXAM")) {
            if (req.getClassId() == null) {
                throw new RuntimeException("Thiếu lớp cho kỳ thi CLASS_EXAM");
            }
            Class clazz = classRepository.findById(req.getClassId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp ID=" + req.getClassId()));
            exam.setClazz(clazz);
        } else {
            exam.setScheduledStartTime(req.getScheduledStartTime());
            exam.setScheduledEndTime(req.getScheduledEndTime());
            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                exam.setPassword(passwordEncoder.encode(req.getPassword()));
            }
        }

        exam = examRepository.save(exam);
        return toResponse(exam, 0, 0);
    }

    @Transactional
    public ExamResponse updateExam(Long id, CreateExamRequest req, String username) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi ID=" + id));

        if (exam.getStatus() != ExamStatus.SCHEDULED) {
            throw new RuntimeException("Chỉ có thể sửa kỳ thi ở trạng thái SCHEDULED");
        }

        exam.setTitle(req.getTitle());
        exam.setDescription(req.getDescription());
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setMaxAttempts(req.getMaxAttempts());
        exam.setAllowReviewAfterSubmit(req.getAllowReviewAfterSubmit());
        exam.setLateEntryMinutes(req.getLateEntryMinutes());

        if (req.getExamType().equals("CLASS_EXAM")) {
            exam.setScheduledStartTime(null);
            exam.setScheduledEndTime(null);
            exam.setPassword(null);
            if (req.getClassId() != null) {
                Class clazz = classRepository.findById(req.getClassId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp"));
                exam.setClazz(clazz);
            }
        } else {
            exam.setClazz(null);
            exam.setScheduledStartTime(req.getScheduledStartTime());
            exam.setScheduledEndTime(req.getScheduledEndTime());
            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                exam.setPassword(passwordEncoder.encode(req.getPassword()));
            }
        }

        exam = examRepository.save(exam);
        return toResponse(exam, 0, 0);
    }

    @Transactional
    public void deleteExam(Long id, String username) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi ID=" + id));
        if (exam.getStatus() != ExamStatus.SCHEDULED) {
            throw new RuntimeException("Chỉ có thể xoá kỳ thi ở trạng thái SCHEDULED");
        }
        examRepository.delete(exam);
    }

    @Transactional
    public ExamResponse startExam(Long id, String username) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi ID=" + id));

        if (exam.getExamType() != ExamType.CLASS_EXAM) {
            throw new RuntimeException("Chỉ CLASS_EXAM mới có thể mở thủ công");
        }
        if (exam.getStatus() != ExamStatus.SCHEDULED) {
            throw new RuntimeException("Kỳ thi không ở trạng thái SCHEDULED");
        }

        exam.setStatus(ExamStatus.OPEN);
        exam.setStartedAt(LocalDateTime.now());
        exam = examRepository.save(exam);

        return toResponse(exam, 0, 0);
    }

    @Transactional
    public ExamResponse closeExam(Long id, String username) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi ID=" + id));

        if (exam.getStatus() != ExamStatus.OPEN) {
            throw new RuntimeException("Kỳ thi không ở trạng thái OPEN");
        }

        exam.setStatus(ExamStatus.CLOSED);
        exam.setClosedAt(LocalDateTime.now());
        exam = examRepository.save(exam);

        return toResponse(exam, 0, 0);
    }

    @Transactional(readOnly = true)
    public ExamResponse getExamDetail(Long id, String username) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi ID=" + id));

        int totalAttempts = examAttemptRepository.findByExamIdAndUserId(id, null).size();
        int totalSubmitted = (int) examAttemptRepository.findByExamIdAndUserId(id, null).stream()
                .filter(a -> List.of("SUBMITTED", "GRADED", "TIMED_OUT").contains(a.getStatus()))
                .count();

        return toResponse(exam, totalAttempts, totalSubmitted);
    }

    @Transactional(readOnly = true)
    public List<ExamResponse> listTeacherExams(String username) {
        User teacher = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<Exam> exams = examRepository.findByCreatedByIdOrderByCreatedAtDesc(teacher.getId());
        List<ExamResponse> result = new ArrayList<>();
        for (Exam exam : exams) {
            int totalAttempts = examAttemptRepository.findByExamId(exam.getId()).size();
            int totalSubmitted = (int) examAttemptRepository.findByExamId(exam.getId()).stream()
                    .filter(a -> List.of("SUBMITTED", "GRADED", "TIMED_OUT").contains(a.getStatus()))
                    .count();
            result.add(toResponse(exam, totalAttempts, totalSubmitted));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<ExamResponse> listStudentExams(String username) {
        User student = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<Exam> allExams = examRepository.findAll();
        List<Exam> visibleExams = new ArrayList<>();

        for (Exam exam : allExams) {
            if (exam.getExamType() == ExamType.CLASS_EXAM) {
                if (exam.getClazz() != null && classStudentRepository.existsByUserIdAndClazzId(student.getId(), exam.getClazz().getId())) {
                    visibleExams.add(exam);
                }
            } else {
                visibleExams.add(exam);
            }
        }

        List<ExamResponse> result = new ArrayList<>();
        for (Exam exam : visibleExams) {
            int totalAttempts = examAttemptRepository.countByExamIdAndUserId(exam.getId(), student.getId());
            result.add(toResponse(exam, totalAttempts, 0));
        }
        return result;
    }

    public boolean verifyPassword(Long examId, String rawPassword) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi"));
        if (exam.getPassword() == null || exam.getPassword().isBlank()) return true;
        return passwordEncoder.matches(rawPassword, exam.getPassword());
    }

    public void checkStudentCanAccess(Long examId, Long userId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi"));

        if (exam.getStatus() != ExamStatus.OPEN) {
            throw new RuntimeException("Kỳ thi chưa mở hoặc đã đóng");
        }

        // Check attempts
        int count = examAttemptRepository.countByExamIdAndUserId(examId, userId);
        if (count >= exam.getMaxAttempts()) {
            throw new RuntimeException("Bạn đã hết số lần thi cho kỳ thi này");
        }

        // Check late entry
        if (exam.getLateEntryMinutes() != null && exam.getLateEntryMinutes() > 0 && exam.getStartedAt() != null) {
            if (LocalDateTime.now().isAfter(exam.getStartedAt().plusMinutes(exam.getLateEntryMinutes()))) {
                throw new RuntimeException("Đã quá giờ vào thi");
            }
        }

        if (exam.getExamType() == ExamType.CLASS_EXAM) {
            if (exam.getClazz() == null || !classStudentRepository.existsByUserIdAndClazzId(userId, exam.getClazz().getId())) {
                throw new RuntimeException("Bạn không thuộc lớp được thi");
            }
        }
    }

    private ExamResponse toResponse(Exam exam, int totalAttempts, int totalSubmitted) {
        ExamResponse res = new ExamResponse();
        res.setId(exam.getId());
        res.setTitle(exam.getTitle());
        res.setDescription(exam.getDescription());
        res.setExamType(exam.getExamType());
        res.setStatus(exam.getStatus());
        res.setTestId(exam.getTest().getId());
        res.setTestTitle(exam.getTest().getTitle());
        res.setDurationMinutes(exam.getDurationMinutes());
        res.setHasPassword(exam.getPassword() != null && !exam.getPassword().isBlank());
        res.setMaxAttempts(exam.getMaxAttempts());
        res.setAllowReviewAfterSubmit(exam.getAllowReviewAfterSubmit());
        res.setLateEntryMinutes(exam.getLateEntryMinutes());
        res.setCreatedByUsername(exam.getCreatedBy().getUsername());
        res.setStartedAt(exam.getStartedAt());
        res.setClosedAt(exam.getClosedAt());
        res.setCreatedAt(exam.getCreatedAt());
        res.setTotalAttempts(totalAttempts);
        res.setTotalSubmitted(totalSubmitted);

        if (exam.getExamType() == ExamType.CLASS_EXAM && exam.getClazz() != null) {
            res.setClassId(exam.getClazz().getId());
            res.setClassName(exam.getClazz().getName());
        } else {
            res.setScheduledStartTime(exam.getScheduledStartTime());
            res.setScheduledEndTime(exam.getScheduledEndTime());
        }

        return res;
    }
}
