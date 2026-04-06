import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { testBuilderApi } from '../../services/testBuilderApi';

/**
 * Bảo vệ route: nếu chưa đăng nhập (không có authToken) → redirect /login
 * Sau khi login xong sẽ redirect lại trang ban đầu (via state.from)
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  const location = useLocation();
  const [shareCheckState, setShareCheckState] = useState(token ? 'allowed' : 'checking');

  const guestShare = useMemo(() => {
    const isTestRoute = location.pathname.startsWith('/test/');
    if (!isTestRoute) return null;

    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] !== 'test' || segments.length < 3) return null;

    const skillSegment = String(segments[1] || '').toLowerCase();
    const testId = Number.parseInt(segments[2], 10);
    const searchParams = new URLSearchParams(location.search);
    const guestFlag = searchParams.get('guest') === '1';
    const tokenParam = searchParams.get('share') || '';

    if (!guestFlag || !tokenParam || !Number.isFinite(testId)) return null;

    const skillType = skillSegment.toUpperCase();
    if (!['LISTENING', 'READING', 'WRITING', 'SPEAKING'].includes(skillType)) return null;

    return { testId, skillType, token: tokenParam };
  }, [location.pathname, location.search]);

  useEffect(() => {
    let active = true;

    if (token) {
      setShareCheckState('allowed');
      return undefined;
    }

    if (!guestShare) {
      setShareCheckState('blocked');
      return undefined;
    }

    setShareCheckState('checking');
    testBuilderApi.validateShareLink(guestShare.testId, guestShare.skillType, guestShare.token)
      .then((result) => {
        if (!active) return;
        setShareCheckState(result?.valid ? 'allowed' : 'blocked');
      })
      .catch(() => {
        if (!active) return;
        setShareCheckState('blocked');
      });

    return () => {
      active = false;
    };
  }, [token, guestShare]);

  if (token) {
    return children;
  }

  if (!guestShare) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (shareCheckState === 'checking') {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: '#374151' }}>
        Đang kiểm tra link chia sẻ...
      </div>
    );
  }

  if (shareCheckState === 'blocked') {
    return (
      <Navigate
        to="/share-link-expired"
        replace
        state={{
          reason: 'Link chia sẻ đã hết hạn hoặc không còn hợp lệ.',
          from: location,
        }}
      />
    );
  }

  return children;
}
