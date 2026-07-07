import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, ChevronDown, Zap, Shield, Globe, Star, MessageCircle, HelpCircle } from 'lucide-react';

const FAQ_DATA = [
  {
    icon: '🚀',
    q: 'What is AriseJobs?',
    a: 'AriseJobs is an AI-powered career acceleration platform. Upload your resume, receive an instant ATS compatibility score, discover live job matches from LinkedIn, Naukri, and 50+ platforms, and get personalized coaching from SRI — your AI career assistant powered by Groq and Llama 3.3.',
  },
  {
    icon: '🤖',
    q: 'How does SRI, the AI assistant, work?',
    a: 'SRI is built on Groq\'s ultra-fast inference engine running Meta\'s Llama 3.3 70B model — one of the most capable open-source language models available. SRI reads your uploaded resume and job context in real time to give personalized, expert-level career advice rather than generic tips.',
  },
  {
    icon: '💸',
    q: 'Is AriseJobs free?',
    a: 'Yes — completely free to start. Upload your resume, get your ATS score, see live job matches, and ask SRI 3 questions all without creating an account. Sign up for a free account to unlock unlimited SRI conversations, full resume analysis with personalized feedback, and interview preparation tools.',
  },
  {
    icon: '📄',
    q: 'What resume file formats are supported?',
    a: 'We support PDF, DOCX, and TXT files. You can also paste your resume text directly into the text area if you prefer. For best ATS score accuracy, we recommend uploading a clean, single-column PDF.',
  },
  {
    icon: '📊',
    q: 'How is the ATS score calculated?',
    a: 'Your ATS score is calculated across multiple dimensions: keyword alignment with industry-standard job postings, resume section completeness (summary, skills, experience, education), action verb strength, quantifiable achievement density, formatting cleanliness, and readability. The score reflects how well your resume would pass automated screening systems used by 99% of Fortune 500 companies.',
  },
  {
    icon: '🔍',
    q: 'How does live job matching work?',
    a: 'After analyzing your resume, we extract your top skills and target role, then search live job databases across LinkedIn, Naukri, and other major platforms in real time. Each match is scored by compatibility — a 90%+ match means your skills closely align with the job requirements. We search up to 3 location preferences simultaneously.',
  },
  {
    icon: '🔒',
    q: 'Is my resume data private and secure?',
    a: 'Absolutely. Resume text is processed in-memory during your session and used only to generate your analysis and job matches. We never sell your data or share it with employers without your explicit action. All data is transmitted over HTTPS with industry-standard TLS encryption.',
  },
  {
    icon: '🌍',
    q: 'Which countries and locations are supported?',
    a: 'AriseJobs supports job searches globally. You can select multiple locations including Indian cities (Hyderabad, Bangalore, Delhi, Mumbai, Chennai, Pune, Kolkata, Noida, Gurgaon), international markets (USA, UK, Canada, Singapore, Australia), or choose Remote for location-independent roles.',
  },
  {
    icon: '💼',
    q: 'What career services does SRI offer?',
    a: 'SRI can help with: full resume review and rewriting, ATS keyword optimization, personalized interview preparation with STAR-method answers, technical coding interview coaching, cover letter generation, salary negotiation strategy, skill gap analysis with 30-day learning plans, and overall job search strategy tailored to your profile.',
  },
  {
    icon: '⚡',
    q: 'Why is the AI response so fast?',
    a: 'We use Groq\'s LPU (Language Processing Unit) hardware — purpose-built silicon for AI inference that delivers 10-20x faster responses than standard GPU-based services. This means you get complete, detailed career advice in seconds rather than minutes.',
  },
];

const FAQItem = ({ item, isOpen, onToggle }) => (
  <div className={`faq-item ${isOpen ? 'faq-open' : ''}`}>
    <button className="faq-question" onClick={onToggle} aria-expanded={isOpen}>
      <div className="faq-q-left">
        <span className="faq-emoji">{item.icon}</span>
        <span className="faq-q-text">{item.q}</span>
      </div>
      <ChevronDown size={18} className="faq-chevron" />
    </button>
    {isOpen && (
      <div className="faq-answer">
        <p>{item.a}</p>
      </div>
    )}
  </div>
);

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(0);

  const toggle = (i) => setOpenIdx(prev => (prev === i ? null : i));

  return (
    <div className="faq-page">
      {/* Hero */}
      <div className="faq-hero">
        <div className="faq-hero-badge">
          <HelpCircle size={14} /> Frequently Asked Questions
        </div>
        <h1 className="faq-hero-title">
          Everything you need to <span className="hero-grad">know</span>
        </h1>
        <p className="faq-hero-sub">
          Got questions? We have answers. Can't find what you're looking for?
          Ask <strong>SRI</strong> directly — just click the chat button below.
        </p>
      </div>

      {/* Stats bar */}
      <div className="faq-stats">
        <div className="faq-stat">
          <Zap size={16} className="faq-stat-icon" />
          <span>Ultra-fast AI responses via Groq</span>
        </div>
        <div className="faq-stat-sep" />
        <div className="faq-stat">
          <Shield size={16} className="faq-stat-icon" />
          <span>Your data is always private</span>
        </div>
        <div className="faq-stat-sep" />
        <div className="faq-stat">
          <Globe size={16} className="faq-stat-icon" />
          <span>50K+ live jobs scanned daily</span>
        </div>
        <div className="faq-stat-sep" />
        <div className="faq-stat">
          <Star size={16} className="faq-stat-icon" />
          <span>Free to start — no card required</span>
        </div>
      </div>

      {/* Accordion */}
      <div className="faq-list">
        {FAQ_DATA.map((item, i) => (
          <FAQItem key={i} item={item} isOpen={openIdx === i} onToggle={() => toggle(i)} />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="faq-cta">
        <div className="faq-cta-icon">
          <MessageCircle size={28} />
        </div>
        <h3 className="faq-cta-title">Still have questions?</h3>
        <p className="faq-cta-sub">SRI is available 24/7 to answer anything about your career journey.</p>
        <div className="faq-cta-btns">
          <Link to="/signup" className="btn-primary faq-signup-btn">
            <Rocket size={16} /> Get Started Free
          </Link>
          <Link to="/" className="faq-back-btn">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
