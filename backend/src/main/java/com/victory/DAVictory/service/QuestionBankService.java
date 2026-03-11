package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.QuestionGroupRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.QuestionTypeEnum;
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
        int order = 1;
        for (QuestionTypeEnum qte : QuestionTypeEnum.values()) {
            if (!questionTypeRepository.existsByCode(qte.name())) {
                QuestionType qt = new QuestionType();
                qt.setCode(qte.name());
                qt.setDisplayName(qte.getDisplayName());
                qt.setDescription(qte.getDescription());
                qt.setHasOptions(qte.isHasOptions());
                qt.setHasTextAnswer(qte.isHasTextAnswer());
                qt.setHasMatching(qte.isHasMatching());
                qt.setApplicableSkills(qte.getApplicableSkills());
                qt.setOrderIndex(order);
                qt.setIsActive(true);
                questionTypeRepository.save(qt);
            }
            order++;
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

    /**
     * Tạo group đầy đủ: group + questions + options/answers + matching pairs
     * Từ QuestionGroupRequest DTO
     */
    @Transactional
    public QuestionGroup createFullQuestionGroup(Long partId, QuestionGroupRequest request) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy part: " + partId));

        QuestionGroup group = new QuestionGroup();
        group.setPart(part);

        // Gán loại câu hỏi cho group (bắt buộc)
        QuestionType groupQT = null;
        if (request.getQuestionTypeCode() != null) {
            groupQT = getQuestionTypeByCode(request.getQuestionTypeCode());
        } else if (request.getQuestionTypeId() != null) {
            groupQT = questionTypeRepository.findById(request.getQuestionTypeId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy loại câu hỏi"));
        } else {
            throw new RuntimeException("Phải chỉ định questionTypeCode hoặc questionTypeId cho group");
        }
        group.setQuestionType(groupQT);

        // Tự động sinh title nếu user không nhập
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            group.setTitle(request.getTitle());
        } else {
            String autoTitle = groupQT.getDisplayName();
            if (request.getFromQuestion() != null && request.getToQuestion() != null) {
                autoTitle += " (Questions " + request.getFromQuestion() + "-" + request.getToQuestion() + ")";
            }
            group.setTitle(autoTitle);
        }

        group.setContentType(request.getContentType());
        group.setPassageText(request.getPassageText());
        group.setAudioUrl(request.getAudioUrl());
        group.setImageUrl(request.getImageUrl());
        group.setResourceUrl(request.getResourceUrl());
        group.setFromQuestion(request.getFromQuestion());
        group.setToQuestion(request.getToQuestion());
        group.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        group.setIsActive(true);

        QuestionGroup savedGroup = questionGroupRepository.save(group);

        // Tạo questions nếu có — tự động kế thừa questionType từ group
        if (request.getQuestions() != null) {
            for (int i = 0; i < request.getQuestions().size(); i++) {
                QuestionGroupRequest.QuestionRequest qReq = request.getQuestions().get(i);
                // Nếu question không chỉ định questionType → dùng của group
                if (qReq.getQuestionTypeCode() == null && qReq.getQuestionTypeId() == null) {
                    qReq.setQuestionTypeId(savedGroup.getQuestionType().getId());
                }
                createQuestionFromRequest(savedGroup, qReq, i);
            }
        }

        // Tạo matching pairs nếu có
        if (request.getMatchingPairs() != null) {
            for (int i = 0; i < request.getMatchingPairs().size(); i++) {
                QuestionGroupRequest.MatchingPairRequest mpReq = request.getMatchingPairs().get(i);
                MatchingPair mp = new MatchingPair();
                mp.setQuestionGroup(savedGroup);
                mp.setLeftLabel(mpReq.getLeftLabel());
                mp.setLeftContent(mpReq.getLeftContent());
                mp.setRightLabel(mpReq.getRightLabel());
                mp.setRightContent(mpReq.getRightContent());
                mp.setMatchType(mpReq.getMatchType());
                mp.setOrderIndex(mpReq.getOrderIndex() != null ? mpReq.getOrderIndex() : i);
                matchingPairRepository.save(mp);
            }
        }

        return questionGroupRepository.findById(savedGroup.getId()).orElse(savedGroup);
    }

    @Transactional
    public QuestionGroup updateQuestionGroup(Long groupId, QuestionGroupRequest request) {
        QuestionGroup group = getGroupById(groupId);
        if (request.getQuestionTypeCode() != null) {
            group.setQuestionType(getQuestionTypeByCode(request.getQuestionTypeCode()));
        } else if (request.getQuestionTypeId() != null) {
            group.setQuestionType(questionTypeRepository.findById(request.getQuestionTypeId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy loại câu hỏi")));
        }
        if (request.getTitle() != null)       group.setTitle(request.getTitle());
        if (request.getContentType() != null) group.setContentType(request.getContentType());
        if (request.getPassageText() != null) group.setPassageText(request.getPassageText());
        if (request.getAudioUrl() != null)    group.setAudioUrl(request.getAudioUrl());
        if (request.getImageUrl() != null)    group.setImageUrl(request.getImageUrl());
        if (request.getResourceUrl() != null) group.setResourceUrl(request.getResourceUrl());
        if (request.getFromQuestion() != null) group.setFromQuestion(request.getFromQuestion());
        if (request.getToQuestion() != null)   group.setToQuestion(request.getToQuestion());
        if (request.getOrderIndex() != null)   group.setOrderIndex(request.getOrderIndex());
        return questionGroupRepository.save(group);
    }

    @Transactional
    public void deactivateQuestionGroup(Long groupId) {
        QuestionGroup group = getGroupById(groupId);
        group.setIsActive(false);
        questionGroupRepository.save(group);
    }

    /**
     * Thêm 1 câu hỏi vào group (tạo mới)
     */
    @Transactional
    public Question addQuestionToGroup(Long groupId, QuestionGroupRequest.QuestionRequest qReq) {
        QuestionGroup group = getGroupById(groupId);
        // Tự kế thừa questionType từ group nếu question không chỉ định
        if (qReq.getQuestionTypeCode() == null && qReq.getQuestionTypeId() == null
                && group.getQuestionType() != null) {
            qReq.setQuestionTypeId(group.getQuestionType().getId());
        }
        int index = (int) questionRepository.countByQuestionGroupId(groupId);
        return createQuestionFromRequest(group, qReq, index);
    }

    @Transactional
    public Question updateQuestion(Long questionId, QuestionGroupRequest.QuestionRequest qReq) {
        Question question = getQuestionById(questionId);

        if (qReq.getQuestionNumber() != null) question.setQuestionNumber(qReq.getQuestionNumber());
        if (qReq.getQuestionText() != null)   question.setQuestionText(qReq.getQuestionText());
        if (qReq.getBlankContext() != null)    question.setBlankContext(qReq.getBlankContext());
        if (qReq.getImageUrl() != null)        question.setImageUrl(qReq.getImageUrl());
        if (qReq.getPoints() != null)          question.setPoints(qReq.getPoints());
        if (qReq.getOrderIndex() != null)      question.setOrderIndex(qReq.getOrderIndex());

        if (qReq.getQuestionTypeCode() != null) {
            QuestionType qt = getQuestionTypeByCode(qReq.getQuestionTypeCode());
            question.setQuestionType(qt);
        } else if (qReq.getQuestionTypeId() != null) {
            QuestionType qt = questionTypeRepository.findById(qReq.getQuestionTypeId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy loại câu hỏi"));
            question.setQuestionType(qt);
        }

        // Nếu gửi kèm options mới → xóa cũ, tạo mới
        if (qReq.getOptions() != null) {
            question.getOptions().clear();
            questionRepository.save(question);
            for (int i = 0; i < qReq.getOptions().size(); i++) {
                QuestionGroupRequest.OptionRequest oReq = qReq.getOptions().get(i);
                QuestionOption opt = new QuestionOption();
                opt.setQuestion(question);
                opt.setOptionLabel(oReq.getOptionLabel());
                opt.setOptionText(oReq.getOptionText());
                opt.setIsCorrect(oReq.getIsCorrect() != null ? oReq.getIsCorrect() : false);
                opt.setOrderIndex(oReq.getOrderIndex() != null ? oReq.getOrderIndex() : i);
                questionOptionRepository.save(opt);
            }
        }

        // Nếu gửi kèm answers mới → xóa cũ, tạo mới
        if (qReq.getAnswers() != null) {
            question.getAnswers().clear();
            questionRepository.save(question);
            for (int i = 0; i < qReq.getAnswers().size(); i++) {
                QuestionGroupRequest.AnswerRequest aReq = qReq.getAnswers().get(i);
                Answer answer = new Answer();
                answer.setQuestion(question);
                answer.setAnswerText(aReq.getAnswerText());
                answer.setAlternativeAnswers(aReq.getAlternativeAnswers());
                answer.setIsCaseSensitive(aReq.getIsCaseSensitive() != null ? aReq.getIsCaseSensitive() : false);
                answer.setBlankIndex(aReq.getBlankIndex() != null ? aReq.getBlankIndex() : i + 1);
                answer.setWordLimit(aReq.getWordLimit());
                answerRepository.save(answer);
            }
        }

        return questionRepository.save(question);
    }

    @Transactional
    public void deactivateQuestion(Long questionId) {
        Question question = getQuestionById(questionId);
        question.setIsActive(false);
        questionRepository.save(question);
    }

    // ───────────────────────────────────────────
    // Private helper
    // ───────────────────────────────────────────

    private Question createQuestionFromRequest(QuestionGroup group,
                                                QuestionGroupRequest.QuestionRequest qReq, int defaultIndex) {
        // Resolve question type
        QuestionType qt;
        if (qReq.getQuestionTypeCode() != null) {
            qt = getQuestionTypeByCode(qReq.getQuestionTypeCode());
        } else if (qReq.getQuestionTypeId() != null) {
            qt = questionTypeRepository.findById(qReq.getQuestionTypeId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy loại câu hỏi"));
        } else {
            throw new RuntimeException("Phải chỉ định questionTypeCode hoặc questionTypeId");
        }

        Question question = new Question();
        question.setQuestionGroup(group);
        question.setQuestionType(qt);
        question.setQuestionNumber(qReq.getQuestionNumber() != null ? qReq.getQuestionNumber() : defaultIndex + 1);
        question.setQuestionText(qReq.getQuestionText());
        question.setBlankContext(qReq.getBlankContext());
        question.setImageUrl(qReq.getImageUrl());
        question.setPoints(qReq.getPoints() != null ? qReq.getPoints() : 1.0);
        question.setOrderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : defaultIndex);
        question.setIsActive(true);

        Question savedQuestion = questionRepository.save(question);

        // Tạo options (MCQ, TFNG, YNNG)
        if (qReq.getOptions() != null) {
            for (int i = 0; i < qReq.getOptions().size(); i++) {
                QuestionGroupRequest.OptionRequest oReq = qReq.getOptions().get(i);
                QuestionOption opt = new QuestionOption();
                opt.setQuestion(savedQuestion);
                opt.setOptionLabel(oReq.getOptionLabel());
                opt.setOptionText(oReq.getOptionText());
                opt.setIsCorrect(oReq.getIsCorrect() != null ? oReq.getIsCorrect() : false);
                opt.setOrderIndex(oReq.getOrderIndex() != null ? oReq.getOrderIndex() : i);
                questionOptionRepository.save(opt);
            }
        }

        // Tạo answers (Fill blank, Short answer...)
        if (qReq.getAnswers() != null) {
            for (int i = 0; i < qReq.getAnswers().size(); i++) {
                QuestionGroupRequest.AnswerRequest aReq = qReq.getAnswers().get(i);
                Answer answer = new Answer();
                answer.setQuestion(savedQuestion);
                answer.setAnswerText(aReq.getAnswerText());
                answer.setAlternativeAnswers(aReq.getAlternativeAnswers());
                answer.setIsCaseSensitive(aReq.getIsCaseSensitive() != null ? aReq.getIsCaseSensitive() : false);
                answer.setBlankIndex(aReq.getBlankIndex() != null ? aReq.getBlankIndex() : i + 1);
                answer.setWordLimit(aReq.getWordLimit());
                answerRepository.save(answer);
            }
        }

        return savedQuestion;
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
