import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import ImageUploadZone from './shared/ImageUploadZone';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const PassageBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, mhHeadings = [], mhAnswersByLabel = {}, testTitle, testId, module = 'READING' }) => {
  const [draggingOverPara, setDraggingOverPara] = useState(null);
  const [pendingImagePara, setPendingImagePara] = useState(null);
  const fileInputRefs = useRef({});

  const isMulti = !!group.multiParagraph;

  const paragraphs = group.paragraphs && group.paragraphs.length > 0
    ? group.paragraphs
    : [{ id: `${group.id}-p0`, label: 'A', text: group.passageText || '' }];

  const PARA_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const updateParagraphs = (newParas) => {
    const labeled = newParas.map((p, i) => ({ ...p, label: PARA_LABELS[i] ?? String(i + 1) }));
    onUpdate(group.id, { paragraphs: labeled, passageText: labeled.map((p) => p.text).join('\n\n') });
  };

  const enableMulti = () => {
    // Giữ lại đoạn hiện tại, chỉ bật multi mode
    const labeled = paragraphs.map((p, i) => ({ ...p, label: PARA_LABELS[i] ?? String(i + 1) }));
    onUpdate(group.id, { multiParagraph: true, paragraphs: labeled });
  };

  const addParagraph = () => {
    const newId = `${group.id}-p${Date.now()}`;
    updateParagraphs([...paragraphs, { id: newId, label: '', text: '' }]);
  };

  const removeParagraph = (pid) => {
    if (paragraphs.length <= 1) return;
    updateParagraphs(paragraphs.filter((p) => p.id !== pid));
  };

  const updateParaImage = (pid, imageUrl) => {
    updateParagraphs(paragraphs.map((p) => p.id === pid ? { ...p, imageUrl } : p));
  };

  const applyImageFile = (pid, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    loadImageFile(file, (imageUrl) => updateParaImage(pid, imageUrl), module, testTitle, testId, 'READING_PASSAGE');
  };

  // Accept both: sidebar palette drag AND direct image file drag from OS
  const isParaImageDrag = (e) => {
    const types = e.dataTransfer.types;
    if (types.includes('application/para-image')) return true;
    if (types.includes('Files')) {
      const items = e.dataTransfer.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type.startsWith('image/')) return true;
        }
      }
      return true;
    }
    return false;
  };

  const handleParaDragOver = (pid, e) => {
    if (!isParaImageDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDraggingOverPara(pid);
  };

  const handleParaDragLeave = (pid, e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDraggingOverPara(null);
    }
  };

  const handleParaDrop = (pid, e) => {
    if (!isParaImageDrag(e)) return;
    e.preventDefault();
    setDraggingOverPara(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      applyImageFile(pid, file);
    } else {
      setPendingImagePara(pid);
    }
  };

  // Render a single paragraph body (image + text)
  const renderParaBody = (para, idx) => (
    <>
      {para.imageUrl && (
        <div className="passage-para-img-wrap">
          <ImageUploadZone
            imageUrl={para.imageUrl}
            onImageChange={(url) => updateParaImage(para.id, url)}
            onImageDelete={() => updateParaImage(para.id, null)}
            placeholder="URL ảnh đoạn văn..."
            module={module}
            testTitle={testTitle}
            testId={testId}
            assetLabel="READING_PASSAGE"
            showPreview={true}
            compact={true}
          />
        </div>
      )}
      {draggingOverPara === para.id && (
        <div className="passage-para-drop-hint">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Image size={13} />
            Thả để thêm ảnh{isMulti ? ` vào đoạn ${PARA_LABELS[idx]}` : ''}
          </span>
        </div>
      )}
      {pendingImagePara === para.id && !para.imageUrl && (
        <div className="passage-para-img-pick"
          onClick={(e) => { e.stopPropagation(); fileInputRefs.current[para.id]?.click(); }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><Image size={14} /></span>
          <span>Click để chọn ảnh{isMulti ? ` cho đoạn ${PARA_LABELS[idx]}` : ''}</span>
          <button className="passage-para-img-pick-cancel"
            onClick={(e) => { e.stopPropagation(); setPendingImagePara(null); }}
            title="Bỏ qua">✕</button>
        </div>
      )}
      <input
        ref={(el) => { fileInputRefs.current[para.id] = el; }}
        type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => {
          applyImageFile(para.id, e.target.files?.[0]);
          setPendingImagePara(null);
          e.target.value = '';
        }}
      />
      <RichInput
        value={para.text || ''}
        placeholder={isMulti ? `Nội dung đoạn ${PARA_LABELS[idx] ?? idx + 1}...` : 'Nội dung đoạn văn...'}
        onChange={(html) => updateParagraphs(paragraphs.map((p) => p.id === para.id ? { ...p, text: html } : p))}
        style={{ marginTop: 4 }}
        multiline
      />
    </>
  );

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Passage title */}
      <RichInput
        value={group.title || ''}
        placeholder="Tiêu đề bài đọc (VD: The Physics of Traffic Behavior)..."
        onChange={(html) => onUpdate(group.id, { title: html })}
        style={{ marginBottom: 8 }}
        className="exam-passage-title-wrap"
      />

      {/* SIMPLE mode: 1 đoạn, không label */}
      {!isMulti && (
        <div
          className={`passage-para${draggingOverPara === paragraphs[0]?.id ? ' para-img-drag-over' : ''}`}
          onDragOver={(e) => handleParaDragOver(paragraphs[0]?.id, e)}
          onDragLeave={(e) => handleParaDragLeave(paragraphs[0]?.id, e)}
          onDrop={(e) => handleParaDrop(paragraphs[0]?.id, e)}
        >
          {renderParaBody(paragraphs[0], 0)}
        </div>
      )}

      {/* MULTI mode: nhiều đoạn với label A/B/C */}
      {isMulti && paragraphs.map((para, idx) => (
        <div
          key={para.id}
          className={`passage-para${draggingOverPara === para.id ? ' para-img-drag-over' : ''}`}
          onDragOver={(e) => handleParaDragOver(para.id, e)}
          onDragLeave={(e) => handleParaDragLeave(para.id, e)}
          onDrop={(e) => handleParaDrop(para.id, e)}
        >
          <div className="passage-para-header">
            <span className="passage-para-label">{PARA_LABELS[idx] ?? idx + 1}</span>
            {/* Heading đã gán — hiện nếu có MatchingHeading group */}
            {isMulti && mhHeadings.length > 0 && (() => {
              const assignedText = mhAnswersByLabel[PARA_LABELS[idx]];
              const hIdx = mhHeadings.findIndex((h) => h.text === assignedText);
              return assignedText ? (
                <span className="passage-para-mh-badge" title={assignedText}>
                  {hIdx >= 0 ? toRoman(hIdx + 1) + '. ' : ''}{assignedText}
                </span>
              ) : (
                <span className="passage-para-mh-empty">— chưa gán heading —</span>
              );
            })()}
            {paragraphs.length > 1 && (
              <button className="exam-group-tool-btn danger" style={{ flexShrink: 0, marginLeft: 'auto' }}
                onClick={(e) => { e.stopPropagation(); removeParagraph(para.id); }}
                title="Xóa đoạn này">
                <X size={11} />
              </button>
            )}
          </div>
          {renderParaBody(para, idx)}
        </div>
      ))}

      {/* Footer buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!isMulti && (
          <button className="exam-add-btn" style={{ borderColor: '#f59e0b', color: '#92400e', background: '#fffbeb' }}
            onClick={(e) => { e.stopPropagation(); enableMulti(); }}>
            <Plus size={12} /> Thêm heading
          </button>
        )}
        {isMulti && (
          <button className="exam-add-btn"
            onClick={(e) => { e.stopPropagation(); addParagraph(); }}>
            <Plus size={12} /> Thêm đoạn
          </button>
        )}
      </div>
    </div>
  );
};


export default PassageBlock;
