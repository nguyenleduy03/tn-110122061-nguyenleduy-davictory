import React, { useState } from 'react';
import { X, MessageSquare, Mic, RefreshCw, GraduationCap, Briefcase } from 'lucide-react';

const SpeakingReviewModal = ({ data, loading, onClose, onRegenerate }) => {
  const [profile, setProfile] = useState('STUDENT');
  if (!data && !loading) return null;

  const handleProfileChange = (p) => {
    setProfile(p);
    onRegenerate(p);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 28, maxWidth: 700, width: '90%',
        maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={20} color="#be185d" /> Speaking Review
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Profile selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Thí sinh:</span>
          <button onClick={() => handleProfileChange('STUDENT')} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer',
            background: profile === 'STUDENT' ? '#059669' : '#f3f4f6',
            color: profile === 'STUDENT' ? 'white' : '#374151',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <GraduationCap size={15} /> Học sinh / Sinh viên
          </button>
          <button onClick={() => handleProfileChange('WORK')} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer',
            background: profile === 'WORK' ? '#2563eb' : '#f3f4f6',
            color: profile === 'WORK' ? 'white' : '#374151',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <Briefcase size={15} /> Đi làm
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Đang sinh đề...</div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Part 0 - Warm-up */}
            {data.warmUpQuestions?.length > 0 && (
              <div style={{ border: '1px solid #fef3c7', borderRadius: 10, padding: 16, background: '#fffbeb' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={16} /> Part 0 - Warm-up ({data.warmUpQuestions.length} câu)
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#4b5563' }}>
                  {data.warmUpQuestions.map((q, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{q.text} <span style={{ fontSize: 11, color: '#9ca3af' }}>({q.type})</span></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Part 1 */}
            {data.part1Frames?.length > 0 && (
              <div style={{ border: '1px solid #fce7f3', borderRadius: 10, padding: 16, background: '#fdf2f8' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#be185d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mic size={16} /> Part 1 - Introduction & Interview ({data.part1Frames.length} frames)
                </h4>
                {data.part1Frames.map((frame, fi) => (
                  <div key={fi} style={{ marginBottom: 12, padding: 10, background: 'white', borderRadius: 8, border: '1px solid #fce7f3' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#9d174d' }}>{frame.name}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{frame.frameType}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#4b5563' }}>
                      {(() => {
                        try {
                          const qs = typeof frame.questions === 'string' ? JSON.parse(frame.questions) : frame.questions;
                          return qs.map((qText, qi) => (
                            <li key={qi} style={{ marginBottom: 3 }}>{qText}</li>
                          ));
                        } catch { return <li>Lỗi đọc câu hỏi</li>; }
                      })()}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Part 2 */}
            {data.combo && (
              <div style={{ border: '1px solid #e9d5ff', borderRadius: 10, padding: 16, background: '#faf5ff' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mic size={16} /> Part 2 - Individual Long Turn
                </h4>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6d28d9' }}>Cue Card:</span>
                  <p style={{ margin: '4px 0', fontSize: 14, color: '#374151' }}>{data.combo.cueCardPrompt}</p>
                </div>
                {data.combo.bulletPoints && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6d28d9' }}>Bullet Points:</span>
                    <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 13, color: '#4b5563' }}>
                      {(() => {
                        try {
                          const bullets = typeof data.combo.bulletPoints === 'string' ? JSON.parse(data.combo.bulletPoints) : data.combo.bulletPoints;
                          return bullets.map((b, bi) => <li key={bi} style={{ marginBottom: 2 }}>{b}</li>);
                        } catch { return null; }
                      })()}
                    </ul>
                  </div>
                )}
                {data.combo.followUpQuestions && (() => {
                  try {
                    const fus = typeof data.combo.followUpQuestions === 'string' ? JSON.parse(data.combo.followUpQuestions) : data.combo.followUpQuestions;
                    if (fus.length > 0) return (
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6d28d9' }}>Follow-up Questions:</span>
                        <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 13, color: '#4b5563' }}>
                          {fus.map((fu, fui) => <li key={fui} style={{ marginBottom: 2 }}>{fu}</li>)}
                        </ul>
                      </div>
                    );
                  } catch {}
                  return null;
                })()}
              </div>
            )}

            {/* Part 3 */}
            {data.combo?.part3Questions && (() => {
              try {
                const p3qs = typeof data.combo.part3Questions === 'string' ? JSON.parse(data.combo.part3Questions) : data.combo.part3Questions;
                if (p3qs.length > 0) return (
                  <div style={{ border: '1px solid #c7d2fe', borderRadius: 10, padding: 16, background: '#eef2ff' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageSquare size={16} /> Part 3 - Two-way Discussion ({p3qs.length} câu)
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 14, color: '#4b5563' }}>
                      {p3qs.map((q, qi) => <li key={qi} style={{ marginBottom: 4 }}>{q}</li>)}
                    </ul>
                  </div>
                );
              } catch {}
              return null;
            })()}

            {/* Regenerate button */}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => onRegenerate(profile)} style={{
                padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#be185d',
                background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 8, cursor: 'pointer'
              }}>
                <RefreshCw size={14} style={{ marginRight: 6 }} /> Sinh lại đề ngẫu nhiên
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SpeakingReviewModal;