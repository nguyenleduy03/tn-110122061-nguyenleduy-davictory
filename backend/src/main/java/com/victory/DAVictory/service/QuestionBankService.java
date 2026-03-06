package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class QuestionBankService {

    private final QuestionTypeRepository questionTypeRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final MatchingPairRepository matchingPairRepository;
    private final QuestionHintRepository questionHintRepository;
    private final QuestionExplanationRepository questionExplanationRepository;
    private final QuestionTagRepository questionTagRepository;
    private final PartRepository partRepository;
    private final DifficultyLevelRepository difficultyLevelRepository;

    // ───────────────────────────────────────────
    // QuestionType
    // ───────────────────────────────────────────

    public List<QuestionType> getAllActiveQuestionTypes() {
        return questionTypeRepository.findByIsActiveTrueOrderByOrderIndexAsc();
    }

    public QuestionType getQuestionTypeByCode(String code) {
        return questionTypeRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy loại câu hỏi: " + code));
    }

    @Transactional
    public QuestionType createQuestionType(QuestionType questionType) {
        if (questionTypeRepository.existsByCode(questionType.getCode())) {
            throw new RuntimeException("Loại câu hỏi đã tồn tại: " + questionType.getCode());
        }
        return questionTypeRepository.save(questionType);
    }

    @Transactional
    public void initializeDefaultQuestionTypes() {
        Object[][] defaults = {
            {"MCQ",                "Multiple Choice",             true,  false, false, "ALL",              1},
            {"TFNG",               "True/False/Not Given",        true,  false, false, "READING",          2},
            {"YNNG",               "Yes/No/Not Given",            true,  false, false, "READING",          3},
            {"FILL_BLANK",         "Fill in the Blank",           false, true,  false, "LISTENING_READING",4},
            {"SENTENCE_COMPLETION","Sentence Completion",         false, true,  false, "LISTENING_READING",5},
            {"SUMMARY_COMPLETION", "Summary Completion",          false, true,  false, "LISTENING_READING",6},
            {"NOTE_COMPLETION",    "Note/Table/Form Completion",  false, true,  false, "LISTENING",        7},
            {"SHORT_ANSWER",       "Short Answer",                false, true,  false, "LISTENING_READING",8},
            {"MATCHING",           "Matching",                    false, false, true,  "READING",          9},
            {"MATCHING_HEADINGS",  "Matching Headings",           false, false, true,  "READING",          10},
            {"MAP_DIAGRAM",        "Map/Diagram Labelling",       false, true,  false, "LISTENING",        11},
            {"FLOW_CHART",         "Flow-chart Completion",       false, true,  false, "LISTENING",        12},
            {"LETTER",             "Letter (General Writing)",    false, false, false, "WRITING",          13},
            {"ESSAY",              "Essay (Academic Writing)",    false, false, false, "WRITING",          14},
        };

        for (Object[] row : defaults) {
            String code = (String) row[0];
            if (!questionTypeRepository.existsByCode(code)) {
                QuestionType qt = new QuestionType();
                qt.setCode(code);
                qt.setDisplayName((String) row[1]);
                qt.setHasOptions((Boolean) row[2]);
                qt.setHasTextAnswer((Boolean) row[3]);
                qt.setHasMatching((Boolean) row[4]);
                qt.setApplicableSkills((String) row[5]);
                qt.setOrderIndex((Integer) row[6]);
                qt.setIsActive(true);
                questionTypeRepository.save(qt);
            }
        }
    }

    // ───────────────────────────────────────────
    // QuestionGroup
    // ───────────────────────────────────────────

    public List<QuestionGroup> getGroupsByPart(Long partId) {
        return questionGroupRepository.findByPartIdAndIsActiveTrueOrderByOrderIndexAsc(partId);
    }

    public QuestionGroup getGroupById(Long id) {
        return questionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm câu hỏi: " + id));
    }

    @Transactional
    public QuestionGroup createQuestionGroup(QuestionGroup group) {
        partRepository.findById(group.getPart().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy part: " + group.getPart().getId()));
        return questionGroupRepository.save(group);
    }

    // ───────────────────────────────────────────
    // Question
    // ───────────────────────────────────────────

    public List<Question> getQuestionsByGroup(Long groupId) {
        return questionRepository.findByQuestionGroupIdAndIsActiveTrueOrderByOrderIndexAsc(groupId);
    }

    public List<Question> getQuestionsBySession(Long sessionId) {
        return questionRepository.findAllBySessionId(sessionId);
    }

    public Question getQuestionById(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu hỏi: " + id));
    }

    @Transactional
    public Question createQuestion(Question question) {
        return questionRepository.save(question);
    }

    // ───────────────────────────────────────────
    // QuestionOption
    // ───────────────────────────────────────────

    public List<QuestionOption> getOptionsByQuestion(Long questionId) {
        return questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(questionId);
    }

    @Transactional
    public QuestionOption addOption(QuestionOption option) {
        return questionOptionRepository.save(option);
    }

    // ───────────────────────────────────────────
    // Answer
    // ───────────────────────────────────────────

    public List<Answer> getAnswersByQuestion(Long questionId) {
        return answerRepository.findByQuestionIdOrderByBlankIndexAsc(questionId);
    }

    @Transactional
    public Answer addAnswer(Answer answer) {
        return answerRepository.save(answer);
    }

    // ───────────────────────────────────────────
    // MatchingPair
    // ───────────────────────────────────────────

    public List<MatchingPair> getMatchingPairsByGroup(Long groupId) {
        return matchingPairRepository.findByQuestionGroupIdOrderByOrderIndexAsc(groupId);
    }

    @Transactional
    public MatchingPair addMatchingPair(MatchingPair pair) {
        return matchingPairRepository.save(pair);
    }

    // ───────────────────────────────────────────
    // QuestionHint
    // ───────────────────────────────────────────

    public List<QuestionHint> getHintsByQuestion(Long questionId) {
        return questionHintRepository.findByQuestionIdAndIsActiveTrueOrderByHintOrderAsc(questionId);
    }

    @Transactional
    public QuestionHint addHint(QuestionHint hint) {
        return questionHintRepository.save(hint);
    }

    // ───────────────────────────────────────────
    // QuestionExplanation
    // ───────────────────────────────────────────

    public QuestionExplanation getExplanationByQuestion(Long questionId) {
        return questionExplanationRepository.findByQuestionId(questionId)
                .orElseThrow(() -> new RuntimeException("Chưa có giải thích cho câu hỏi: " + questionId));
    }

    @Transactional
    public QuestionExplanation saveExplanation(QuestionExplanation explanation) {
        if (questionExplanationRepository.existsByQuestionId(explanation.getQuestion().getId())) {
            throw new RuntimeException("Câu hỏi đã có giải thích, hãy dùng update");
        }
        return questionExplanationRepository.save(explanation);
    }

    @Transactional
    public QuestionExplanation updateExplanation(Long questionId, QuestionExplanation updated) {
        QuestionExplanation existing = questionExplanationRepository.findByQuestionId(questionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giải thích cho câu hỏi: " + questionId));
        existing.setExplanationText(updated.getExplanationText());
        existing.setVideoUrl(updated.getVideoUrl());
        existing.setReferenceText(updated.getReferenceText());
        existing.setReferenceLocation(updated.getReferenceLocation());
        return questionExplanationRepository.save(existing);
    }

    // ───────────────────────────────────────────
    // QuestionTag
    // ───────────────────────────────────────────

    public List<QuestionTag> getTagsByQuestion(Long questionId) {
        return questionTagRepository.findByQuestionId(questionId);
    }

    public List<String> getAllTagNames() {
        return questionTagRepository.findAllDistinctTagNames();
    }

    @Transactional
    public QuestionTag addTag(QuestionTag tag) {
        if (questionTagRepository.existsByQuestionIdAndTagName(
                tag.getQuestion().getId(), tag.getTagName())) {
            throw new RuntimeException("Tag đã được gắn cho câu hỏi này");
        }
        return questionTagRepository.save(tag);
    }

    @Transactional
    public void removeTag(Long questionId, String tagName) {
        questionTagRepository.deleteByQuestionIdAndTagName(questionId, tagName);
    }
}
