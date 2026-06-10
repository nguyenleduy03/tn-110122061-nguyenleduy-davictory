import { useState } from 'react';
import {
  Pencil, Mic, Languages, BookOpen, ArrowRight, Star, ChevronDown, ChevronUp,
  Globe, Users, FileText, MessageSquare, Sparkles, BarChart3, Zap, Shield,
} from 'lucide-react';

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="main">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            Powered by Advanced AI
          </div>
          <h1 className="hero-title">
            Master English with <span>DAVictory AI</span>
          </h1>
          <p className="hero-subtitle">
            IELTS writing checker, speaking practice, multilingual grammar checker — all powered by AI.
            Trusted by 350,000+ students and teachers worldwide.
          </p>
          <div className="hero-actions">
            <a href="/ai-test/writing" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 700 }}>
              Start Writing Practice <ArrowRight size={18} />
            </a>
            <a href="/ai-test/speaking" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              Try Speaking <Mic size={18} />
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-value">350K+</div>
              <div className="hero-stat-label">Global Users</div>
            </div>
            <div>
              <div className="hero-stat-value">120+</div>
              <div className="hero-stat-label">Languages</div>
            </div>
            <div>
              <div className="hero-stat-value">1.5M+</div>
              <div className="hero-stat-label">Essays Reviewed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <div className="metrics-bar">
        <div className="metric-card">
          <div className="metric-value">98%</div>
          <div className="metric-label">Users feel more confident after 2 weeks</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">+1.5</div>
          <div className="metric-label">Average band score improvement in 3 months</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">24/7</div>
          <div className="metric-label">Instant AI grading & feedback anytime</div>
        </div>
      </div>

      {/* Features */}
      <section className="features-section">
        <div className="features-header">
          <h2>Practice Each Skill with DAVictory AI</h2>
          <p>Choose the skill you want to practice and start exploring today</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'var(--info-bg)', color: 'var(--primary)' }}>
              <Pencil size={24} />
            </div>
            <h3>IELTS Writing Checker</h3>
            <p>Get free AI-powered grading for IELTS writing task 1 & task 2 using advanced algorithms trained on 10,000+ high-scoring essays.</p>
            <div className="feature-card-links">
              <a href="/ai-test/writing">Grade Task 2 <ArrowRight size={14} /></a>
              <a href="/ai-test/writing">Grade Task 1 <ArrowRight size={14} /></a>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <Mic size={24} />
            </div>
            <h3>IELTS Speaking Practice</h3>
            <p>Practice IELTS speaking parts 1, 2, and 3 in real time with AI voice chat for a realistic exam experience.</p>
            <div className="feature-card-links">
              <a href="/ai-test/speaking">Start Speaking <ArrowRight size={14} /></a>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'var(--warning-bg)', color: '#B7950B' }}>
              <Languages size={24} />
            </div>
            <h3>Grammar & Spelling Checker</h3>
            <p>Automatically detect and fix spelling and grammar errors with AI. Supports 120+ languages including Vietnamese, Chinese, Japanese.</p>
            <div className="feature-card-links">
              <a href="/ai-test/grammar">Check Now <ArrowRight size={14} /></a>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: '#FFF0F5', color: '#FD79A8' }}>
              <BookOpen size={24} />
            </div>
            <h3>IELTS Test Library</h3>
            <p>Practice Listening, Reading, Writing with a real computer-based exam interface. Get instant scores after submission.</p>
            <div className="feature-card-links">
              <a href="/ai-test/tests">Explore Tests <ArrowRight size={14} /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="trust-bar">
        <span className="trust-item"><Shield size={16} /> Trusted by 350K+ users</span>
        <span className="trust-item"><Globe size={16} /> 120+ languages supported</span>
        <span className="trust-item"><BarChart3 size={16} /> 1.5M+ essays reviewed</span>
        <span className="trust-item"><Star size={16} /> 4.5 / 5 average rating</span>
      </div>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="features-header">
          <h2>Real Experiences from Actual Users</h2>
          <p>Real feedback from students and teachers about practicing IELTS with DAVictory</p>
        </div>
        <div className="testimonials-grid">
          {[
            { name: 'Son Nguyen', role: 'University Student', text: 'The scoring is close and not far off! I have been looking for a tool like this for a long time.' },
            { name: 'Thuy Linh', role: 'High School Student', text: 'The scores here don\'t seem too far off, and it\'s much more affordable for students like me.' },
            { name: 'Trung Hieu', role: 'English Center Teacher', text: 'The AI handled things better than I expected and made the students much more independent.' },
            { name: 'Minh Chien', role: 'University Student', text: 'LexiSpeak is online 24/7, which is perfect for my irregular study schedule! I hit 7.0!' },
            { name: 'Hong Van', role: 'IELTS Teacher', text: 'My students respond well because they immediately know what they need to fix.' },
            { name: 'Mai Anh', role: 'University Student', text: 'This is the best IELTS practice site. The tests are curated carefully and the feedback is detailed.' },
          ].map((t, i) => (
            <div className="testimonial-card" key={i}>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.name.charAt(0)}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="faq-header">
          <h2>Frequently Asked Questions</h2>
          <p>Answers to common questions about the DAVictory platform</p>
        </div>
        <div className="faq-list">
          {[
            { q: 'What is DAVictory AI?', a: 'DAVictory is an AI-powered platform offering IELTS writing checking, speaking practice, and multilingual grammar checking. It uses advanced AI algorithms to provide accurate scoring and detailed feedback.' },
            { q: 'How accurate is the AI grading?', a: 'Our AI models are trained on 10,000+ high-scoring essays and calibrated against expert IELTS examiners. The scoring typically falls within ±0.5 band of actual examiner scores.' },
            { q: 'Is there a free plan available?', a: 'Yes! We offer a free plan with weekly LexiCredits that reset every Monday. You can use the free plan to test our services before upgrading.' },
            { q: 'How many languages does the grammar checker support?', a: 'The grammar checker supports 120+ languages including English, Vietnamese, Chinese, Japanese, Korean, Spanish, French, German, and many more.' },
            { q: 'Can teachers use this platform?', a: 'Absolutely! We have dedicated instructor and class plans that support batch correction, custom feedback styles, and multi-device concurrent usage for classroom settings.' },
          ].map((faq, i) => (
            <div className="faq-item" key={i}>
              <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {faq.q}
                {openFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openFaq === i && <div className="faq-answer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Start Learning with DAVictory</h2>
        <p>Try it for free today, then upgrade to pro to unlock the full AI toolkit</p>
        <div className="cta-actions">
          <a href="/ai-test/writing" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary-dark)', fontWeight: 700 }}>
            Try for Free <ArrowRight size={18} />
          </a>
          <a href="/ai-test/pricing" className="btn btn-lg btn-outline-white">
            View Pricing
          </a>
        </div>
      </section>
    </div>
  );
}
