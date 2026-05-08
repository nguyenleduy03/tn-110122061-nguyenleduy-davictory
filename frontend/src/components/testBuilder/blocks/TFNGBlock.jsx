import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight, calculateQuestionRange } from './shared/blockHelpers';

const TFNGBlock = ({ group, allGroups = [], partQuestionStartNumber = 1, onUpdate, onDelete, onSelect, selected, dragHandleProps,
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const isYesNo = group.isYesNo || false;
  const options = isYesNo ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN'];
  const partRange = calculateQuestionRange(group, allGroups);
  const fromQ = partQuestionStartNumber + Math.max(0, (partRange.fromQuestion ?? 1) - 1);
  const toQ = questions.length > 0 ? (fromQ + questions.length - 1) : (group.toQuestion ?? fromQ);

  useEffect(() => {
    const normalizedQuestions = questions.map((q, idx) => ({
      ...q,
      questionNumber: fromQ + idx,
    }));
    const isRangeChanged = group.fromQuestion !== fromQ || group.toQuestion !== toQ;
    const isQuestionsChanged = normalizedQuestions.length !== questions.length
      || normalizedQuestions.some((q, idx) => q.questionNumber !== questions[idx]?.questionNumber);

    if (isRangeChanged || isQuestionsChanged) {
      onUpdate(group.id, {
        fromQuestion: fromQ,
        toQuestion: toQ,
        questions: normalizedQuestions,
      });
    }
  }, [fromQ, toQ, questions, group.id, group.fromQuestion, group.toQuestion, onUpdate]);

  const handleImport = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Vui lòng nhập câu hỏi (mỗi dòng 1 câu)');
      return;
    }
    const baseNum = questions.length > 0 ? Math.max(...questions.map(q => q.questionNumber || 0)) + 1 : fromQ;
    const imported = lines.map((text, i) => ({
      id: `q-${Date.now()}-${i}`,
      questionNumber: baseNum + i,
      questionText: text,
      answerText: '',
      questionType: { typeName: 'TRUE_FALSE_NG' }
    }));
    const allQuestions = [...questions, ...imported];
    const newFromQuestion = allQuestions.length > 0 ? fromQ : null;
    const newToQuestion = allQuestions.length > 0 ? fromQ + allQuestions.length - 1 : null;
    onUpdate(group.id, { 
      questions: allQuestions,
      fromQuestion: newFromQuestion,
      toQuestion: newToQuestion
    });
    setImportText('');
    setShowImport(false);
    alert(`Đã import ${lines.length} câu hỏi`);
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      
      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Choose TRUE if the statement agrees with the information, FALSE if it contradicts, or NOT GIVEN if there is no information."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>
      
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Tiêu đề / ngữ cảnh chung (nếu có)..."
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onInput={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        onBlur={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />
      
      {/* Toggle YES/NO or TRUE/FALSE */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={isYesNo}
            onChange={(e) => onUpdate(group.id, { isYesNo: e.target.checked })}
            onClick={(e) => e.stopPropagation()}
          />
          Dùng YES / NO / NOT GIVEN
        </label>
      </div>
      
      <div className="exam-q-range-header">
        Câu&nbsp;
        <input className="exam-q-range-input" value={fromQ} placeholder="1" readOnly
          style={{ background: '#f9fafb', color: '#9ca3af' }}
          onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={toQ} placeholder="7" readOnly
          style={{ background: '#f9fafb', color: '#9ca3af' }}
          onClick={(e) => e.stopPropagation()} />
      </div>
      {questions.map((q) => (
        <div key={q.id}
          className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
          <div className="exam-mc-q-header">
            <div className="exam-q-num" style={{ background: '#1d4ed8' }}>{q.questionNumber ?? '?'}</div>
            <RichInput
              style={{ flex: 1 }}
              value={q.questionText || ''}
              placeholder="Nội dung phát biểu..."
              onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
            <button className="exam-group-tool-btn danger"
              onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
              <X size={11} />
            </button>
          </div>
          {/* TRUE / FALSE / NOT GIVEN radio buttons */}
          <div className="exam-tfng-options">
            {options.map((v) => (
              <label key={v} className={`exam-tfng-opt${q.answerText === v ? ' correct' : ''}`}
                onClick={(e) => e.stopPropagation()}>
                <input type="radio"
                  checked={q.answerText === v}
                  onChange={() => onUpdateQuestion(group.id, q.id, { answerText: v })}
                  onClick={(e) => e.stopPropagation()} />
                {v}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
      <button className="exam-add-btn" style={{ marginLeft: 8, background: '#6366f1', color: 'white' }}
        onClick={(e) => { e.stopPropagation(); setShowImport(!showImport); }}>
        📋 Import câu hỏi
      </button>

      {showImport && (
        <div style={{ marginTop: 12, padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            Paste câu hỏi (mỗi dòng 1 câu):
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={10}
            placeholder="The writer believes that the current system is effective.
Research shows that people prefer traditional methods.
The government has implemented new policies."
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid #cbd5e1',
              borderRadius: 3,
              fontSize: 12,
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              className="exam-add-btn"
              onClick={handleImport}
              style={{ fontSize: 12 }}
            >
              ✓ Import {importText.split('\n').filter(l => l.trim()).length} câu
            </button>
            <button
              className="exam-add-btn"
              onClick={() => { setShowImport(false); setImportText(''); }}
              style={{ fontSize: 12, background: '#94a3b8' }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Sentence Completion Block ----

export default TFNGBlock;
