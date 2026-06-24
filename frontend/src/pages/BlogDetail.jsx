import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import agentApi from '../services/agentApi';
import { API_CONFIG } from '../config/api';
import './blog.css';
import { Calendar, Clock, ArrowLeft, Share2, Bookmark, Sparkles, User } from 'lucide-react';

const BASE = '/api/agent';

const BlogDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await agentApi.getPost(id);
        // The backend returns the post object directly or wraps it in 'post'
        const postData = res.data?.post || res.data;
        setPost(postData);
      } catch (err) {
        console.error('Error fetching post detail:', err);
        setError('Không tìm thấy bài viết hoặc đã có lỗi xảy ra.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.errorContainer}>
          <h2>Oops! Đã có lỗi xảy ra</h2>
          <p>{error}</p>
          <Link to="/blog" style={styles.backLink}> Quay lại trang Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navbar />
      
      <div style={styles.content}>
        <Link to="/blog" style={styles.backNav}>
          <ArrowLeft size={18} /> Quay lại danh sách
        </Link>

        <header style={styles.header}>
          <div style={styles.meta}>
            <span style={styles.tag}>{post.tags?.[0] || 'IELTS Tips'}</span>
            <span style={styles.metaItem}>
              <Calendar size={16} style={{ marginRight: 6 }} />
              {new Date(post.created_at || Date.now()).toLocaleDateString('vi-VN')}
            </span>
            <span style={styles.metaItem}>
              <Clock size={16} style={{ marginRight: 6 }} />
              {post.reading_time || 5} phút đọc
            </span>
          </div>
          
          <h1 style={styles.title}>{post.title}</h1>
          
          <div style={styles.authorCard}>
            <div style={styles.authorAvatar}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div style={styles.authorInfo}>
              <div style={styles.authorName}>AI Content Agent</div>
              <div style={styles.authorRole}>Hệ thống phân tích thông minh DAVictory</div>
            </div>
            <div style={styles.actions}>
              <button style={styles.actionBtn}><Share2 size={18} /></button>
              <button style={styles.actionBtn}><Bookmark size={18} /></button>
            </div>
          </div>
        </header>

        {(post.thumbnail || post.image_url) && (
          <div style={styles.imageWrap}>
            <img src={(post.thumbnail || '').startsWith('http') ? (post.thumbnail || post.image_url) : `${BASE}${post.thumbnail || post.image_url}`} alt={post.title} style={styles.featuredImage} onError={e => { e.target.style.display = 'none'; }} />
          </div>
        )}

        <article style={styles.article}>
          {post.content ? (
            <div 
              className="blog-content article-body" 
              dangerouslySetInnerHTML={{ 
                __html: (post.content || '').replaceAll(
                  'src="/uploads/', 
                  `src="${BASE}/uploads/`
                )
              }} 
              style={styles.body}
              onError={e => { if (e.target.tagName === 'IMG') e.target.style.display = 'none'; }}
            />
          ) : (
            <p style={styles.noContent}>Nội dung bài viết đang được cập nhật...</p>
          )}
        </article>

        <footer style={styles.postFooter}>
          <div style={styles.tagsRow}>
            {post.tags?.map(tag => (
              <span key={tag} style={styles.bottomTag}>#{tag}</span>
            ))}
          </div>
          
          <div style={styles.shareBox}>
            <h3>Bạn thấy bài viết này hữu ích?</h3>
            <p>Chia sẻ cho bạn bè cùng học nhé!</p>
            <div style={styles.shareButtons}>
              <button style={{ ...styles.socialBtn, background: '#1877f2' }}>Facebook</button>
              <button style={{ ...styles.socialBtn, background: '#1da1f2' }}>Twitter</button>
              <button style={{ ...styles.socialBtn, background: '#0077b5' }}>LinkedIn</button>
            </div>
          </div>
        </footer>
      </div>

      <div style={styles.relatedSection}>
        <div style={styles.relatedInner}>
          <h2 style={styles.relatedTitle}>Bài viết liên quan</h2>
          <p>Khám phá thêm nhiều kiến thức bổ ích khác.</p>
          {/* Ở đây có thể render thêm 1 vài card nhỏ nếu cần */}
          <Link to="/blog" style={styles.viewAllBtn}>Xem tất cả bài viết</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: '#fff', color: '#0f172a', fontFamily: "'Inter', sans-serif" },
  content: { maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' },
  backNav: { display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', textDecoration: 'none', fontSize: 14, marginBottom: 32, fontWeight: 500 },
  header: { marginBottom: 40 },
  meta: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  tag: { background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' },
  metaItem: { display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 14 },
  title: { fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 32, color: '#0f172a' },
  authorCard: { display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '16px 20px', borderRadius: 16, border: '1px solid #e2e8f0' },
  authorAvatar: { width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  authorInfo: { flex: 1 },
  authorName: { fontWeight: 700, fontSize: 15, color: '#0f172a' },
  authorRole: { fontSize: 13, color: '#64748b' },
  actions: { display: 'flex', gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  imageWrap: { marginBottom: 40, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  featuredImage: { width: '100%', height: 'auto', display: 'block' },
  article: { marginBottom: 60 },
  body: {
    fontSize: '1.125rem',
    lineHeight: 1.8,
    color: '#334155',
  },
  noContent: { textAlign: 'center', padding: 40, color: '#94a3b8', fontStyle: 'italic' },
  postFooter: { borderTop: '1px solid #f1f5f9', paddingTop: 40 },
  tagsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 40 },
  bottomTag: { color: '#64748b', fontSize: 14, fontWeight: 500 },
  shareBox: { background: '#f1f5f9', padding: 32, borderRadius: 20, textAlign: 'center' },
  shareButtons: { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 },
  socialBtn: { padding: '10px 20px', borderRadius: 10, border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  relatedSection: { background: '#f8fafc', padding: '80px 20px' },
  relatedInner: { maxWidth: 800, margin: '0 auto', textAlign: 'center' },
  relatedTitle: { fontSize: '1.75rem', fontWeight: 800, marginBottom: 12 },
  viewAllBtn: { display: 'inline-block', marginTop: 32, padding: '14px 32px', borderRadius: 12, background: '#0f172a', color: '#fff', textDecoration: 'none', fontWeight: 600 },
  loading: { textAlign: 'center', padding: '100px 0', color: '#64748b' },
  spinner: { width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' },
  errorContainer: { textAlign: 'center', padding: '100px 20px' },
  backLink: { color: '#2563eb', fontWeight: 600, textDecoration: 'none' },
};

export default BlogDetail;
