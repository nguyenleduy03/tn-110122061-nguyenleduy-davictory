/**
 * ExamCanvas.jsx
 * WYSIWYG canvas — renders the exam exactly as students would see it,
 * with inline editing and drag-and-drop capabilities.
 * 
 * NOTE: Block components đã được tách ra thành các file riêng trong thư mục blocks/
 */
import React, { useState, useMemo, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Plus, X } from 'lucide-react';
import { normalizeRichHtml } from '../../utils/textFormatters';
import SharedOptionsDropdownBlock from './SharedOptionsDropdownBlock';

// Import tất cả block components
import {
  PassageBlock,
  AudioBlock,
  ImageBlock,
  MapLabellingBlock,
  TableCompletionBlock,
  DragMatchingBlock,
  MatchingFeaturesBlock,
  MatchingHeadingBlock,
  MultipleChoiceBlock,
  MultipleChoiceMultiBlock,
  TFNGBlock,
  SentenceCompletionBlock,
  ShortAnswerBlock,
  NoteCompletionBlock,
  ImageNoteFormBlock,
  SummaryCompletionBlock,
  FlowChartBlock,
  SpeakingInterviewBlock,
  SpeakingCueCardBlock,
  WritingTaskBlock,
  GroupToolbar,
  TYPE_META,
  toRoman,
  toPlainText,
  countBlankTokens,
  getQuestionWeight,
  getPartQuestionStartNumber,
  getNextQuestionNumber,
} from './blocks';
import MatchingFillBlock from './blocks/MatchingFillBlock';

// ---- Sortable wrapper ----
const SortableGroupWrapper = ({ group, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${group.id}`,
    data: { type: 'group', group, partId: group.partId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative' }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
};

// ---- Drop zone ----
const GroupDropZone = ({ partId, isOver, onAddGroup, part, paneType = 'part', label }) => {
  const { setNodeRef } = useDroppable({
    id: `canvas-drop-${partId}`,
    data: { type: paneType, partId: part?.id },
  });
  const defaultLabel = paneType === 'passage-pane'
    ? '+ Kéo "Reading Passage" vào đây'
    : '+ Kéo nhóm câu hỏi vào đây hoặc nhấn để thêm';
  return (
    <div ref={setNodeRef} className={`exam-group-drop${isOver ? ' is-over' : ''}`}
      onClick={(e) => { e.stopPropagation(); onAddGroup(part); }}>
      {isOver ? '↓ Thả xuống để thêm' : (label ?? defaultLabel)}
    </div>
  );
};

// ---- Question Item ----
const QuestionItem = ({ question, selected, onClick, onUpdate, onDelete }) => {
  const type = question.questionType?.typeName ?? question.questionType ?? 'FILL_IN_BLANK';
  return (
    <div className={`exam-question${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className="exam-q-num">{question.questionNumber ?? '?'}</div>
      <div className="exam-q-body">
        <input
          style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: 4 }}
          value={question.questionText || ''}
          placeholder="Nội dung câu hỏi..."
          onChange={(e) => onUpdate({ questionText: e.target.value })} />
        <button className="exam-q-del-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
      </div>
    </div>
  );
};

