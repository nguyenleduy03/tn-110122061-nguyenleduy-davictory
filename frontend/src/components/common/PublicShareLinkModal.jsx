import React from 'react';
import { Loader2, Link as LinkIcon, RefreshCw, Copy, AlertTriangle, Eye } from 'lucide-react';

function qrImageUrl(link) {
  if (!link) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
}

export default function PublicShareLinkModal({
  isOpen,
  onClose,
  onConfirm,
  onRefresh,
  onDelete,
  onPromoteAndCreate,
  canSharePublicly = true,
  loading,
  error,
  shareData,
  testTitle,
  skillLabel,
  testStatus,
}) {
  if (!isOpen) return null;

  const shareLink = shareData?.shareUrl || '';
  const hasActiveLink = Boolean(shareLink);
  const currentStatus = String(testStatus || '').toUpperCase();
  const isShareableStatus = canSharePublicly && (currentStatus === 'PUBLISHED' || currentStatus === 'TEST_EXAM');
  const statusText = loading
    ? 'Đang kiểm tra trạng thái link chia sẻ...'
    : hasActiveLink
      ? 'Đã có link công khai'
      : 'Chưa có link công khai';

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      window.alert('Da sao chep link chia se.');
    } catch {
      window.prompt('Khong the sao chep tu dong. Hay copy link sau:', shareLink);
    }
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Tao link cong khai">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Public share link</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Chia sẻ đề thi công khai</h3>
            <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13.5, lineHeight: 1.5 }}>
              Đề: <strong>{testTitle || 'Không tên'}</strong>
              {skillLabel ? ` | Kỹ năng: ${skillLabel}` : ''}
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={statusBadgeStyle(hasActiveLink, loading)}>{statusText}</span>
              {testStatus && (
                <span style={statusTagStyle(isShareableStatus)}>
                  <Eye size={12} /> {String(testStatus).replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        {!isShareableStatus ? (
          <div style={warningStateStyle}>
            <div style={warningIconStyle}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#9a3412' }}>
                Đề thi chưa ở trạng thái chia sẻ được
              </div>
              <p style={{ margin: '4px 0 0', color: '#7c2d12', fontSize: 13, lineHeight: 1.5 }}>
                Chỉ đề ở trạng thái <strong>Đã phát hành</strong> hoặc <strong>Test Exam</strong> mới có thể tạo link công khai.
                Bạn có thể chuyển đề sang <strong>Test Exam</strong> rồi tạo link ngay.
              </p>
            </div>
            <div style={actionsStyle}>
              <button type="button" style={ghostBtnStyle} onClick={onClose} disabled={loading}>Đóng</button>
              <button type="button" style={primaryBtnStyle} onClick={onPromoteAndCreate} disabled={loading}>
                {loading ? <Loader2 size={14} className="lms-spin" /> : <AlertTriangle size={14} />} Chuyển sang Test Exam & tạo link
              </button>
            </div>
          </div>
        ) : !hasActiveLink ? (
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              <LinkIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Chưa có link công khai</div>
              <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
                Nhấn xác nhận để tạo link và mã QR cho người làm bài.
              </p>
            </div>
            <div style={actionsStyle}>
              <button type="button" style={ghostBtnStyle} onClick={onClose} disabled={loading}>Đóng</button>
              <button type="button" style={primaryBtnStyle} onClick={onConfirm} disabled={loading}>
                {loading ? <Loader2 size={14} className="lms-spin" /> : <LinkIcon size={14} />} Xác nhận tạo link
              </button>
            </div>
          </div>
        ) : (
          <div style={activeShellStyle}>
            <div style={contentGridStyle}>
              <div style={qrCardStyle}>
                <div style={qrCardHeaderStyle}>Mã QR</div>
                <div style={qrFrameStyle}>
                  <img src={qrImageUrl(shareLink)} alt="QR chia se" style={qrImageStyle} />
                </div>
              </div>
              <div style={linkCardStyle}>
                <div style={linkCardHeaderStyle}>Link chia sẻ</div>
                <textarea readOnly value={shareLink} style={textareaStyle} rows={4} />
                <div style={hintRowStyle}>
                  <span style={hintDotStyle} />
                  <p style={{ margin: 0, color: '#64748b', fontSize: 12.5, lineHeight: 1.5 }}>
                    Khi bấm Làm mới, link và QR cũ sẽ bị vô hiệu hóa ngay lập tức.
                  </p>
                </div>
              </div>
            </div>

            <div style={actionsStyle}>
              <button type="button" style={ghostBtnStyle} onClick={onClose} disabled={loading}>Đóng</button>
              <button type="button" style={ghostBtnStyle} onClick={copyLink} disabled={loading}>
                <Copy size={14} /> Copy link
              </button>
              <button type="button" style={dangerBtnStyle} onClick={onDelete} disabled={loading}>
                Xóa link chia sẻ
              </button>
              <button type="button" style={primaryBtnStyle} onClick={onRefresh} disabled={loading}>
                {loading ? <Loader2 size={14} className="lms-spin" /> : <RefreshCw size={14} />} Làm mới link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.58)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
};

const modalStyle = {
  width: 'min(820px, 100%)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  paddingBottom: 16,
  borderBottom: '1px solid #e2e8f0',
};

const eyebrowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: '#e0f2fe',
  color: '#0369a1',
};

const statusWrapStyle = {
  flexShrink: 0,
  paddingTop: 4,
};

const statusTagStyle = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: active ? '#faf5ff' : '#f8fafc',
  color: active ? '#7c3aed' : '#64748b',
  border: '1px solid ' + (active ? '#e9d5ff' : '#e2e8f0'),
});

