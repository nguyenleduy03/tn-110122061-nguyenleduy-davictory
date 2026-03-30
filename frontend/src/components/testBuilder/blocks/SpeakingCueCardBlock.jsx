import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown, Mic, PenLine } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const SpeakingCueCardBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const bulletPoints = group.bulletPoints ?? ['', '', ''];

  const updateBullet = (i, val) => {
    const next = [...bulletPoints];
    next[i] = val;
    onUpdate(group.id, { bulletPoints: next });
  };

  const addBullet = (e) => {
    e.stopPropagation();
    onUpdate(group.id, { bulletPoints: [...bulletPoints, ''] });
  };

  const removeBullet = (i, e) => {
    e.stopPropagation();
    onUpdate(group.id, { bulletPoints: bulletPoints.filter((_, idx) => idx !== i) });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-spk-cc-card" onClick={(e) => e.stopPropagation()}>
        {/* Part Instruction */}
        <div className="exam-wt-section">
          <label className="exam-wt-label">Hướng dẫn Part (Part Instruction)</label>
          <RichInput
            multiline
            rows={2}
            value={group.partInstruction ?? ''}
            placeholder="VD: The examiner will give you a topic card. You will have 1 minute to prepare and make notes. Then you will speak for 1-2 minutes."
            onChange={(html) => onUpdate(group.id, { partInstruction: html })}
          />
        </div>

        {/* Topic */}
        <div className="exam-wt-section">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Mic size={14} /> Chủ đề / Câu hỏi chính (Topic)
          </label>
          <RichInput
            multiline
            rows={2}
            value={group.topic ?? ''}
            placeholder="VD: Describe a time when you helped someone."
            onChange={(html) => onUpdate(group.id, { topic: html })}
          />
        </div>

        {/* You should say */}
        <div className="exam-wt-section">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <PenLine size={14} /> Nhãn nhắc
          </label>
          <RichInput
            value={group.shouldSayLabel ?? 'You should say:'}
            onChange={(html) => onUpdate(group.id, { shouldSayLabel: html })}
          />
        </div>

        {/* Bullet points */}
        <div className="exam-spk-qlist">
          {bulletPoints.map((bp, i) => (
            <div key={i} className="exam-spk-qrow">
              <span className="exam-spk-qnum" style={{ fontSize: 16 }}>•</span>
              <RichInput
                style={{ flex: 1 }}
                value={bp}
                placeholder={`VD: who you helped`}
                onChange={(html) => updateBullet(i, html)}
              />
              <button className="exam-spk-qdel" onClick={(e) => removeBullet(i, e)}><X size={12} /></button>
            </div>
          ))}
          <button className="exam-spk-qadd" onClick={addBullet}>
            <Plus size={12} /> Thêm bullet
          </button>
        </div>

        {/* Closing sentence */}
        <div className="exam-wt-section" style={{ marginTop: 8 }}>
          <label className="exam-wt-label">Câu kết thúc (tuỳ chọn)</label>
          <RichInput
            value={group.closingSentence ?? ''}
            placeholder="VD: and explain how you felt about helping this person."
            onChange={(html) => onUpdate(group.id, { closingSentence: html })}
          />
        </div>

        {/* Prep time */}
        <div className="exam-wt-meta-row" style={{ marginTop: 8 }}>
          <div className="exam-wt-meta-field">
            <label className="exam-wt-label">⏱ Thời gian chuẩn bị (giây)</label>
            <input type="number" className="exam-q-range-input" style={{ width: 72 }}
              value={group.prepSeconds ?? 60} min={0} max={120}
              onChange={(e) => onUpdate(group.id, { prepSeconds: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Writing Task Block ----
// Dùng cho kỹ năng WRITING: Task 1 (biểu đồ/graph) hoặc Task 2 (luận điểm).

export default SpeakingCueCardBlock;