const QuestionList = ({ group, onUpdateGroup, onUpdateQuestion, onDeleteQuestion, onAddQuestion, onSelectQuestion, selectedQuestionId }) => (
  <>
    <div className="exam-q-range-header">
      Câu&nbsp;
      <input className="exam-q-range-input" value={group.fromQuestion ?? ''}
        placeholder="1"
        onChange={(e) => onUpdateGroup(group.id, { fromQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
      &nbsp;–&nbsp;
      <input className="exam-q-range-input" value={group.toQuestion ?? ''}
        placeholder="10"
        onChange={(e) => onUpdateGroup(group.id, { toQuestion: e.target.value ? Number(e.target.value) : null })}
        onClick={(e) => e.stopPropagation()} />
    </div>

    {(group.questions ?? []).map((q) => (
      <QuestionItem key={q.id} question={q}
        selected={selectedQuestionId === q.id}
        onClick={() => onSelectQuestion(q)}
        onUpdate={(upd) => onUpdateQuestion(group.id, q.id, upd)}
        onDelete={() => onDeleteQuestion(group.id, q.id)} />
    ))}

    <button className="exam-add-btn" onClick={(e) => { e.stopPropagation(); onAddQuestion(group); }}>
      <Plus size={12} /> Thêm câu hỏi
    </button>
  </>
);

const GroupRenderer = ({ group, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onMoveGroupUp, onMoveGroupDown, dragHandleProps, allGroups }) => {
  const selectedGroupId = selection?.type === 'group' ? selection.data.id : null;
  const selectedQuestionId = selection?.type === 'question' ? selection.data.id : null;
  const isSelected = selectedGroupId === group.id;

  const questionList = (
    <QuestionList group={group}
      onUpdateGroup={onUpdateGroup}
      onUpdateQuestion={onUpdateQuestion}
      onDeleteQuestion={onDeleteQuestion}
      onAddQuestion={onAddQuestion}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      selectedQuestionId={selectedQuestionId} />
  );

  const ct = group.contentType;

  if (ct === 'NOTE_COMPLETION') {
    return <NoteCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'IMAGE_NOTE_FORM') {
    return <ImageNoteFormBlock group={group} allGroups={allGroups} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MULTIPLE_CHOICE_GROUP') {
    return <MultipleChoiceBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MULTIPLE_CHOICE_MULTI') {
    return <MultipleChoiceMultiBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SHARED_OPTIONS_DROPDOWN') {
    return (
      <SharedOptionsDropdownBlock
        toolbar={(
          <GroupToolbar
            group={group}
            dragHandleProps={dragHandleProps}
            onDelete={onDeleteGroup}
            onMoveUp={onMoveGroupUp}
            onMoveDown={onMoveGroupDown}
          />
        )}
        group={group}
        onUpdate={onUpdateGroup}
        onSelect={(g) => onSelectGroup(g, g.partId)}
        selected={isSelected}
        onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
        onUpdateQuestion={onUpdateQuestion}
        onDeleteQuestion={onDeleteQuestion}
        onAddQuestion={onAddQuestion}
        selectedQuestionId={selectedQuestionId}
      />
    );
  }
  if (ct === 'TRUE_FALSE_NG') {
    return <TFNGBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SENTENCE_COMPLETION') {
    return <SentenceCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'SHORT_ANSWER_GROUP') {
    return <ShortAnswerBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'DRAG_MATCHING') {
    return <DragMatchingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MATCHING_FILLABLE' || ct === 'MATCHING_HEADINGS_FILLABLE') {
    return <MatchingFillBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MATCHING_FEATURES') {
    return <MatchingFeaturesBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'TABLE_COMPLETION') {
    return <TableCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MAP_LABELLING') {
    return <MapLabellingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'MATCHING_HEADING') {
    // Collect paragraphs only from READING_PASSAGE groups that have multi-paragraph mode enabled
    const passageParagraphs = (allGroups ?? [])
      .filter((g) => g.contentType === 'READING_PASSAGE' && g.multiParagraph)
      .flatMap((g) => g.paragraphs ?? []);
    return <MatchingHeadingBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId}
      passageParagraphs={passageParagraphs} />;
  }
  if (ct === 'SUMMARY_COMPLETION') {
    return <SummaryCompletionBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onSelectQuestion={(q) => onSelectQuestion(q, group.id)}
      onUpdateQuestion={onUpdateQuestion} onDeleteQuestion={onDeleteQuestion} onAddQuestion={onAddQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'FLOW_CHART') {
    return <FlowChartBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      onUpdateQuestion={onUpdateQuestion}
      selectedQuestionId={selectedQuestionId} />;
  }
  if (ct === 'WRITING_TASK') {
    return <WritingTaskBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_INTERVIEW') {
    return <SpeakingInterviewBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'SPEAKING_CUECARD') {
    return <SpeakingCueCardBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps} />;
  }
  if (ct === 'READING_PASSAGE') {
    // Collect heading bank + answers from all MATCHING_HEADING groups in this part
    const mhGroup = (allGroups ?? []).find((g) => g.contentType === 'MATCHING_HEADING');
    const mhHeadings = mhGroup?.headingBank ?? [];
    // Build map: paraLabel → heading text (from mhGroup.questions)
    const mhAnswersByLabel = {};
    (mhGroup?.questions ?? []).forEach((q) => {
      const label = (q.questionText || '').replace(/^Section\s*/i, '').trim();
      if (label && q.answerText) mhAnswersByLabel[label] = q.answerText;
    });
    return <PassageBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}
      mhHeadings={mhHeadings} mhAnswersByLabel={mhAnswersByLabel} />;
  }
  if (ct === 'AUDIO_TRANSCRIPT') {
    return <AudioBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}>
      {questionList}
    </AudioBlock>;
  }
  if (ct === 'DIAGRAM' || ct === 'MAP') {
    return <ImageBlock group={group} onUpdate={onUpdateGroup} onDelete={onDeleteGroup}
      onSelect={(g) => onSelectGroup(g, g.partId)} selected={isSelected} dragHandleProps={dragHandleProps}>
      {questionList}
    </ImageBlock>;
  }

  // STANDALONE / TABLE / default
  return (
    <div className={`exam-group${isSelected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelectGroup(group, group.partId); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDeleteGroup} onMoveUp={onMoveGroupUp} onMoveDown={onMoveGroupDown} />
      {ct === 'TABLE' && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '8px 12px', marginBottom: 10, background: '#f9fafb', fontSize: 13, color: '#888', textAlign: 'center' }}>
          Bảng — thêm nội dung bảng trong panel bên phải
        </div>
      )}
      {questionList}
    </div>
  );
};

const PartView = ({ skill, part, selection, onSelectGroup, onSelectQuestion, onUpdateGroup, onUpdateQuestion, onDeleteGroup, onDeleteQuestion, onAddQuestion, onAddGroup, onMoveGroupUp, onMoveGroupDown, isDropOver, isPassagePaneOver, isPassagePaneLocked, isMHLocked }) => {
  const groups = part.questionGroups ?? [];

  const renderGroup = (group) => (
    <SortableGroupWrapper key={group.id} group={{ ...group, partId: part.id }}>
      {({ dragHandleProps }) => (
        <GroupRenderer
          group={{ ...group, partId: part.id }}
          allGroups={groups}
          selection={selection}
          onSelectGroup={onSelectGroup}
          onSelectQuestion={onSelectQuestion}
          onUpdateGroup={onUpdateGroup}
          onUpdateQuestion={onUpdateQuestion}
          onDeleteGroup={onDeleteGroup}
          onDeleteQuestion={onDeleteQuestion}
          onAddQuestion={onAddQuestion}
          onMoveGroupUp={onMoveGroupUp}
          onMoveGroupDown={onMoveGroupDown}
          dragHandleProps={dragHandleProps} />
      )}
    </SortableGroupWrapper>
  );

  if (skill === 'READING') {
    const passages = groups.filter((g) => g.contentType === 'READING_PASSAGE');
    const qGroups  = groups.filter((g) => g.contentType !== 'READING_PASSAGE');
    return (
      <div className="exam-split">
        {/* LEFT: passage texts only */}
      <div className={`exam-pane passage${isPassagePaneLocked ? ' pane-locked' : ''}`}>
          {isPassagePaneLocked && (
            <div className="exam-pane-lock-overlay">Chỉ nhận <strong>Đoạn văn</strong></div>
          )}
          <SortableContext items={passages.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
            {passages.map(renderGroup)}
          </SortableContext>
          <GroupDropZone
            partId={`left-${part.id}`}
            isOver={isPassagePaneOver}
            onAddGroup={(p) => onAddGroup(p, 'READING_PASSAGE')}
            part={part}
            paneType="passage-pane"
          />
        </div>
        <div className="exam-pane-divider" />
        {/* RIGHT: question groups */}
        <div className={`exam-pane questions${isMHLocked ? ' pane-locked' : ''}`}>
          {isMHLocked && (
            <div className="exam-pane-lock-overlay">Cần bật <strong>chế độ đa đoạn</strong> ở Đoạn văn trước</div>
          )}
          <SortableContext items={qGroups.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
            {qGroups.map(renderGroup)}
          </SortableContext>
          <GroupDropZone
            partId={part.id}
            isOver={isDropOver}
            onAddGroup={onAddGroup}
            part={part}
            paneType="question-pane"
          />
        </div>
      </div>
    );
  }

  // Single-pane for Listening / Writing / Speaking
  return (
    <div className="exam-single">
      <SortableContext items={groups.map((g) => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
        {groups.map(renderGroup)}
      </SortableContext>
      <GroupDropZone partId={part.id} isOver={isDropOver} onAddGroup={onAddGroup} part={part} paneType="part" />
    </div>
  );
};

const ExamCanvas = ({
  skill,
  parts,
  selection,
  onSelectGroup,
  onSelectQuestion,
  onUpdateGroup,
  onUpdateQuestion,
  onDeleteGroup,
  onDeleteQuestion,
  onAddQuestion,
  onAddPart,
  onAddGroup,
  onMoveGroupUp,
  onMoveGroupDown,
  dragOverPartId,
  dragOverPassagePaneId,
  draggingContentType,
}) => {
  const [activePartId, setActivePartId] = useState(null);

  // Reset active part when skill changes
  useEffect(() => { setActivePartId(null); }, [skill]);

  const activePart = useMemo(() => {
    if (parts.length === 0) return null;
    return parts.find((p) => p.id === activePartId) ?? parts[0];
  }, [parts, activePartId]);

  if (parts.length === 0) {
    return (
      <div className="tb-canvas">
        <div className="tb-canvas-empty">
          <div className="tb-canvas-empty-icon"><FileText size={36} /></div>
          <h3>Chưa có Part nào</h3>
          <p>Nhấn nút bên dưới để bắt đầu tạo đề</p>
          <button className="exam-add-btn" style={{ marginTop: 8 }} onClick={onAddPart}>
            <Plus size={13} /> Thêm Part mới
          </button>
        </div>
      </div>
    );
  }

  const isDropOver = !!dragOverPartId && (
    dragOverPartId === `part-${activePart?.id}` ||
    dragOverPartId === `canvas-drop-${activePart?.id}`
  );

  const activePartInstructionText = toPlainText(activePart?.instructions);
  const activePartInstructionHtml = normalizeRichHtml(activePart?.instructions || '');

  // For Reading: passage pane highlights when dragging a READING_PASSAGE over the left pane
  const isPassagePaneOver = !!dragOverPassagePaneId && (
    dragOverPassagePaneId === `canvas-drop-left-${activePart?.id}`
  );
  // Locked = đang kéo một item KHÔNG phải READING_PASSAGE
  const isPassagePaneLocked = !!draggingContentType && draggingContentType !== 'READING_PASSAGE';
  // MH locked = đang kéo MATCHING_HEADING nhưng part chưa có READING_PASSAGE với multiParagraph
  const isMHLocked = draggingContentType === 'MATCHING_HEADING' && !(activePart?.questionGroups ?? []).some(
    (g) => g.contentType === 'READING_PASSAGE' && g.multiParagraph === true
  );

  return (
    <div className="tb-canvas" onClick={() => {}}>
      {/* Part tabs */}
      <div className="tb-part-tabs">
        {parts.map((p) => (
          <button key={p.id}
            className={`tb-part-tab${activePart?.id === p.id ? ' active' : ''}`}
            onClick={() => setActivePartId(p.id)}>
            {p.name || `Part ${p.orderIndex}`}
          </button>
        ))}
        <button className="tb-part-tab-add" title="Thêm Part mới" onClick={onAddPart}>+</button>
      </div>

      {/* Exam paper */}
      {activePart && (
        <div className="exam-viewport">
          {/* Mocked exam header */}
          <div className="exam-mock-header">
            <span className="exam-mock-logo">IELTS</span>
            <div className="exam-mock-info">
              <span>Nguyễn Văn A</span>
              <span style={{ color: '#ddd' }}>|</span>
              <span>ID: 12345678</span>
              <span style={{ color: '#ddd' }}>|</span>
              <span className="exam-mock-timer">60:00</span>
              <div className="exam-mock-nav">
                <button className="exam-mock-nav-btn">‹</button>
                <button className="exam-mock-nav-btn">›</button>
              </div>
            </div>
          </div>

          {/* Part instruction bar */}
          <div className="exam-instruction">
            <div><strong>{activePart.name}</strong></div>
            {activePartInstructionText && (
              <div style={{ marginTop: '4px' }} dangerouslySetInnerHTML={{ __html: activePartInstructionHtml }} />
            )}
            {!activePartInstructionText && (
              <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: '4px' }}>Chọn Part để thêm hướng dẫn</div>
            )}
          </div>

          {/* WYSIWYG content */}
          <div className="exam-body">
            <PartView
              skill={skill}
              part={activePart}
              selection={selection}
              onSelectGroup={onSelectGroup}
              onSelectQuestion={onSelectQuestion}
              onUpdateGroup={onUpdateGroup}
              onUpdateQuestion={onUpdateQuestion}
              onDeleteGroup={onDeleteGroup}
              onDeleteQuestion={onDeleteQuestion}
              onAddQuestion={onAddQuestion}
              onAddGroup={onAddGroup}
              onMoveGroupUp={onMoveGroupUp}
              onMoveGroupDown={onMoveGroupDown}
              isDropOver={isDropOver}
              isPassagePaneOver={isPassagePaneOver}
              isPassagePaneLocked={isPassagePaneLocked}
              isMHLocked={isMHLocked} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCanvas;