const warningStateStyle = {
  marginTop: 16,
  padding: 18,
  borderRadius: 18,
  background: 'linear-gradient(180deg, #fff7ed 0%, #fffbeb 100%)',
  border: '1px solid #fed7aa',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const warningIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#ffedd5',
  color: '#ea580c',
  border: '1px solid #fdba74',
};

const emptyStateStyle = {
  marginTop: 16,
  padding: 18,
  borderRadius: 18,
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const emptyIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #dbeafe',
};

const activeShellStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 18,
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  border: '1px solid #e2e8f0',
};

const contentGridStyle = {
  display: 'grid',
  gridTemplateColumns: '240px 1fr',
  gap: 16,
  alignItems: 'stretch',
};

const qrCardStyle = {
  padding: 14,
  borderRadius: 18,
  background: '#fff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
};

const qrCardHeaderStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#334155',
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const qrFrameStyle = {
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: 16,
  padding: 12,
  background: 'radial-gradient(circle at top left, #eff6ff 0%, #ffffff 58%)',
  border: '1px solid #dbeafe',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const qrImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

const linkCardStyle = {
  padding: 14,
  borderRadius: 18,
  background: '#fff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
};

const linkCardHeaderStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#334155',
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const hintRowStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  marginTop: 10,
};

const hintDotStyle = {
  width: 8,
  height: 8,
  borderRadius: 999,
  marginTop: 5,
  background: '#3b82f6',
  flexShrink: 0,
};

const errorStyle = {
  marginTop: 12,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#dc2626',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
};

const actionsStyle = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 16,
  flexWrap: 'wrap',
};

const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#fff',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 10px 20px rgba(37, 99, 235, 0.18)',
};

const ghostBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid #fecaca',
  background: '#fff1f2',
  color: '#b91c1c',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
};

function statusBadgeStyle(hasActiveLink, loading) {
  if (loading) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 999,
      padding: '5px 10px',
      fontSize: 12,
      fontWeight: 600,
      background: '#eff6ff',
      color: '#1d4ed8',
    };
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 600,
    background: hasActiveLink ? '#dcfce7' : '#f3f4f6',
    color: hasActiveLink ? '#166534' : '#6b7280',
  };
}

const textareaStyle = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: 14,
  padding: 12,
  fontSize: 12.5,
  lineHeight: 1.4,
  resize: 'none',
  background: '#f8fafc',
  color: '#0f172a',
  boxSizing: 'border-box',
  minHeight: 112,
};
