import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import ImageUploadZone from './shared/ImageUploadZone';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const MultipleChoiceMultiBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, testTitle, testId, module = 'READING',
  onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const questions = group.questions ?? [];
  
  // Initialize options on mount if missing
  useEffect(() => {
    questions.forEach(q => {
      if (!q.options || q.options.length === 0) {
        const defaultOpts = ['A', 'B', 'C', 'D', 'E'].map((label, i) => ({
          id: Date.now() + i,
          optionLabel: label,
          optionText: '',
          isCorrect: false,
          orderIndex: i
        }));
        onUpdateQuestion(group.id, q.id, { options: defaultOpts });
      }
    });
  }, []);
  
  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      
      <div className="exam-q-range-header">
        Questions {group.fromQuestion ?? questions[0]?.questionNumber ?? '?'}
        {(() => {
          const lastQ = questions[questions.length - 1];
          const lastNum = lastQ ? (lastQ.questionNumber + (lastQ.questionCount || 1) - 1) : null;
          const last = group.toQuestion ?? lastNum;
          const first = group.fromQuestion ?? questions[0]?.questionNumber;
          return (last && last !== first) ? `–${last}` : '';
        })()}
      </div>
      
      {/* Instructions field */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RichInput
            multiline
            rows={2}
            style={{ flex: 1 }}
            value={group.instructions || ''}
            placeholder="Choose TWO letters, A–E."
            onChange={(html) => onUpdate(group.id, { instructions: html })}
          />
          <input type="number" min={1} max={8} className="exam-choose-n-input" style={{ width: 50 }}
            value={group.chooseCount ?? 2}
            onChange={(e) => onUpdate(group.id, { chooseCount: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()} />
          <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>đáp án</span>
        </div>
      </div>
      
      <div contentEditable suppressContentEditableWarning className="exam-mc-context"
        data-placeholder="Ngữ cảnh chung (nếu có)..."
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onUpdate(group.id, { title: e.currentTarget.innerHTML })}
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />
      
      {questions.map((q) => {
        const opts = (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E'].map((label, i) => ({
          id: Date.now() + i,
          optionLabel: label,
          optionText: '',
          isCorrect: false,
          orderIndex: i
        }));
        return (
          <div key={q.id}
            className={`exam-mc-question${selectedQuestionId === q.id ? ' selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
            <div className="exam-mc-q-header">
              <div className="exam-q-num" style={{ background: '#9d174d' }}>{q.questionNumber ?? '?'}</div>
              <RichInput
                style={{ flex: 1 }}
                value={q.questionText || ''}
                placeholder="Nội dung câu hỏi..."
                onChange={(html) => onUpdateQuestion(group.id, q.id, { questionText: html })} />
              <button className="exam-group-tool-btn danger"
                onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>
                <X size={11} />
              </button>
            </div>
            <div className="exam-mc-options">
              {opts.map((opt, i) => {
                const isImg = opt.optionMode === 'image';
                return (
                  <div key={opt.id || i} className={`exam-mc-opt${opt.isCorrect ? ' correct' : ''}${isImg ? ' exam-mc-opt-img-row' : ''}`}>
                    <span className="exam-mc-opt-label">{String.fromCharCode(65 + i)}</span>
                    {isImg ? (
                      <div className="exam-mc-opt-image-cell">
                        <ImageUploadZone
                          imageUrl={opt.optionImageUrl}
                          onImageChange={(url) => { 
                            const next = [...opts]; 
                            next[i] = { ...next[i], optionImageUrl: url }; 
                            onUpdateQuestion(group.id, q.id, { options: next }); 
                          }}
                          onImageDelete={() => { 
                            const next = [...opts]; 
                            next[i] = { ...next[i], optionImageUrl: '' }; 
                            onUpdateQuestion(group.id, q.id, { options: next }); 
                          }}
                          placeholder={`URL ảnh cho ${String.fromCharCode(65 + i)}...`}
                          module={module}
                          assetLabel="MCQ_OPTION"
                          testTitle={testTitle}
                          showPreview={true}
                          compact={false}
                        />
                      </div>
                    ) : (
                      <RichInput
                        style={{ flex: 1 }}
                        value={opt.optionText || ''}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}...`}
                        onChange={(html) => {
                          const next = [...opts]; next[i] = { ...next[i], optionText: html };
                          onUpdateQuestion(group.id, q.id, { options: next });
                        }} />
                    )}
                    <button
                      className="exam-mc-opt-mode-btn"
                      title={isImg ? 'Chuyển sang văn bản' : 'Chuyển sang hình ảnh'}
                      onClick={(e) => { e.stopPropagation(); const next = [...opts]; next[i] = { ...next[i], optionMode: isImg ? 'text' : 'image' }; onUpdateQuestion(group.id, q.id, { options: next }); }}>
                      {isImg ? <span style={{ fontSize: 11, fontWeight: 700 }}>Aa</span> : <Image size={12} />}
                    </button>
                    <input type="checkbox" className="exam-q-option-correct"
                      checked={!!opt.isCorrect} title="Đáp án đúng"
                      onChange={(e) => {
                        const next = [...opts]; next[i] = { ...next[i], isCorrect: e.target.checked };
                        onUpdateQuestion(group.id, q.id, { options: next });
                      }}
                      onClick={(e) => e.stopPropagation()} />
                    <button className="exam-q-del-btn"
                      onClick={(e) => { e.stopPropagation(); onUpdateQuestion(group.id, q.id, { options: opts.filter((_, j) => j !== i) }); }}>×</button>
                  </div>
                );
              })}
              <button className="exam-add-btn" style={{ padding: '3px 10px', fontSize: 11, marginTop: 4 }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const nextLabel = String.fromCharCode(65 + opts.length);
                  onUpdateQuestion(group.id, q.id, { options: [...opts, { id: Date.now(), optionLabel: nextLabel, optionText: '', isCorrect: false, orderIndex: opts.length }] }); 
                }}>
                <Plus size={10} /> Thêm lựa chọn
              </button>
            </div>
          </div>
        );
      })}
      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm câu hỏi
      </button>
    </div>
  );
};


export default MultipleChoiceMultiBlock;
