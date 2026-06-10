import React from 'react';
import { X, Plus, Mic, Clock } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';

const SpeakingPart2Block = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps }) => {
  const bulletPoints = group.bulletPoints ?? ['', '', ''];
  const followUpQuestions = group.followUpQuestions ?? [''];

  const [importTarget, setImportTarget] = React.useState(null); // 'bullet' | 'followup'
  const importRef = React.useRef(null);

  const updateBullet = (i, val) => {
    const next = [...bulletPoints];
    next[i] = val;
    onUpdate(group.id, { bulletPoints: next });
  };

  const addBullet = (e) => {
    e.stopPropagation();
    onUpdate(group.id, { bulletPoints: [...bulletPoints, ''] });
  };

  const handleImport = () => {
    const text = importRef.current?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      setImportTarget(null);
      return;
    }

    if (importTarget === 'bullet') {
      onUpdate(group.id, {
        bulletPoints: [...bulletPoints.filter(b => b.trim()), ...lines],
      });
    } else {
      onUpdate(group.id, {
        followUpQuestions: [...followUpQuestions.filter(q => q.trim()), ...lines],
      });
    }
    setImportTarget(null);
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

        {/* Part Instruction */}
        <div className="exam-wt-section">
          <label className="exam-wt-label">Part Instruction</label>
          <RichInput
            multiline
            rows={2}
            value={group.partInstruction ?? ''}
            placeholder="The examiner will give you a topic card. You will have 1 minute to prepare and make notes. Then you will speak for 1-2 minutes."
            onChange={(html) => onUpdate(group.id, { partInstruction: html })}
          />
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
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="exam-spk-qadd" style={{ flex: 1 }} onClick={addBullet}>
              <Plus size={12} /> Add bullet
            </button>
            <button className="exam-spk-qadd" onClick={() => setImportTarget('bullet')} title="Import bullet points">
              📋 Import
            </button>
          </div>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="exam-spk-qadd" style={{ flex: 1 }} onClick={addFollowUp}>
                <Plus size={12} /> Add follow-up
              </button>
              <button className="exam-spk-qadd" onClick={() => setImportTarget('followup')} title="Import follow-up questions">
                📋 Import
              </button>
            </div>
          </div>
        </div>
      </div>

      {importTarget && (
        <div className="exam-import-modal" style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000, width: '400px', border: '1px solid #e5e7eb'
        }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Import {importTarget === 'bullet' ? 'Bullet Points' : 'Follow-up Questions'}
          </h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Mỗi dòng là một mục</p>
          <textarea
            ref={importRef}
            rows={10}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}
            placeholder={importTarget === 'bullet' ? 'VD:&#10;who this person is&#10;what they did' : 'VD:&#10;Do you still keep in touch?&#10;Would you like to see them again?'}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleImport} style={{
              flex: 1, padding: '8px 16px', backgroundColor: '#7e22ce', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Import</button>
            <button onClick={() => setImportTarget(null)} style={{
              padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#4b5563',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
            }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingPart2Block;
