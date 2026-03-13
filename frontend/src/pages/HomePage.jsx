import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Trophy,
  BookMarked,
  BarChart3,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import '../styles/homePage.css';

// ---- Carousel slides ----
const SLIDES = [
  {
    badge: 'Nền tảng luyện thi IELTS #1',
    titleLine1: 'NỀN TẢNG LUYỆN THI',
    titleAccent: '#1 VIỆT NAM',
    titleLine2: 'THI IELTS ONLINE',
    subtitle: 'Đạt điểm IELTS mơ ước chỉ với một cú nhấp chuột!',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=700&fit=crop&q=80',
  },
  {
    badge: 'Thư viện đề thi phong phú',
    titleLine1: 'HƠN 500 ĐỀ THI',
    titleAccent: 'IELTS THỰC TẾ',
    titleLine2: 'CÓ GIẢI THÍCH CHI TIẾT',
    subtitle: 'Luyện tập với đề thi Cambridge, British Council và IDP chuẩn xác nhất.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&h=700&fit=crop&q=80',
  },
  {
    badge: 'Chấm điểm tự động',
    titleLine1: 'TRẢI NGHIỆM THI',
    titleAccent: 'IELTS THỰC TẾ',
    titleLine2: 'NGAY TẠI NHÀ',
    subtitle: 'Giao diện thi giống thật 100%, chấm điểm tự động ngay lập tức.',
    image: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=900&h=700&fit=crop&q=80',
  },
];

// ---- Stats ----
const STATS = [
  { value: '500+', label: 'Đề thi IELTS' },
  { value: '50,000+', label: 'Học viên đăng ký' },
  { value: '4.8★', label: 'Đánh giá trung bình' },
  { value: '100%', label: 'Miễn phí truy cập' },
];

// ---- Skill cards ----
const SKILLS = [
  {
    key: 'LISTENING',
    name: 'Listening',
    desc: 'Luyện nghe với hơn 200 đề thi IELTS Listening chuẩn Cambridge, tự chấm điểm tức thì.',
    icon: Headphones,
    iconBg: '#dbeafe',
    iconColor: '#1d4ed8',
    linkColor: '#1d4ed8',
    path: '/exam-library?skill=listening',
    image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=420&h=160&fit=crop&q=80',
  },
  {
    key: 'READING',
    name: 'Reading',
    desc: 'Thực hành đọc hiểu với các dạng câu hỏi đầy đủ, có giải thích đáp án chi tiết.',
    icon: BookOpen,
    iconBg: '#dcfce7',
    iconColor: '#15803d',
    linkColor: '#15803d',
    path: '/exam-library?skill=reading',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=420&h=160&fit=crop&q=80',
  },
  {
    key: 'WRITING',
    name: 'Writing',
    desc: 'Luyện viết Task 1 & Task 2 với bài mẫu band 8.0+ được chuyên gia soạn thảo.',
    icon: PenLine,
    iconBg: '#fef9c3',
    iconColor: '#a16207',
    linkColor: '#a16207',
    path: '/exam-library?skill=writing',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=420&h=160&fit=crop&q=80',
  },
  {
    key: 'SPEAKING',
    name: 'Speaking',
    desc: 'Luyện nói Part 1, 2, 3 với câu hỏi thực tế và gợi ý trả lời theo từng band điểm.',
    icon: Mic,
    iconBg: '#fce7f3',
    iconColor: '#be185d',
    linkColor: '#be185d',
    path: '/exam-library?skill=speaking',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=420&h=160&fit=crop&q=80',
  },
];

// ---- Features ----
const FEATURES = [
  {
    icon: BarChart3,
    title: 'Theo dõi tiến độ',
    desc: 'Thống kê chi tiết từng bài làm, phân tích điểm mạnh/yếu và lộ trình cải thiện cá nhân hóa.',
  },
  {
    icon: CheckCircle2,
    title: 'Chấm điểm tự động',
    desc: 'Hệ thống chấm điểm thông minh cho Listening & Reading ngay sau khi nộp bài.',
  },
  {
    icon: Clock,
    title: 'Thi có đồng hồ đếm giờ',
    desc: 'Giao diện thi sát với thực tế, đồng hồ tự động, áp lực thật để thi thật không bỡ ngỡ.',
  },
  {
    icon: BookMarked,
    title: 'Giải thích đáp án chi tiết',
    desc: 'Mỗi câu hỏi đều có giải thích đáp án rõ ràng giúp hiểu sâu và không mắc lỗi lần sau.',
  },
  {
    icon: Layers,
    title: 'Đề thi đa dạng',
    desc: 'Cambridge, British Council, IDP — hơn 500 đề thi được cập nhật liên tục theo đề thực.',
  },
  {
    icon: Trophy,
    title: 'Bảng xếp hạng',
    desc: 'So sánh kết quả với học viên toàn quốc, tạo động lực học tập mỗi ngày.',
  },
];

