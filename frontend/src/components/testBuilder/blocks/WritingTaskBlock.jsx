import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown, ClipboardList, FileText } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import ImageUploadZone from './shared/ImageUploadZone';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const WritingTaskBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, testTitle, testId, module = 'WRITING' }) => {
  const handleFileUpload = (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    loadImageFile(file, (imageUrl) => onUpdate(group.id, { imageUrl }), module, testTitle, testId, 'WRITING_TASK');
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
        <ImageUploadZone
          imageUrl={group.imageUrl}
          onImageChange={(url) => onUpdate(group.id, { imageUrl: url })}
          onImageDelete={() => onUpdate(group.id, { imageUrl: '' })}
          placeholder="Nhập URL ảnh hoặc kéo thả/paste ảnh biểu đồ..."
          module="WRITING"
          testTitle={testTitle}
          assetLabel="WRITING_TASK"
          showPreview={true}
          compact={false}
        />
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
