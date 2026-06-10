import { useState } from 'react';
import { Check, HelpCircle, ChevronDown, ChevronUp, Clock, Star, Zap } from 'lucide-react';

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      name: 'Free Trial',
      desc: 'Perfect for getting started',
      price: '$0',
      period: '/forever',
      features: ['Writing: 20 LC/week', 'Speaking: 20-50 LC/week', 'Credit reset every Monday', 'Basic feedback'],
      cta: 'Sign in to use',
      popular: false,
    },
    {
      name: 'Solo Plan',
      desc: 'For individual students',
      price: billing === 'monthly' ? '$2.00' : '$24.00',
      period: billing === 'monthly' ? '/month' : '/year',
      features: [
        'Unlimited essay corrections',
        'Unlimited practice exams',
        'Detailed feedback & rewriting guidance',
        'AI writing assistant',
        'Chat & Q&A with AI',
        'Export results to DOCX',
      ],
      cta: 'Buy Now',
      popular: true,
    },
    {
      name: 'Instructor Plan',
      desc: 'For teachers & tutors',
      price: billing === 'monthly' ? '$2.90' : '$34.80',
      period: billing === 'monthly' ? '/month' : '/year',
      features: [
        'All Solo Plan features',
        'Teacher mode: batch correction',
        'Customize commenter name',
        'Personalize AI feedback style',
        '2 concurrent devices',
      ],
      cta: 'Buy Now',
      popular: false,
    },
    {
      name: 'Class Plan',
      desc: 'For classrooms & groups',
      price: billing === 'monthly' ? '$4.20' : '$50.40',
      period: billing === 'monthly' ? '/month' : '/year',
      features: [
        'All Instructor Plan features',
        '16 concurrent devices',
        'Zero wait time',
        'Priority support',
        'Custom classroom settings',
      ],
      cta: 'Buy Now',
      popular: false,
    },
  ];

  return (
    <div className="main">
      <div className="pricing-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Master Listening, Reading, Writing, and Speaking with one plan</p>
        <div className="pricing-toggle">
          <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>
            Monthly
          </button>
          <button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>
            Yearly <span className="badge badge-success" style={{ marginLeft: 4 }}>Save 20%</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map((plan, i) => (
          <div className={`pricing-card ${plan.popular ? 'featured' : ''}`} key={i}>
            <div className="pricing-name">{plan.name}</div>
            <div className="pricing-desc">{plan.desc}</div>
            <div className="pricing-price">
              {plan.price}
              <span>{plan.period}</span>
            </div>
            <div className="pricing-period">Billed {billing === 'monthly' ? 'monthly' : 'yearly'}</div>
            <ul className="pricing-features">
              {plan.features.map((f, j) => (
                <li key={j}>{f}</li>
              ))}
            </ul>
            <button className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%' }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* 4-Skill Plans */}
      <div className="welcome-banner" style={{ marginBottom: 32, background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)' }}>
        <h2>4-Skill Plan — Unlock Everything</h2>
        <p>Get unlimited access to Listening, Reading, Writing, and Speaking practice across LexiBot and LexiPrep.</p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
          <div><strong>Solo 4-Skill</strong> — $4.20/month</div>
          <div><strong>Instructor 4-Skill</strong> — Coming Soon</div>
          <div><strong>Class 4-Skill</strong> — Coming Soon</div>
        </div>
      </div>

      {/* FAQ */}
      <section className="faq-section">
        <div className="faq-header">
          <h2>Frequently Asked Questions</h2>
          <p>Answers to common questions about pricing</p>
        </div>
        <div className="faq-list">
          {[
            { q: 'What is the difference between free and paid plans?', a: 'The free plan has limited usage measured in LC (LexiCredit). Paid plans offer unlimited access to features with higher priority and faster processing.' },
            { q: 'What is LexiCredit (LC)?', a: 'LexiCredit (LC) is the currency used to measure usage on the free plan. For features marked as "Unlimited", you won\'t be charged credits.' },
            { q: 'How do I buy a plan?', a: 'Log in, choose your plan, and pay via PayPal or Stripe. Your plan activates immediately after payment.' },
            { q: 'Do paid plans auto-renew?', a: 'No, all transactions are one-time payments. We do not auto-renew or automatically charge your account.' },
            { q: 'Can I share my account?', a: 'Yes, but be aware of your plan\'s concurrent device limit. Exceeding this may cause disruptions.' },
            { q: 'What is your refund policy?', a: 'We offer a 7-day refund policy. Contact support@davictory.com within 7 days of purchase for a full refund.' },
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
    </div>
  );
}