// ---- Component ----
const HomePage = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const goNext = useCallback(
    () => setActiveSlide((prev) => (prev + 1) % SLIDES.length),
    []
  );
  const goPrev = useCallback(
    () => setActiveSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length),
    []
  );

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [goNext]);

  const slide = SLIDES[activeSlide];

  return (
    <div>
      <Navbar />

      {/* ---- HERO ---- */}
      <section className="hero-section">
        <div className="hero-bg-circle hero-bg-circle-1" />
        <div className="hero-bg-circle hero-bg-circle-2" />

        <button className="hero-arrow hero-arrow-left" onClick={goPrev} aria-label="Slide trước">
          <ArrowLeft size={20} />
        </button>
        <button className="hero-arrow hero-arrow-right" onClick={goNext} aria-label="Slide tiếp">
          <ArrowRight size={20} />
        </button>

        <div className="hero-inner">
          {/* Left: text */}
          <div className="hero-text-side">
            <span 
              className="hero-badge"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.2s both' }}
            >
              {slide.badge}
            </span>

            <h1 
              className="hero-title-line1"
              style={{ animation: 'slideInLeft 0.8s ease-out 0.4s both' }}
            >
              {slide.titleLine1}&nbsp;
              <span className="hero-title-accent">{slide.titleAccent}</span>
            </h1>
            <h1 
              className="hero-title-line2"
              style={{ animation: 'slideInLeft 0.8s ease-out 0.6s both' }}
            >
              {slide.titleLine2}
            </h1>

            <p 
              className="hero-subtitle"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.8s both' }}
            >
              {slide.subtitle}
            </p>

            <div 
              className="hero-cta-row"
              style={{ animation: 'fadeInUp 0.8s ease-out 1s both' }}
            >
              <Link to="/exam-library" className="hero-btn-outline">
                THƯ VIỆN ĐỀ THI <ArrowUpRight size={18} />
              </Link>
              <Link to="/exam-library?skill=listening" className="hero-btn-solid">
                BẮT ĐẦU NGAY <ArrowUpRight size={18} />
              </Link>
            </div>

            {/* Dot indicators */}
            <div className="hero-dots">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  className={`hero-dot${i === activeSlide ? ' active' : ''}`}
                  onClick={() => setActiveSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right: student photo */}
          <div 
            className="hero-image-side"
            style={{ animation: 'slideInRight 0.8s ease-out 0.6s both' }}
          >
            <img
              key={activeSlide}
              src={slide.image}
              alt="IELTS student studying"
              loading="eager"
              style={{ 
                animation: 'fadeInUp 0.8s ease-out both',
                animationDelay: '0.2s'
              }}
            />
          </div>
        </div>
      </section>

      {/* ---- STATS BAND ---- */}
      <div className="stats-band">
        <div className="stats-band-inner">
          {STATS.map((s, index) => (
            <div 
              key={s.label} 
              className="stat-item"
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
              }}
            >
              <span className="stat-item-value">{s.value}</span>
              <span className="stat-item-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- SKILLS SECTION ---- */}
      <section className="skills-section">
        <div className="skills-section-inner">
          <div className="section-label">LUYỆN THI THEO KỸ NĂNG</div>
          <h2 className="section-title">Chọn kỹ năng bạn muốn luyện tập</h2>
          <div className="skills-grid">
            {SKILLS.map((skill) => {
              const Icon = skill.icon;
              return (
                <Link key={skill.key} to={skill.path} className="skill-card">
                  <div className="skill-card-img-wrap">
                    <img src={skill.image} alt={skill.name} loading="lazy" />
                  </div>
                  <div className="skill-card-body">
                    <div
                      className="skill-card-icon"
                      style={{ background: skill.iconBg, color: skill.iconColor }}
                    >
                      <Icon size={24} />
                    </div>
                    <div className="skill-card-name">{skill.name}</div>
                    <p className="skill-card-desc">{skill.desc}</p>
                    <span
                      className="skill-card-link"
                      style={{ color: skill.linkColor }}
                    >
                      Luyện tập ngay <ArrowUpRight size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- FEATURES SECTION ---- */}
      <section className="features-section">
        <div className="features-section-inner">
          <div className="section-label">TẠI SAO CHỌN DAVICTORY</div>
          <h2 className="section-title">Tất cả những gì bạn cần để đạt IELTS 7.0+</h2>
          <div className="features-grid">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="feature-card">
                  <div className="feature-card-icon">
                    <Icon size={26} />
                  </div>
                  <h3 className="feature-card-title">{f.title}</h3>
                  <p className="feature-card-desc">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- SHOWCASE SPLIT SECTION ---- */}
      <section className="showcase-section">
        <div className="showcase-inner">
          <div className="showcase-image-side">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=700&h=480&fit=crop&q=80"
              alt="Students studying together"
              loading="lazy"
            />
          </div>
          <div className="showcase-text-side">
            <div className="section-label">TRẢI NGHIỆM THỰC TẾ</div>
            <h2 className="section-title">Luyện thi như đang thi thật</h2>
            <ul className="showcase-features">
              {[
                {
                  icon: CheckCircle2,
                  title: 'Giao diện thi giống Pearson VUE 100%',
                  desc: 'Màn hình thi, âm thanh, đồng hồ — sát thực tế nhất có thể.',
                },
                {
                  icon: BarChart3,
                  title: 'Phân tích lỗi sai chi tiết',
                  desc: 'Sau mỗi bài thi, hệ thống chỉ ra ngay chỗ sai và gợi ý cách cải thiện.',
                },
                {
                  icon: Trophy,
                  title: 'Theo dõi lộ trình tiến bộ',
                  desc: 'Biểu đồ điểm số theo thời gian giúp bạn thấy rõ sự tiến bộ mỗi tuần.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="showcase-feature-item">
                    <div className="showcase-feature-icon">
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="showcase-feature-title">{item.title}</div>
                      <div className="showcase-feature-desc">{item.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link to="/exam-library" className="hero-btn-solid showcase-cta">
              Thử ngay miễn phí <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CTA BANNER ---- */}
      <section className="cta-banner">
        <div className="cta-banner-inner">
          <h2 className="cta-banner-title">
            Bắt đầu luyện thi <span>IELTS miễn phí</span> ngay hôm nay!
          </h2>
          <p className="cta-banner-sub">
            Hơn 50,000 học viên đã tin tưởng DAVictory để đạt mục tiêu IELTS của mình.
          </p>
          <Link to="/exam-library" className="cta-banner-btn">
            VÀO THƯ VIỆN ĐỀ THI <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
