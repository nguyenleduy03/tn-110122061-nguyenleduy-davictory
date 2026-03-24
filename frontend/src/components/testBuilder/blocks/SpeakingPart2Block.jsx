import React from 'react';
import { X, Plus, Mic, Clock } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';

const SpeakingPart2Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const bulletPoints = group.bulletPoints ?? ['', '', ''];
  const followUpQuestions = group.followUpQuestions ?? [''];

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
    if (bulletPoints.length > 1) {
      onUpdate(group.id, { bulletPoints: bulletPoints.filter((_, idx) => idx !== i) });
    }
  };

  const addFollowUp = (e) => {
    e.stopPropagation();
    onUpdate(group.id, { followUpQuestions: [...followUpQuestions, ''] });
  };

  const updateFollowUp = (i, val) => {
    const next = [...followUpQuestions];
    next[i] = val;
    onUpdate(group.id, { followUpQuestions: next });
  };

  const removeFollowUp = (i, e) => {
    e.stopPropagation();
    if (followUpQuestions.length > 1) {
      onUpdate(group.id, { followUpQuestions: followUpQuestions.filter((_, idx) => idx !== i) });
    }
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />

      <div className="exam-spk-cc-card" onClick={(e) => e.stopPropagation()}>
        <div className="exam-wt-section">
          <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Mic size={14} /> Part 2 - Individual Long Turn
          </label>
        </div>

        <div className="exam-wt-section">
          <label className="exam-wt-label">Topic / Main Question</label>
          <RichInput
            multiline
            rows={2}
            value={group.topic ?? ''}
            placeholder="Describe a person who has influenced you / Describe a memorable journey you have made"
            onChange={(html) => onUpdate(group.id, { topic: html })}
          />
        </div>

        <div className="exam-wt-section">
          <label className="exam-wt-label">Prompt Label</label>
          <RichInput
            value={group.shouldSayLabel ?? 'You should say:'}
            onChange={(html) => onUpdate(group.id, { shouldSayLabel: html })}
          />
        </div>

        <div className="exam-spk-qlist">
          <label className="exam-wt-label" style={{ marginBottom: 8 }}>Bullet Points</label>
          {bulletPoints.map((bp, i) => (
            <div key={i} className="exam-spk-qrow">
              <span className="exam-spk-qnum" style={{ fontSize: 16 }}>•</span>
              <RichInput
                style={{ flex: 1 }}
                value={bp}
                placeholder="who this person is / what they did"
                onChange={(html) => updateBullet(i, html)}
              />
              {bulletPoints.length > 1 && (
                <button className="exam-spk-qdel" onClick={(e) => removeBullet(i, e)}>
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button className="exam-spk-qadd" onClick={addBullet}>
            <Plus size={12} /> Add bullet
          </button>
        </div>

        <div className="exam-wt-section">
          <label className="exam-wt-label">Closing Sentence</label>
          <RichInput
            value={group.closingSentence ?? ''}
            placeholder="and explain why this person has influenced you / how you felt about this journey"
            onChange={(html) => onUpdate(group.id, { closingSentence: html })}
          />
        </div>

        <div className="exam-wt-meta-row" style={{ gap: 16 }}>
          <div className="exam-wt-meta-field">
            <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> Prep time (sec)
            </label>
            <input type="number" className="exam-q-range-input" style={{ width: 72 }}
              value={group.prepSeconds ?? 60} min={0} max={120}
              onChange={(e) => onUpdate(group.id, { prepSeconds: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="exam-wt-meta-field">
            <label className="exam-wt-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Mic size={12} /> Speaking time (sec)
            </label>
            <input type="number" className="exam-q-range-input" style={{ width: 72 }}
              value={group.speakingSeconds ?? 120} min={60} max={180}
              onChange={(e) => onUpdate(group.id, { speakingSeconds: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()} />
          </div>
        </div>

        <div className="exam-wt-section" style={{ marginTop: 16 }}>
          <label className="exam-wt-label">Follow-up Questions (Rounding off)</label>
          <div className="exam-spk-qlist">
            {followUpQuestions.map((q, i) => (
              <div key={i} className="exam-spk-qrow">
                <span className="exam-spk-qnum">Q{i + 1}</span>
                <RichInput
                  value={q}
                  placeholder="Do you still keep in touch with this person? / Would you like to go there again?"
                  onChange={(html) => updateFollowUp(i, html)}
                  className="exam-spk-rich-q"
                />
                {followUpQuestions.length > 1 && (
                  <button className="exam-spk-qdel" onClick={(e) => removeFollowUp(i, e)}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button className="exam-spk-qadd" onClick={addFollowUp}>
              <Plus size={12} /> Add follow-up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingPart2Block;
