import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown, ClipboardList, FileText } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const WritingTaskBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, testTitle }) => {
  const handleFileUpload = (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    loadImageFile(file, (imageUrl) => onUpdate(group.id, { imageUrl }), 'WRITING', testTitle);
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Task instructions / prompt */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> Đề bài / Hướng dẫn
        </label>
        <RichInput
          multiline
          rows={7}
          value={group.taskInstruction ?? ''}
          placeholder="VD: The bar chart below shows the percentage of households with Internet access in five countries.\n\nSummarise the information by selecting and reporting the main features and make comparisons where relevant.\n\nWrite at least 150 words."
          onChange={(html) => onUpdate(group.id, { taskInstruction: html })}
        />
      </div>

      {/* Image upload */}
      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Image size={14} /> Ảnh / Biểu đồ (tuỳ chọn)
        </label>
        <div className="exam-ml-upload-bar">
          <input
            className="exam-img-url-field"
            style={{ flex: 1, minWidth: 0 }}
            value={group.imageUrl?.startsWith('data:') ? '(ảnh đã tải lên)' : (group.imageUrl ?? '')}
            placeholder="Dán URL ảnh hoặc tải lên từ máy..."
            readOnly={group.imageUrl?.startsWith('data:')}
            onChange={(e) => onUpdate(group.id, { imageUrl: e.target.value })}
          />
          <label className="exam-ml-upload-btn">
            Tải lên
            <input type="file" accept="image/*" style={{ display: 'none' }} onClick={(e) => e.stopPropagation()} onChange={handleFileUpload} />
          </label>
          {group.imageUrl && (
            <button className="exam-group-tool-btn danger" title="Xóa ảnh"
              onClick={(e) => { e.stopPropagation(); onUpdate(group.id, { imageUrl: '' }); }}>
              <X size={12} />
            </button>
          )}
        </div>
        {group.imageUrl && (
          <img src={group.imageUrl} alt="writing task diagram"
            style={{ maxWidth: '100%', marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 4, display: 'block' }} />
        )}
      </div>

      {/* Min words + recommended time */}
      <div className="exam-wt-meta-row" onClick={(e) => e.stopPropagation()}>
        <div className="exam-wt-meta-field">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Số từ tối thiểu
          </label>
          <input
            type="number"
            className="exam-q-range-input"
            style={{ width: 72 }}
            value={group.minWords ?? 150}
            min={50}
            onChange={(e) => onUpdate(group.id, { minWords: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="exam-wt-meta-field">
          <label className="exam-wt-label">⏱ Thời gian (phút)</label>
          <input
            type="number"
            className="exam-q-range-input"
            style={{ width: 72 }}
            value={group.recommendedMinutes ?? 20}
            min={1}
            onChange={(e) => onUpdate(group.id, { recommendedMinutes: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
};


export default WritingTaskBlock;
