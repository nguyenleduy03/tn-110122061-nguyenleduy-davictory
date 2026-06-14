import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown, ClipboardList } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const SpeakingInterviewBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const questions = group.questions ?? [];
  const classification = group.classification ?? 'GENERAL';
  const frameName = group.frameName ?? '';
  const frameType = group.frameType ?? 'OPTIONAL';
  const profile = group.profile ?? 'BOTH';
  const randomCount = group.randomCount ?? 0;

  const [showImport, setShowImport] = useState(false);
  const importRef = useRef(null);

  const addQuestion = (e) => {
    e.stopPropagation();
    const nextNum = getNextQuestionNumber(questions);
    onUpdate(group.id, {
      questions: [...questions, {
        id: `spkq-${Date.now()}`,
        questionNumber: nextNum,
        questionText: '',
        questionType: { typeName: 'SPEAKING_INTERVIEW' },
        options: [], answers: [], points: 1,
      }],
    });
  };

  const handleImport = () => {
    const text = importRef.current?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      setShowImport(false);
      return;
    }

    let nextNum = getNextQuestionNumber(questions);
    const newQuestions = lines.map((line, i) => ({
      id: `spkq-imp-${Date.now()}-${i}`,
      questionNumber: nextNum++,
      questionText: line,
      questionType: { typeName: 'SPEAKING_INTERVIEW' },
      options: [], answers: [], points: 1,
    }));

    onUpdate(group.id, {
      questions: [...questions, ...newQuestions],
    });
    setShowImport(false);
  };

  const updateQ = (qId, text) =>
    onUpdate(group.id, { questions: questions.map((q) => (q.id === qId ? { ...q, questionText: text } : q)) });

  const deleteQ = (qId, e) => {
    e.stopPropagation();
    onUpdate(group.id, { questions: questions.filter((q) => q.id !== qId) });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Part 1 - Interview fields */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="exam-wt-label" style={{ fontSize: '0.85em', marginBottom: 4, display: 'block' }}>Tên Frame</label>
              <input type="text" value={frameName}
                onChange={(e) => onUpdate(group.id, { frameName: e.target.value })}
                placeholder="Home, Music..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9em' }}
                onClick={(e) => e.stopPropagation()} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="exam-wt-label" style={{ fontSize: '0.85em', marginBottom: 4, display: 'block' }}>Loại Frame</label>
              <select value={frameType}
                onChange={(e) => onUpdate(group.id, { frameType: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                <option value="MANDATORY">Bắt buộc</option>
                <option value="OPTIONAL">Tùy chọn</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="exam-wt-label" style={{ fontSize: '0.85em', marginBottom: 4, display: 'block' }}>Profile</label>
              <select value={profile}
                onChange={(e) => onUpdate(group.id, { profile: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                <option value="BOTH">Cả 2</option>
                <option value="STUDENT">Student</option>
                <option value="WORK">Work</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="exam-wt-label" style={{ fontSize: '0.85em', marginBottom: 4, display: 'block' }}>Random N</label>
              <input type="number" min={0} max={50} value={randomCount}
                onChange={(e) => onUpdate(group.id, { randomCount: Math.max(0, Number(e.target.value)) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', textAlign: 'center' }}
                onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
          <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
            <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.85em' }}>
              Legacy: Phân loại (chỉ dùng cho BANK mode)
            </label>
            <select value={classification}
              onChange={(e) => onUpdate(group.id, { classification: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
              <option value="GENERAL">Chung</option>
              <option value="WORK">Work</option>
              <option value="STUDY">Study</option>
            </select>
          </div>

      {/* Instructions */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> Hướng dẫn (tuỳ chọn)
        </label>
        <RichInput
          value={group.partInstruction ?? ''}
          placeholder='VD: In this part, the examiner asks you about yourself and familiar topics...'
          onChange={(html) => onUpdate(group.id, { partInstruction: html })}
        />
      </div>

      {/* Question list */}
      <div className="exam-spk-qlist" onClick={(e) => e.stopPropagation()}>
        {questions.map((q, i) => (
          <div key={q.id} className="exam-spk-qrow">
            <span className="exam-spk-qnum">Q{i + 1}</span>
            <RichInput
              value={q.questionText || q.text || ''}
              placeholder="Nhập câu hỏi của giám khảo..."
              onChange={(html) => updateQ(q.id, html)}
              className="exam-spk-rich-q"
            />
            <button className="exam-spk-qdel" title="Xóa câu hỏi"
              onClick={(e) => deleteQ(q.id, e)}><X size={12} /></button>
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="exam-spk-qadd" style={{ flex: 1 }} onClick={addQuestion}>
            <Plus size={12} /> Thêm câu hỏi
          </button>
          <button className="exam-spk-qadd" onClick={() => setShowImport(true)} title="Import danh sách câu hỏi">
            📋 Import
          </button>
        </div>
      </div>

      {showImport && (
        <div className="exam-import-modal" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000, width: '400px', border: '1px solid #e5e7eb'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Import danh sách câu hỏi</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Mỗi dòng là một câu hỏi</p>
          <textarea
            ref={importRef}
            rows={10}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}
            placeholder="VD:&#10;What do you do?&#10;Where are you from?&#10;Do you like your hometown?"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleImport} style={{
              flex: 1, padding: '8px 16px', backgroundColor: '#be185d', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Import</button>
            <button onClick={() => setShowImport(false)} style={{
              padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#4b5563',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Speaking Cue Card Block ----

export default SpeakingInterviewBlock;
