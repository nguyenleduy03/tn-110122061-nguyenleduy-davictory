import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import ImageUploadZone from './shared/ImageUploadZone';
import { serializeContentEditableHtml } from '../../../utils/textFormatters';
import { resolveDrivePreviewUrl } from '../../../utils/mediaUrl';
import { toRoman, loadImageFile, toPlainText, getNextQuestionNumber, getPartQuestionStartNumber, getQuestionWeight } from './shared/blockHelpers';
import {
  IMAGE_NOTE_SECTIONS,
  countBlankTokens,
  isImagePinQuestion,
  isNoteBlankQuestion,
  getImageNoteFormOrderedQuestions,
  getImageNoteFormDisplayNumberMap,
  normalizeImageNoteFormQuestions,
} from '../../../utils/imageNoteForm';

// Bulk Answer Import Component
const BulkAnswerImport = ({ questions, onImport }) => {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');

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
        📋 Import hàng loạt đáp án
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

const ImageNoteFormBlock = ({ group, allGroups = [], onUpdate, onDelete, onSelect, selected, dragHandleProps, testTitle, testId, module = 'READING', onSelectQuestion, onUpdateQuestion, onDeleteQuestion, onAddQuestion, selectedQuestionId }) => {
  const containerRef = useRef(null);
  const imageWrapRef = useRef(null);
  const dragRef = useRef(null);
  const [livePin, setLivePin] = useState(null);
  const imagePosition = group.imagePosition || 'middle';
  const imageWidth = group.imageWidth || 100;
  const pinBoxWidth = group.pinBoxWidth || 60;
  const questions = group.questions ?? [];
  const topNoteText = group.topNoteText ?? (group.imagePosition === 'bottom' ? '' : (group.noteText || ''));
  const bottomNoteText = group.bottomNoteText ?? (group.imagePosition === 'bottom' ? (group.noteText || '') : '');
  const baseNumber = getPartQuestionStartNumber(group, allGroups);

  const orderedQuestions = getImageNoteFormOrderedQuestions(group);
  const displayNumberById = getImageNoteFormDisplayNumberMap({ ...group, fromQuestion: baseNumber });

  // Helper: Tạo note-blank question mới
  const createNoteBlankQuestion = () => ({
    id: Date.now() + Math.random() * 1000,
    groupId: group.id,
    questionNumber: getNextQuestionNumber(questions),
    questionText: '',
    answerText: '',
    questionMode: 'note-blank', // QUAN TRỌNG: Đánh dấu rõ ràng
    questionType: { typeName: 'FILL_IN_BLANK' },
  });

  const getImageRect = () => imageWrapRef.current?.getBoundingClientRect() || null;

  // Tự động sắp xếp lại số câu hỏi theo thứ tự hiển thị (ảnh trên/dưới)
  useEffect(() => {
    if (questions.length === 0) return;

    const reordered = normalizeImageNoteFormQuestions({
      ...group,
      fromQuestion: baseNumber,
      questions: orderedQuestions.map((q, idx) => ({
        ...q,
        questionNumber: baseNumber + idx,
        orderIndex: idx + 1,
      })),
    }).questions;

    const nextToQuestion = reordered.length > 0 ? baseNumber + reordered.length - 1 : group.toQuestion;
    const needsReorder = orderedQuestions.some((q, idx) => q.questionNumber !== baseNumber + idx)
      || reordered.some((q, idx) => q.questionNumber !== baseNumber + idx)
      || group.toQuestion !== nextToQuestion;

    if (needsReorder) {
      onUpdate(group.id, {
        fromQuestion: baseNumber,
        questions: reordered,
        toQuestion: nextToQuestion,
      });
    }
  }, [questions, imagePosition, baseNumber, orderedQuestions, group, onUpdate]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { origX, origY, startCX, startCY } = dragRef.current;
      const rect = getImageRect();
      if (!rect) return;
      const newX = Math.max(0, Math.min(92, origX + (e.clientX - startCX) / rect.width * 100));
      const newY = Math.max(0, Math.min(92, origY + (e.clientY - startCY) / rect.height * 100));
      setLivePin({ qId: dragRef.current.qId, x: newX, y: newY });
    };
    const onUp = (e) => {
      if (!dragRef.current) return;
      const { qId, origX, origY, startCX, startCY } = dragRef.current;
      const rect = getImageRect();
      if (!rect) return;
      const newX = Math.max(0, Math.min(92, origX + (e.clientX - startCX) / rect.width * 100));
      const newY = Math.max(0, Math.min(92, origY + (e.clientY - startCY) / rect.height * 100));
      onUpdateQuestion(group.id, qId, { pinX: newX, pinY: newY });
      dragRef.current = null;
      setLivePin(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [group.id, onUpdateQuestion]);

  const addPin = (e) => {
    if (!group.imageUrl) return;
    if (dragRef.current) return;
    const rect = getImageRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const maxQuestionNumber = getNextQuestionNumber(questions) - 1;
    
    const newQ = {
      id: Date.now(),
      groupId: group.id,
      questionNumber: maxQuestionNumber + 1,
      questionText: '',
      answerText: '',
      pinX: Math.max(0, Math.min(92, x)),
      pinY: Math.max(0, Math.min(92, y)),
      questionMode: 'image-pin',
      questionSection: IMAGE_NOTE_SECTIONS.IMAGE,
      questionType: { typeName: 'FILL_IN_BLANK' },
    };
    onUpdate(group.id, { fromQuestion: baseNumber, questions: [...questions, newQ] });
  };

  const syncNoteText = (nextTopText, nextBottomText) => {
    const combined = [nextTopText, nextBottomText].filter(Boolean).join('\n\n');
    onUpdate(group.id, {
      noteText: combined,
      topNoteText: nextTopText,
      bottomNoteText: nextBottomText,
    });
  };

  const insertQuestionsForSection = (newQuestions, section) => {
    const questionSection = section === 'bottom'
      ? IMAGE_NOTE_SECTIONS.BOTTOM
      : IMAGE_NOTE_SECTIONS.TOP;

    return [
      ...questions,
      ...newQuestions.map((q) => ({
        ...q,
        questionSection,
      })),
    ];
  };

  const createBlankQuestionForSection = (section) => ({
    id: Date.now() + Math.random() * 1000,
    groupId: group.id,
    questionNumber: getNextQuestionNumber(questions),
    questionText: '',
    answerText: '',
    questionMode: 'note-blank',
    questionSection: section,
    questionType: { typeName: 'FILL_IN_BLANK' },
  });

  const resizeSectionQuestions = (sectionQuestions, desiredCount, section) => {
    const nextQuestions = sectionQuestions
      .slice(0, desiredCount)
      .map((q) => ({
        ...q,
        questionSection: section,
      }));

    while (nextQuestions.length < desiredCount) {
      nextQuestions.push(createBlankQuestionForSection(section));
    }

    return nextQuestions;
  };

  const getSectionBuckets = () => {
    const hasExplicitSections = questions.some((q) => q?.questionSection);
    const imagePinsNow = questions.filter(isImagePinQuestion);

    if (hasExplicitSections) {
      return {
        top: questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.TOP),
        image: questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.IMAGE || isImagePinQuestion(q)),
        bottom: questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.BOTTOM),
      };
    }

    const noteQuestions = questions.filter(isNoteBlankQuestion);
    if (imagePosition === 'top') {
      return { top: noteQuestions, image: imagePinsNow, bottom: [] };
    }

    if (imagePosition === 'bottom') {
      return { top: [], image: imagePinsNow, bottom: noteQuestions };
    }

    const currentTopCount = countBlankTokens(topNoteText);
    return {
      top: noteQuestions.slice(0, currentTopCount),
      image: imagePinsNow,
      bottom: noteQuestions.slice(currentTopCount),
    };
  };

  const applySectionedNoteChanges = ({ nextTopCount, nextBottomCount }) => {
    const { top, image, bottom } = getSectionBuckets();
    let nextQuestions;

    if (imagePosition === 'top') {
      nextQuestions = [
        ...resizeSectionQuestions(top, nextTopCount, IMAGE_NOTE_SECTIONS.TOP),
        ...image,
      ];
    } else if (imagePosition === 'bottom') {
      nextQuestions = [
        ...image,
        ...resizeSectionQuestions(bottom, nextBottomCount, IMAGE_NOTE_SECTIONS.BOTTOM),
      ];
    } else {
      nextQuestions = [
        ...resizeSectionQuestions(top, nextTopCount, IMAGE_NOTE_SECTIONS.TOP),
        ...image,
        ...resizeSectionQuestions(bottom, nextBottomCount, IMAGE_NOTE_SECTIONS.BOTTOM),
      ];
    }

    const normalized = normalizeImageNoteFormQuestions({
      ...group,
      fromQuestion: baseNumber,
      questions: nextQuestions,
    }).questions;

    onUpdate(group.id, {
      fromQuestion: baseNumber,
      questions: normalized,
      toQuestion: normalized.length > 0 ? baseNumber + normalized.length - 1 : group.toQuestion,
    });
  };

  const handleFileUpload = (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    loadImageFile(file, (imageUrl) => onUpdate(group.id, { imageUrl }), module, testTitle, testId, 'IMAGE_NOTE_FORM');
  };

  const imageSection = (
    <div style={{ marginBottom: 16 }}>
      <ImageUploadZone
        imageUrl={group.imageUrl}
        onImageChange={(url) => onUpdate(group.id, { imageUrl: url })}
        onImageDelete={() => onUpdate(group.id, { imageUrl: '' })}
        placeholder="Nhập URL hoặc kéo thả/paste ảnh..."
        module={module}
        testTitle={testTitle}
        testId={testId}
        assetLabel="IMAGE_NOTE_FORM"
        showPreview={true}
        compact={false}
      />
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={imagePosition === 'top'} onChange={() => onUpdate(group.id, { imagePosition: 'top' })} />
          Ảnh trên
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={imagePosition === 'middle'} onChange={() => onUpdate(group.id, { imagePosition: 'middle' })} />
          Ảnh giữa
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={imagePosition === 'bottom'} onChange={() => onUpdate(group.id, { imagePosition: 'bottom' })} />
          Ảnh dưới
        </label>
        <label style={{ marginLeft: 'auto' }}>
          Rộng ảnh: <strong>{imageWidth}%</strong>
          <input type="range" min={50} max={100} value={imageWidth} 
            onChange={(e) => onUpdate(group.id, { imageWidth: Number(e.target.value) })}
            style={{ marginLeft: 4, width: 80 }} />
        </label>
        <label>
          Cỡ ô: <strong>{pinBoxWidth}px</strong>
          <input type="range" min={30} max={120} value={pinBoxWidth} 
            onChange={(e) => onUpdate(group.id, { pinBoxWidth: Number(e.target.value) })}
            style={{ marginLeft: 4, width: 80 }} />
        </label>
      </div>
      
      {/* Image canvas with pins */}
      <div ref={containerRef} className="exam-ml-container"
        style={{ cursor: group.imageUrl ? 'default' : 'default' }}>
        {group.imageUrl ? (
          <div ref={imageWrapRef}
            style={{ position: 'relative', width: `${imageWidth}%`, margin: '0 auto', cursor: 'crosshair' }}
            onClick={addPin}>
            <img src={resolveDrivePreviewUrl(group.imageUrl)} alt="Question" draggable={false}
              style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} />
            {questions.filter(isImagePinQuestion).map((q) => {
              const displayNumber = displayNumberById.get(q.id) ?? q.questionNumber;
              const x = livePin?.qId === q.id ? livePin.x : (q.pinX ?? 10);
              const y = livePin?.qId === q.id ? livePin.y : (q.pinY ?? 10);
              return (
                <div key={q.id}
                  style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    minWidth: `${pinBoxWidth}px`,
                    background: selectedQuestionId === q.id ? '#3b82f6' : '#fff',
                    color: selectedQuestionId === q.id ? '#fff' : '#000',
                    border: '2px solid #3b82f6',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 13,
                    fontWeight: 'bold',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    dragRef.current = { qId: q.id, origX: q.pinX ?? 10, origY: q.pinY ?? 10, startCX: e.clientX, startCY: e.clientY };
                  }}
                  onClick={(e) => { e.stopPropagation(); onSelectQuestion(q); }}>
                  <span style={{ minWidth: 20, textAlign: 'center' }}>{displayNumber}</span>
                  {q.questionText && (
                    <span style={{ fontSize: 12, fontWeight: 'normal' }}>{q.questionText}:</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 'normal' }}>____</span>
                  <button
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onDeleteQuestion(group.id, q.id); }}>×</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="exam-ml-empty">
            Tải ảnh lên, sau đó nhấn vào ảnh để thêm ô đánh số
          </div>
        )}
      </div>
      {group.imageUrl && (
        <div className="exam-ml-hint" style={{ textAlign: 'center' }}>
          ↑ Nhấn vào ảnh để thêm ô · Kéo ô để di chuyển · × để xóa
        </div>
      )}
    </div>
  );

  const renderNoteEditor = (value, onChange, placeholder, startNumber) => (
    <RichBlankEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      preWrap
      blankClass="rbe-blank-amber"
      startNumber={startNumber}
    />
  );

  const topEditor = imagePosition === 'top' || imagePosition === 'middle';
  const bottomEditor = imagePosition === 'bottom' || imagePosition === 'middle';
  const topEditorStart = baseNumber;
  const topSectionCount = orderedQuestions.filter((q) => q.questionSection === IMAGE_NOTE_SECTIONS.TOP).length;
  const imageSectionCount = orderedQuestions.filter((q) => q.questionSection === IMAGE_NOTE_SECTIONS.IMAGE).length;
  const bottomEditorStart = imagePosition === 'middle'
    ? baseNumber + topSectionCount + imageSectionCount
    : baseNumber + imageSectionCount;

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      {/* Instructions */}
      <div style={{ marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>
          Hướng dẫn:
        </label>
        <RichInput
          multiline
          rows={2}
          value={group.instructions || ''}
          placeholder="Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer."
          onChange={(html) => onUpdate(group.id, { instructions: html })}
        />
      </div>

      {/* Title */}
      <div contentEditable suppressContentEditableWarning className="exam-note-form-title"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
          onInput={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
          onBlur={(e) => onUpdate(group.id, { title: serializeContentEditableHtml(e.currentTarget) })}
        data-placeholder="Tiêu đề (VD: House Plan)"
        dangerouslySetInnerHTML={{ __html: group.title || '' }}
      />

      {imagePosition === 'top' && imageSection}
      {imagePosition === 'top' && topEditor && renderNoteEditor(
        topNoteText,
        (text) => {
          syncNoteText(text, '');

          setTimeout(() => {
            applySectionedNoteChanges({
              nextTopCount: countBlankTokens(text),
              nextBottomCount: 0,
            });
          }, 100);
        },
        'VD:\nGround Floor:\n- Living room: (ô trống) square meters\n- Kitchen: Located in the (ô trống)',
        topEditorStart
      )}

      {imagePosition === 'middle' && topEditor && renderNoteEditor(
        topNoteText,
        (text) => {
          syncNoteText(text, bottomNoteText);

          setTimeout(() => {
            applySectionedNoteChanges({
              nextTopCount: countBlankTokens(text),
              nextBottomCount: countBlankTokens(bottomNoteText),
            });
          }, 100);
        },
        'VD:\nGround Floor:\n- Living room: (ô trống) square meters\n- Kitchen: Located in the (ô trống)',
        topEditorStart
      )}

      {imagePosition === 'middle' && imageSection}

      {imagePosition === 'middle' && bottomEditor && renderNoteEditor(
        bottomNoteText,
        (text) => {
          syncNoteText(topNoteText, text);

          setTimeout(() => {
            applySectionedNoteChanges({
              nextTopCount: countBlankTokens(topNoteText),
              nextBottomCount: countBlankTokens(text),
            });
          }, 100);
        },
        'VD:\n- First floor: (ô trống) rooms\n- Balcony: (ô trống) overlooking the garden',
        bottomEditorStart
      )}

      {imagePosition === 'bottom' && bottomEditor && renderNoteEditor(
        bottomNoteText,
        (text) => {
          syncNoteText('', text);

          setTimeout(() => {
            applySectionedNoteChanges({
              nextTopCount: 0,
              nextBottomCount: countBlankTokens(text),
            });
          }, 100);
        },
        'VD:\n- First floor: (ô trống) rooms\n- Balcony: (ô trống) overlooking the garden',
        bottomEditorStart
      )}

      {imagePosition === 'bottom' && imageSection}

      <div className="exam-q-range-header" style={{ marginTop: 12 }}>
        Câu&nbsp;
        <input className="exam-q-range-input" value={group.fromQuestion ?? ''} placeholder="1" onChange={(e) => onUpdate(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
        &nbsp;–&nbsp;
        <input className="exam-q-range-input" value={group.toQuestion ?? ''} placeholder="5" onChange={(e) => onUpdate(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })} onClick={(e) => e.stopPropagation()} />
      </div>

      {/* Answer key section */}
      {questions.length > 0 && (
        <div className="exam-ml-answer-section" onClick={(e) => e.stopPropagation()}>
          <div className="exam-ml-answer-title">🔑 Đáp án (theo thứ tự câu hỏi)</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic' }}>
            💡 Dùng | để tách nhiều đáp án đúng (vd: 1|one)
          </div>
          <BulkAnswerImport questions={questions} onImport={(answers) => {
            // Xóa câu rỗng trước khi import
            const nonEmptyQuestions = orderedQuestions.filter(q => q.answerText?.trim());
            let finalQuestions = [...nonEmptyQuestions];
            
            // Update hoặc tạo mới
            answers.forEach((ans, idx) => {
              if (finalQuestions[idx]) {
                finalQuestions[idx] = { ...finalQuestions[idx], answerText: ans };
              } else {
                finalQuestions.push({
                  id: Date.now() + idx,
                  questionNumber: baseNumber + idx,
                  answerText: ans,
                  pinX: 10,
                  pinY: 10
                });
              }
            });
            
            onUpdate(group.id, { questions: finalQuestions });
          }} />
          {(() => {
            return orderedQuestions.map((q) => (
              (() => {
                const displayNumber = displayNumberById.get(q.id) ?? q.questionNumber;
                return (
              <div key={q.id} className="exam-ml-answer-row">
                <span className="exam-ml-answer-num">Câu {displayNumber}</span>
                <input
                  style={{ flex: 1, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
                  value={q.answerText ?? ''}
                  placeholder="Đáp án đúng (vd: 1|one)..."
                  onChange={(e) => onUpdateQuestion(group.id, q.id, { answerText: e.target.value })} />
              </div>
                );
              })()
            ));
          })()}
        </div>
      )}

      <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
        <Plus size={12} /> Thêm ô trống (cho note text)
      </button>
    </div>
  );
};

export default ImageNoteFormBlock;
