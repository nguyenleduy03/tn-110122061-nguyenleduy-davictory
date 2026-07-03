import { useState } from 'react';
import {
  BookOpen, Headphones, FileText, Mic, ChevronRight,
  Clock, BarChart3, Star, Lock, Play, GraduationCap, ShieldCheck
} from 'lucide-react';

const tests = {
  listening: {
    label: 'Listening (Nghe)',
    icon: Headphones,
    color: '#4f46e5',
    bg: '#f5f3ff',
    items: [
      { title: 'IELTS Listening Practice Test 1', duration: '30 phút', questions: 40, level: 'Medium' },
      { title: 'IELTS Listening Practice Test 2', duration: '30 phút', questions: 40, level: 'Hard' },
      { title: 'IELTS Listening Practice Test 3', duration: '30 phút', questions: 40, level: 'Easy' },
      { title: 'IELTS Listening Practice Test 4', duration: '30 phút', questions: 40, level: 'Medium' },
      { title: 'IELTS Listening Practice Test 5', duration: '30 phút', questions: 40, level: 'Hard' },
    ],
  },
  reading: {
    label: 'Reading (Đọc)',
    icon: BookOpen,
    color: '#10b981',
    bg: '#ecfdf5',
    items: [
      { title: 'IELTS Reading Practice Test 1', duration: '60 phút', questions: 40, level: 'Medium' },
      { title: 'IELTS Reading Practice Test 2', duration: '60 phút', questions: 40, level: 'Hard' },
      { title: 'IELTS Reading Practice Test 3', duration: '60 phút', questions: 40, level: 'Easy' },
      { title: 'IELTS Reading Practice Test 4', duration: '60 phút', questions: 40, level: 'Medium' },
    ],
  },
  writing: {
    label: 'Writing (Viết)',
    icon: FileText,
    color: '#ec4899',
    bg: '#fdf2f8',
    items: [
      { title: 'IELTS Writing Task 1 (Academic)', duration: '20 phút', questions: 1, level: 'Medium' },
      { title: 'IELTS Writing Task 1 (General)', duration: '20 phút', questions: 1, level: 'Medium' },
      { title: 'IELTS Writing Task 2 (Academic)', duration: '40 phút', questions: 1, level: 'Hard' },
      { title: 'IELTS Writing Task 2 (General)', duration: '40 phút', questions: 1, level: 'Hard' },
    ],
  },
  speaking: {
    label: 'Speaking (Nói)',
    icon: Mic,
    color: '#f59e0b',
    bg: '#fff7ed',
    items: [
      { title: 'IELTS Speaking Part 1 - Introduction', duration: '5 phút', questions: 3, level: 'Easy' },
      { title: 'IELTS Speaking Part 2 - Cue Card', duration: '5 phút', questions: 1, level: 'Medium' },
      { title: 'IELTS Speaking Part 3 - Discussion', duration: '5 phút', questions: 3, level: 'Hard' },
      { title: 'Full Mock Speaking Test', duration: '15 phút', questions: 7, level: 'Hard' },
    ],
  },
};

export default function TestLibrary() {
  const [selectedCategory, setSelectedCategory] = useState('listening');

  const getLevelBadge = (level) => {
    const bg = level === 'Easy' ? '#ecfdf5' : level === 'Medium' ? '#fff7ed' : '#fef2f2';
    const color = level === 'Easy' ? '#10b981' : level === 'Medium' ? '#f59e0b' : '#ef4444';
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        background: bg,
        color: color,
        fontSize: '11px',
        fontWeight: 700
      }}>
        {level}
      </span>
    );
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Title block */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '4px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#f5f3ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={22} />
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            Thư viện Đề thi IELTS (IELTS Test Library)
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
          Luyện tập với giao diện làm bài thực tế trên máy tính. Nhận kết quả và chấm điểm AI chi tiết ngay sau khi nộp bài.
        </p>
      </div>

      {/* Category selector row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(tests).map(([key, cat]) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === key;
          return (
            <div
              key={key}
              onClick={() => setSelectedCategory(key)}
              style={{
                background: '#ffffff',
                border: '1px solid',
                borderColor: isActive ? cat.color : '#e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                boxShadow: isActive ? `0 8px 24px -6px ${cat.color}25` : '0 2px 4px rgba(0, 0, 0, 0.01)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.2s',
                transform: isActive ? 'translateY(-2px)' : 'translateY(0)'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = cat.color;
                  e.currentTarget.style.boxShadow = `0 4px 12px ${cat.color}15`;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.01)';
                }
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: cat.bg,
                color: cat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                  {cat.label}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                  {cat.items.length} đề luyện tập
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test List Section */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
        marginBottom: '24px'
      }}>
        {selectedCategory && (() => {
          const cat = tests[selectedCategory];
          const Icon = cat.icon;
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: cat.bg,
                  color: cat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={16} />
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Đề thi luyện tập {cat.label}
                </h2>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: 6
                }}>
                  {cat.items.length} đề thi
                </span>
              </div>

              {/* Rows Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cat.items.map((test, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = cat.color;
                      e.currentTarget.style.background = '#fafbfc';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: cat.bg,
                        color: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                          {test.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>
                          <Clock size={12} />
                          <span>{test.duration}</span>
                          <span>•</span>
                          <span>{test.questions} câu hỏi</span>
                          <span>•</span>
                          {getLevelBadge(test.level)}
                        </div>
                      </div>
                    </div>

                    <button style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: cat.color,
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: `0 4px 10px ${cat.color}20`
                    }}>
                      <Play size={12} fill="#ffffff" /> Bắt đầu
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
