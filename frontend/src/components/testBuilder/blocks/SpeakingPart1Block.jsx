import React from 'react';
import { X, Plus, MessageCircle } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';

const SpeakingPart1Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const topics = group.topics ?? [{ id: `topic-${Date.now()}`, name: '', questions: [''] }];

  const addTopic = (e) => {
    e.stopPropagation();
    onUpdate(group.id, {
      topics: [...topics, { id: `topic-${Date.now()}`, name: '', questions: [''] }]
    });
  };

  const updateTopic = (topicId, field, value) => {
    onUpdate(group.id, {
      topics: topics.map(t => t.id === topicId ? { ...t, [field]: value } : t)
    });
  };

  const deleteTopic = (topicId, e) => {
    e.stopPropagation();
    if (topics.length > 1) {
      onUpdate(group.id, { topics: topics.filter(t => t.id !== topicId) });
    }
  };

  const addQuestion = (topicId, e) => {
    e.stopPropagation();
    onUpdate(group.id, {
      topics: topics.map(t => 
        t.id === topicId ? { ...t, questions: [...t.questions, ''] } : t
      )
    });
  };

  const updateQuestion = (topicId, qIdx, value) => {
    onUpdate(group.id, {
      topics: topics.map(t => 
        t.id === topicId 
          ? { ...t, questions: t.questions.map((q, i) => i === qIdx ? value : q) }
          : t
      )
    });
  };

  const deleteQuestion = (topicId, qIdx, e) => {
    e.stopPropagation();
    onUpdate(group.id, {
      topics: topics.map(t => 
        t.id === topicId && t.questions.length > 1
          ? { ...t, questions: t.questions.filter((_, i) => i !== qIdx) }
          : t
      )
    });
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-wt-section" onClick={(e) => e.stopPropagation()}>
        <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <MessageCircle size={14} /> Part 1 - Introduction & Interview
        </label>
        <RichInput
          value={group.partInstruction ?? ''}
          placeholder="The examiner asks you about yourself, your home, work or studies and other familiar topics..."
          onChange={(html) => onUpdate(group.id, { partInstruction: html })}
        />
      </div>

      {topics.map((topic, tIdx) => (
        <div key={topic.id} className="spk-topic-block" onClick={(e) => e.stopPropagation()}>
          <div className="spk-topic-header">
            <input
              type="text"
              className="spk-topic-name"
              value={topic.name}
              placeholder={`Topic ${tIdx + 1} (e.g., Work/Studies, Hometown, Hobbies)`}
              onChange={(e) => updateTopic(topic.id, 'name', e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {topics.length > 1 && (
              <button className="exam-spk-qdel" onClick={(e) => deleteTopic(topic.id, e)}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="exam-spk-qlist">
            {topic.questions.map((q, qIdx) => (
              <div key={qIdx} className="exam-spk-qrow">
                <span className="exam-spk-qnum">Q{qIdx + 1}</span>
                <RichInput
                  value={q}
                  placeholder="Enter question (e.g., What do you do? / Where are you from?)"
                  onChange={(html) => updateQuestion(topic.id, qIdx, html)}
                  className="exam-spk-rich-q"
                />
                {topic.questions.length > 1 && (
                  <button className="exam-spk-qdel" onClick={(e) => deleteQuestion(topic.id, qIdx, e)}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button className="exam-spk-qadd" onClick={(e) => addQuestion(topic.id, e)}>
              <Plus size={12} /> Add question
            </button>
          </div>
        </div>
      ))}

      <button className="exam-spk-qadd" style={{ marginTop: 12 }} onClick={addTopic}>
        <Plus size={14} /> Add topic
      </button>
    </div>
  );
};

export default SpeakingPart1Block;
