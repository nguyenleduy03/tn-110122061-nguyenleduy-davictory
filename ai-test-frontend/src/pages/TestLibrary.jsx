import { useState } from 'react';
import {
  BookOpen, Headphones, FileText, Mic, ChevronRight,
  Clock, BarChart3, Star, Lock, Play,
} from 'lucide-react';

const tests = {
  listening: {
    icon: Headphones,
    color: '#6C5CE7',
    bg: 'var(--info-bg)',
    items: [
      { title: 'IELTS Listening Practice Test 1', duration: '30 min', questions: 40, level: 'Medium' },
      { title: 'IELTS Listening Practice Test 2', duration: '30 min', questions: 40, level: 'Hard' },
      { title: 'IELTS Listening Practice Test 3', duration: '30 min', questions: 40, level: 'Easy' },
      { title: 'IELTS Listening Practice Test 4', duration: '30 min', questions: 40, level: 'Medium' },
      { title: 'IELTS Listening Practice Test 5', duration: '30 min', questions: 40, level: 'Hard' },
    ],
  },
  reading: {
    icon: BookOpen,
    color: '#00B894',
    bg: 'var(--success-bg)',
    items: [
      { title: 'IELTS Reading Practice Test 1', duration: '60 min', questions: 40, level: 'Medium' },
      { title: 'IELTS Reading Practice Test 2', duration: '60 min', questions: 40, level: 'Hard' },
      { title: 'IELTS Reading Practice Test 3', duration: '60 min', questions: 40, level: 'Easy' },
      { title: 'IELTS Reading Practice Test 4', duration: '60 min', questions: 40, level: 'Medium' },
    ],
  },
  writing: {
    icon: FileText,
    color: '#FD79A8',
    bg: '#FFF0F5',
    items: [
      { title: 'IELTS Writing Task 1 (Academic)', duration: '20 min', questions: 1, level: 'Medium' },
      { title: 'IELTS Writing Task 1 (General)', duration: '20 min', questions: 1, level: 'Medium' },
      { title: 'IELTS Writing Task 2 (Academic)', duration: '40 min', questions: 1, level: 'Hard' },
      { title: 'IELTS Writing Task 2 (General)', duration: '40 min', questions: 1, level: 'Hard' },
    ],
  },
  speaking: {
    icon: Mic,
    color: '#FDCB6E',
    bg: 'var(--warning-bg)',
    items: [
      { title: 'IELTS Speaking Part 1 - Introduction', duration: '5 min', questions: 3, level: 'Easy' },
      { title: 'IELTS Speaking Part 2 - Cue Card', duration: '5 min', questions: 1, level: 'Medium' },
      { title: 'IELTS Speaking Part 3 - Discussion', duration: '5 min', questions: 3, level: 'Hard' },
      { title: 'Full Mock Speaking Test', duration: '15 min', questions: 7, level: 'Hard' },
    ],
  },
};

export default function TestLibrary() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="main">
      <div className="page-header" style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 32px' }}>
        <h1 style={{ justifyContent: 'center', fontSize: 32 }}>
          <BookOpen size={32} /> IELTS Test Library
        </h1>
        <p>Practice with real computer-based exam interface. Get instant scores after submission.</p>
      </div>

      {/* Category Grid */}
      <div className="features-grid" style={{ marginBottom: 32 }}>
        {Object.entries(tests).map(([key, cat]) => {
          const Icon = cat.icon;
          return (
            <div
              className="feature-card"
              key={key}
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="feature-card-icon" style={{ background: cat.bg, color: cat.color }}>
                <Icon size={24} />
              </div>
              <h3 style={{ textTransform: 'capitalize' }}>{key} Tests</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                {cat.items.length} practice tests available
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-info">{cat.items.length} tests</span>
                <span className="badge badge-secondary">
                  <Clock size={12} style={{ marginRight: 4 }} />
                  {cat.items[0]?.duration}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test List */}
      {Object.entries(tests).map(([key, cat]) => {
        const Icon = cat.icon;
        return (
          <div className="test-category" key={key} id={key}>
            <h3>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                <Icon size={16} />
              </div>
              <span style={{ textTransform: 'capitalize' }}>{key} Tests</span>
              <span className="badge badge-info" style={{ marginLeft: 8 }}>{cat.items.length}</span>
            </h3>
            <div className="test-list">
              {cat.items.map((test, i) => (
                <div className="test-item" key={i}>
                  <div className="test-item-icon" style={{ background: cat.bg, color: cat.color }}>
                    <Icon size={18} />
                  </div>
                  <div className="test-item-info">
                    <div className="test-item-title">{test.title}</div>
                    <div className="test-item-meta">
                      <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {test.duration}
                      <span style={{ margin: '0 8px' }}>•</span>
                      {test.questions} questions
                      <span style={{ margin: '0 8px' }}>•</span>
                      {test.level}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary">
                    <Play size={12} /> Start
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Info Card */}
      <div className="card" style={{ marginTop: 32, background: 'var(--info-bg)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <Star size={24} />
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Get the 4-Skill Plan</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              Practice all four skills without limits. Includes full access to Listening, Reading, Writing, and Speaking tests with AI-powered scoring.
            </p>
            <a href="/ai-test/pricing" className="btn btn-primary">
              View Plans <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
