import {
  Pencil, Mic, Languages, BookOpen, ArrowRight, Sparkles, 
  BarChart3, Zap, ShieldCheck, Database, Terminal, Settings
} from 'lucide-react';

const features = [
  {
    title: 'IELTS Writing AI',
    desc: 'Advanced essay grading using 4 IELTS criteria. Detects task type and provides band scores with detailed justification.',
    icon: Pencil,
    link: '/writing',
    color: '#4F46E5'
  },
  {
    title: 'IELTS Speaking AI',
    desc: 'Interactive chat practice with AI examiners. Real-time feedback on fluency, grammar, and pronunciation.',
    icon: Mic,
    link: '/speaking',
    color: '#10B981'
  },
  {
    title: 'Grammar Checker',
    desc: 'Multi-lingual grammar and style correction powered by state-of-the-art LLMs.',
    icon: Languages,
    link: '/grammar',
    color: '#F59E0B'
  },
  {
    title: 'Test Library',
    desc: 'Collection of practice tests and sample materials for various language proficiency exams.',
    icon: BookOpen,
    link: '/tests',
    color: '#3B82F6'
  }
];

export default function Home() {
  return (
    <div className="animate-fade">
      {/* Hero Section */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
        color: 'white', border: 'none', padding: '60px 40px', textAlign: 'center',
        marginBottom: '40px'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '24px' }}>
          <Sparkles size={16} />
          Powered by Advanced DAVictory AI
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          AI Test Center
        </h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          Professional-grade evaluation tools for language learning. Practice Writing, Speaking, and more with instant AI feedback.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <a href="/ai-test/writing" className="btn" style={{ background: 'white', color: '#4F46E5', padding: '12px 24px', fontWeight: 700, textDecoration: 'none' }}>
            Get Started
          </a>
          <a href="/ai-test/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', fontWeight: 600, textDecoration: 'none' }}>
            System Status
          </a>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px' }}>Explore AI Capabilities</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {features.map(f => (
          <a key={f.title} href={`/ai-test${f.link}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ height: '100%', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${f.color}15`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <f.icon size={24} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }}>{f.title}</h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>{f.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: f.color, fontSize: '0.875rem', fontWeight: 700 }}>
                Try it now <ArrowRight size={16} />
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color="var(--accent)" />
            Instant Evaluation
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Our AI models are specifically fine-tuned for the IELTS rubric, providing band scores that closely match human examiners. Get results in seconds instead of days.
          </p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--secondary)" />
            Secure & Private
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your practice sessions and essays are processed securely. We use enterprise-grade AI providers to ensure your data is handled with the highest standards of privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
