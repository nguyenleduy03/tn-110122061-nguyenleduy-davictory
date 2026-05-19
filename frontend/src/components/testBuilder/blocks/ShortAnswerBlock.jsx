import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight, calculateQuestionRange } from './shared/blockHelpers';
import { useTabIndent } from '../../../hooks/useTabIndent';

// Bulk Answer Import Component
const BulkAnswerImport = ({ questions, onImport }) => {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');
  const { handleKeyDown } = useTabIndent();

  const handleImport = () => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      alert('Vui lòng nhập đáp án (mỗi dòng 1 đáp án)');
      return;
    }
    onImport(lines);
    setText('');
    setShow(false);
    alert(`Đã import ${lines.length} đáp án`);
  };

  if (!show) {
    return (
      <button
        className="exam-add-btn"
        onClick={() => setShow(true)}
        style={{ fontSize: 12, marginBottom: 8 }}
      >
        📋
      </button>
    );
  }

  return (
    <div style={{ marginBottom: 12, padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        Paste đáp án (mỗi dòng 1 đáp án, theo thứ tự câu hỏi):
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={Math.min(questions.length, 10)}
        placeholder={`Ví dụ:\nwater\n1|one\ntemperature\n...`}
        style={{
          width: '100%',
          padding: 8,
          border: '1px solid #cbd5e1',
          borderRadius: 3,
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          className="exam-add-btn"
          onClick={handleImport}
          style={{ fontSize: 12 }}
        >
          ✓ Import {text.split('\n').filter(l => l.trim()).length} đáp án
        </button>
        <button
          className="exam-add-btn"
          onClick={() => { setShow(false); setText(''); }}
          style={{ fontSize: 12, background: '#94a3b8' }}
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

const ShortAnswerBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  allGroups = [], partQuestionStartNumber = 1,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  const partRange = calculateQuestionRange(group, allGroups);
  const fromQ = partQuestionStartNumber + Math.max(0, (partRange.fromQuestion ?? 1) - 1);
  const toQ = questions.length > 0 ? (fromQ + questions.length - 1) : (group.toQuestion ?? fromQ);

  useEffect(() => {
    // Chỉ update khi range thay đổi hoặc questionNumber sai
    const isRangeChanged = group.fromQuestion !== fromQ || group.toQuestion !== toQ;
    
    // Check nếu có questionNumber sai - KHÔNG dùng questions.some() vì nó đọc toàn bộ array
    let hasWrongNumbers = false;
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].questionNumber !== fromQ + i) {
        hasWrongNumbers = true;
        break;
      }
    }

    if (!isRangeChanged && !hasWrongNumbers) {
      return; // Không cần update
    }

    const normalizedQuestions = questions.map((q, idx) => ({
      ...q,
      questionNumber: fromQ + idx,
    }));
    
    onUpdate(group.id, {
      fromQuestion: fromQ,
      toQuestion: toQ,
      questions: normalizedQuestions,
    });
  }, [fromQ, toQ, questions.length, group.id, group.fromQuestion, group.toQuestion, onUpdate]);

  const normalizeAnswers = (q) => {
    const rawAnswers = Array.isArray(q?.answers) && q.answers.length > 0
      ? q.answers
      : (q?.answerText ? [q.answerText] : []);

    return rawAnswers.map((ans, idx) => {
      if (typeof ans === 'string') {
        return {
          answerText: ans,
          blankIndex: idx + 1,
          isCaseSensitive: false,
          alternativeAnswers: null,
          wordLimit: null,
          isSample: false,
        };
      }

      return {
        answerText: ans?.answerText || '',
        blankIndex: ans?.blankIndex ?? idx + 1,
        isCaseSensitive: ans?.isCaseSensitive ?? false,
        alternativeAnswers: ans?.alternativeAnswers ?? null,
        wordLimit: ans?.wordLimit ?? null,
        isSample: ans?.isSample ?? false,
      };
    });
  };
  
  const addAnswer = (qId) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = normalizeAnswers(q);
    const nextAnswers = [...answers, {
      answerText: '',
      blankIndex: answers.length + 1,
      isCaseSensitive: false,
      alternativeAnswers: null,
      wordLimit: null,
    }];
    onUpdateQuestion(group.id, qId, {
      answerText: nextAnswers[0]?.answerText || '',
      answers: nextAnswers,
    });
  };

  const updateAnswer = (qId, answerIndex, value) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = normalizeAnswers(q);
    answers[answerIndex] = {
      ...(answers[answerIndex] || { blankIndex: answerIndex + 1, isCaseSensitive: false, alternativeAnswers: null, wordLimit: null }),
      answerText: value,
      blankIndex: answers[answerIndex]?.blankIndex ?? answerIndex + 1,
      isSample: answers[answerIndex]?.isSample ?? false,
    };
    onUpdateQuestion(group.id, qId, {
      answerText: answers[0]?.answerText || '',
      answers,
    });
  };

  const toggleSample = (qId, answerIndex) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = normalizeAnswers(q);
    answers[answerIndex] = {
      ...answers[answerIndex],
      isSample: !answers[answerIndex]?.isSample,
    };
    onUpdateQuestion(group.id, qId, {
      answerText: answers[0]?.answerText || '',
      answers,
    });
  };

  const deleteAnswer = (qId, answerIndex) => {
    const q = group.questions.find(x => x.id === qId);
    if (!q) return;
    const answers = normalizeAnswers(q);
    if (answers.length <= 1) return;
    answers.splice(answerIndex, 1);
    onUpdateQuestion(group.id, qId, {
      answerText: answers[0]?.answerText || '',
      answers,
    });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Answer the questions. Write NO MORE THAN THREE WORDS for each answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>
      
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Tiêu đề / ngữ cảnh (nếu có)..."
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onInput={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        onBlur={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />
      <div className="exam-q-range-header">
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1"
          onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="4"
          onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
          onClick={(e) => e.stopPropagation()} />
      </div>
      {questions.map((q) => {
        const answers = normalizeAnswers(q);
        return (
          <div key={q.id}
            className={`exam-sc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-q-num" style={{ background: '#166534', flexShrink: 0 }}>
              {q.questionNumber ?? '?'}
              {answers.length > 1 && <div style={{ fontSize: 9, marginTop: 2 }}>×{answers.length}</div>}
            </div>
            <div className="exam-sc-body">
              <RichInput
                value={q.questionText || ''}
                placeholder="VD: What is the name of the street?"
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  Đáp án (✓ = mẫu, hiển thị trong đề nhưng không tính điểm):
                </div>
                <BulkAnswerImport questions={[q]} onImport={(lines) => {
                  const nextAnswers = lines.map((ans, idx) => ({
                    answerText: ans,
                    blankIndex: idx + 1,
                    isCaseSensitive: false,
                    alternativeAnswers: null,
                    wordLimit: null,
                    isSample: false,
                  }));
                  onUpdateQuestion(group.id, q.id, {
                    answerText: nextAnswers[0]?.answerText || '',
                    answers: nextAnswers,
                  });
                }} />
                {answers.map((ans, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <input 
                      type="checkbox" 
                      checked={ans.isSample || false}
                      onChange={(e) => { e.stopPropagation(); toggleSample(q.id, idx); }}
                      onClick={(e) => e.stopPropagation()}
                      title="Đáp án mẫu (không tính điểm)"
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 16 }}>{idx + 1}.</span>
                    <RichInput
                      style={{ flex: 1, opacity: ans.isSample ? 0.6 : 1 }}
                      value={ans.answerText || ''}
                      placeholder="nhập đáp án..."
                      onChange={(html) => updateAnswer(q.id, idx, html)} />
                    {answers.length > 1 && (
                      <button 
                        style={{ padding: '2px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}
                        onClick={(e) => { e.stopPropagation(); deleteAnswer(q.id, idx); }}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  className="exam-add-btn" 
                  style={{ fontSize: 11, padding: '3px 8px', marginTop: 4 }}
                  onClick={(e) => { e.stopPropagation(); addAnswer(q.id); }}>
                  <Plus size={10} /> Thêm đáp án
                </button>
              </div>
            </div>
            <button className="exam-group-tool-btn danger"
              onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
              <X size={11} />
            </button>
          </div>
        );
      })}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};
export default ShortAnswerBlock;
