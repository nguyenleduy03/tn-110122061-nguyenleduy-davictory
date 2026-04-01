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
  Sparkles,
  Zap,
  Target,
  Play,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import '../styles/homePage.css';

// ---- Carousel slides ----
const SLIDES = [
  {
    badge: '🚀 Nền tảng luyện thi IELTS #1',
    titleLine1: 'CHINH PHỤC',
    titleAccent: 'IELTS 8.0+',
    titleLine2: 'CÙNG AI THÔNG MINH',
    subtitle: 'Hệ thống AI phân tích lỗi sai và đưa ra lộ trình học cá nhân hóa cho từng học viên',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=700&fit=crop&q=80',
    accentColor: '#0056D2'
  },
  {
    badge: '⚡ Công nghệ tiên tiến',
    titleLine1: 'CHẤM ĐIỂM',
    titleAccent: 'TỰ ĐỘNG',
    titleLine2: 'BẰNG AI',
    subtitle: 'Trí tuệ nhân tạo chấm Speaking & Writing với độ chính xác 95%, phản hồi tức thì',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&h=700&fit=crop&q=80',
    accentColor: '#0F766E'
  },
  {
    badge: '🎯 Học thông minh',
    titleLine1: 'LỘ TRÌNH',
    titleAccent: 'CÁ NHÂN HÓA',
    titleLine2: 'CHO BẠN',
    subtitle: 'AI phân tích điểm yếu và tạo kế hoạch học tập riêng, tối ưu thời gian đạt mục tiêu',
    image: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=900&h=700&fit=crop&q=80',
    accentColor: '#C2410C'
  },
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
    icon: Sparkles,
    title: 'AI Phân tích thông minh',
    desc: 'Trí tuệ nhân tạo phân tích chi tiết từng câu trả lời, chỉ ra lỗi sai và đưa ra gợi ý cải thiện cụ thể.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Zap,
    title: 'Chấm điểm tức thì',
    desc: 'Hệ thống AI chấm điểm Speaking & Writing với độ chính xác 95%, kết quả ngay sau khi hoàn thành.',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: Target,
    title: 'Lộ trình cá nhân hóa',
    desc: 'AI tạo kế hoạch học tập riêng biệt dựa trên điểm mạnh/yếu, tối ưu hóa thời gian học.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: BarChart3,
    title: 'Theo dõi tiến độ real-time',
    desc: 'Dashboard thông minh hiển thị tiến độ học tập, dự đoán điểm số và thời gian đạt mục tiêu.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: BookMarked,
    title: 'Ngân hàng đề thi khổng lồ',
    desc: 'Hơn 2000 đề thi thực tế từ Cambridge, IDP, British Council được cập nhật liên tục.',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    icon: Trophy,
    title: 'Gamification học tập',
    desc: 'Hệ thống điểm thưởng, thành tựu và bảng xếp hạng tạo động lực học tập bền vững.',
    color: 'from-red-500 to-pink-500'
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
            <div key={`hero-content-${activeSlide}`} className="hero-content-anim">
              <span className="hero-badge">{slide.badge}</span>

              <h1 className="hero-title">
                <span className="hero-title-main">
                  {slide.titleLine1}&nbsp;
                  <span className="hero-title-accent" style={{ color: slide.accentColor }}>
                    {slide.titleAccent}
                  </span>
                </span>
                <span className="hero-title-main">{slide.titleLine2}</span>
              </h1>

              <p className="hero-subtitle">{slide.subtitle}</p>

              <div className="hero-cta-row">
                <Link to="/exam-library" className="hero-btn-outline group">
                  <Play size={18} className="group-hover:scale-110 transition-transform" />
                  XEM DEMO MIỄN PHÍ
                </Link>
                <Link to="/exam-library?skill=listening" className="hero-btn-solid group">
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  BẮT ĐẦU HỌC AI
                </Link>
              </div>
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
          <div className="hero-image-side">
            <img
              key={activeSlide}
              className="hero-image-anim"
              src={slide.image}
              alt="IELTS student studying"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ---- SKILLS SECTION ---- */}
      <section className="skills-section">
        <div className="skills-section-inner">
          <div className="section-label">🚀 LUYỆN THI THEO KỸ NĂNG</div>
          <h2 className="section-title">Chọn kỹ năng bạn muốn chinh phục với AI</h2>
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
            {FEATURES.map((f, index) => {
              const Icon = f.icon;
              return (
                <div 
                  key={f.title} 
                  className="feature-card group"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className={`feature-card-icon bg-gradient-to-r ${f.color}`}>
                    <Icon size={26} className="text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="feature-card-title">{f.title}</h3>
                  <p className="feature-card-desc">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- TESTIMONIALS SECTION ---- */}
      <section className="testimonials-section">
        <div className="testimonials-inner">
          <div className="section-label">💬 PHẢN HỒI TỪ HỌC VIÊN</div>
          <h2 className="section-title">Hơn 1 triệu học viên tin tưởng DAVictory</h2>
          
          <div className="testimonials-grid">
            {[
              {
                name: "Nguyễn Minh Anh",
                score: "IELTS 8.5",
                avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face&q=80",
                text: "AI của DAVictory đã giúp tôi cải thiện Writing từ 6.0 lên 8.0 chỉ trong 2 tháng. Phản hồi chi tiết và lộ trình cá nhân hóa thật sự hiệu quả!",
                gradient: "from-pink-500 to-rose-500"
              },
              {
                name: "Trần Văn Hùng", 
                score: "IELTS 7.5",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face&q=80",
                text: "Hệ thống chấm Speaking tự động rất chính xác. Tôi đã luyện tập đều đặn và đạt được band 7.5 như mong muốn để du học Canada.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                name: "Lê Thị Mai",
                score: "IELTS 8.0", 
                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face&q=80",
                text: "Giao diện thi giống thật 100%, giúp tôi không bị bỡ ngỡ khi thi thật. Đặc biệt là phần Listening với chất lượng âm thanh cực tốt!",
                gradient: "from-emerald-500 to-teal-500"
              }
            ].map((testimonial, index) => (
              <div 
                key={testimonial.name}
                className="testimonial-card"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.2}s both`
                }}
              >
                <div className="testimonial-content">
                  <div className="testimonial-quote">"</div>
                  <p className="testimonial-text">{testimonial.text}</p>
                </div>
                <div className="testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.name} className="testimonial-avatar" />
                  <div>
                    <div className="testimonial-name">{testimonial.name}</div>
                    <div className={`testimonial-score bg-gradient-to-r ${testimonial.gradient} bg-clip-text text-transparent`}>
                      {testimonial.score}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

      {/* ---- SIMPLE CTA + FOOTER ---- */}
      <section className="footer-cta">
        <div className="footer-cta-inner">
          <h2 className="footer-cta-title">Sẵn sàng bắt đầu luyện thi IELTS?</h2>
          <p className="footer-cta-sub">Truy cập thư viện đề thi và bắt đầu lộ trình học phù hợp với bạn.</p>
          <div className="footer-cta-actions">
            <Link to="/student/lms" className="footer-btn-primary">
              Vào LMS <ArrowUpRight size={18} />
            </Link>
            <Link to="/exam-library" className="footer-btn-secondary">
              Vào thư viện đề thi
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer-home">
        <div className="site-footer-inner">
          <div className="site-footer-grid">
            <div className="site-footer-col">
              <div className="site-footer-brand">DAVictory</div>
              <p className="site-footer-text">Nền tảng luyện thi IELTS hiện đại, trực quan và dễ sử dụng.</p>
            </div>

            <div className="site-footer-col">
              <h3 className="site-footer-heading">Khám phá</h3>
              <div className="site-footer-links">
                <Link to="/">Trang chủ</Link>
                <Link to="/exam-library">Thư viện đề thi</Link>
                <Link to="/student/lms">LMS</Link>
                <Link to="/my-dashboard">Bảng điều khiển</Link>
              </div>
            </div>

            <div className="site-footer-col">
              <h3 className="site-footer-heading">Tài khoản</h3>
              <div className="site-footer-links">
                <Link to="/login">Đăng nhập</Link>
                <Link to="/register">Đăng ký</Link>
                <Link to="/profile">Hồ sơ cá nhân</Link>
              </div>
            </div>
          </div>

          <div className="site-footer-bottom">
            <span>© 2026 DAVictory. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
