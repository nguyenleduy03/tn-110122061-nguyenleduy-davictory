import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import agentApi from '../services/agentApi';
import { API_CONFIG } from '../config/api';
import './blog.css';
import { Calendar, Clock, ArrowRight, BookOpen, Sparkles } from 'lucide-react';

const BASE = '/api/agent';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await agentApi.listPosts();
        // Lọc ra các bài viết đã đăng (published)
        const publishedPosts = (res.data?.posts || []).filter(p => p.status === 'published');
        setPosts(publishedPosts);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError('Không thể tải danh sách bài viết. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div style={styles.container}>
      <Navbar />
      
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroBadge}>
            <Sparkles size={16} /> AI Insights
          </div>
          <h1 style={styles.heroTitle}>Kinh nghiệm học IELTS từ Trợ lý AI</h1>
          <p style={styles.heroSub}>
            Những bài viết, chiến thuật và mẹo làm bài được tổng hợp và phân tích bởi hệ thống AI của DAVictory.
          </p>
        </div>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Đang chuẩn bị nội dung...</p>
          </div>
        ) : error ? (
          <div style={styles.errorCard}>
            <p>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={styles.emptyState}>
            <BookOpen size={64} color="#cbd5e1" />
            <h3>Chưa có bài viết nào</h3>
            <p>Các bài viết từ AI Agent sẽ sớm xuất hiện tại đây.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {posts.map((post) => (
              <Link to={`/blog/${post.id}`} key={post.id} className="blog-card" style={styles.card}>
                {post.thumbnail && (
                  <div style={styles.cardImageWrap}>
                    <img 
                      src={(post.thumbnail || '').startsWith('http') ? post.thumbnail : `${BASE}${post.thumbnail}`} 
                      alt={post.title} 
                      style={styles.cardImage} 
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div style={styles.cardContent}>
                  <div style={styles.cardMeta}>
                    <span style={styles.cardTag}>{post.tags?.[0] || 'IELTS Tips'}</span>
                    <span style={styles.cardDate}>
                      <Calendar size={14} style={{ marginRight: 4 }} />
                      {new Date(post.created_at || Date.now()).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h3 style={styles.cardTitle}>{post.title}</h3>
                  <p style={styles.cardPreview}>{post.preview || 'Khám phá những chiến thuật và mẹo học tập hiệu quả để chinh phục mục tiêu IELTS của bạn...'}</p>
                  <div style={styles.cardFooter}>
                    <span style={styles.readingTime}>
                      <Clock size={14} style={{ marginRight: 4 }} />
                      {post.reading_time || 5} phút đọc
                    </span>
                    <span style={styles.readMore}>
                      Đọc tiếp <ArrowRight size={16} style={{ marginLeft: 4 }} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter / CTA */}
      {!loading && posts.length > 0 && (
        <div style={styles.cta}>
          <div style={styles.ctaInner}>
            <h2>Bạn muốn nhận thêm mẹo học IELTS?</h2>
            <p>Đăng ký nhận thông báo khi có bài viết mới từ AI Agent.</p>
            <div style={styles.ctaInputGroup}>
              <input type="email" placeholder="Email của bạn" style={styles.ctaInput} />
              <button style={styles.ctaBtn}>Đăng ký ngay</button>
            </div>
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <p>© 2026 DAVictory. Nội dung được hỗ trợ bởi AI.</p>
      </footer>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  hero: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    color: '#fff',
    padding: '80px 20px 60px',
    textAlign: 'center',
    marginBottom: 40,
  },
  heroInner: { maxWidth: 800, margin: '0 auto' },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    padding: '6px 16px',
    borderRadius: 100,
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 20,
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  heroTitle: { fontSize: '2.5rem', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 },
  heroSub: { fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 },
  content: { maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 },
  card: {
    background: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  cardImageWrap: { width: '100%', height: 200, overflow: 'hidden', background: '#f1f5f9' },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' },
  cardContent: { padding: 24, flex: 1, display: 'flex', flexDirection: 'column' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTag: {
    background: '#eff6ff',
    color: '#2563eb',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  cardDate: { fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center' },
  cardTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 12, lineHeight: 1.4 },
  cardPreview: { fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 20, flex: 1 },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  readingTime: { fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center' },
  readMore: { fontSize: 14, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center' },
  loading: { textAlign: 'center', padding: '100px 0', color: '#64748b' },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },
  errorCard: { background: '#fef2f2', color: '#dc2626', padding: 20, borderRadius: 12, textAlign: 'center' },
  emptyState: { textAlign: 'center', padding: '100px 0', color: '#94a3b8' },
  cta: { background: '#f1f5f9', padding: '80px 20px', borderRadius: 0, marginTop: 40 },
  ctaInner: { maxWidth: 600, margin: '0 auto', textAlign: 'center' },
  ctaInputGroup: { display: 'flex', gap: 10, marginTop: 24, maxWidth: 450, margin: '24px auto 0' },
  ctaInput: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
  },
  ctaBtn: {
    padding: '12px 24px',
    borderRadius: 12,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 14 },
};

export default BlogPage;
