import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GuestInfoForm from '../components/common/GuestInfoForm';
import { ieltsApi } from '../services/ieltsApi';

/**
 * HOC để wrap các trang làm bài thi
 * Xử lý logic: Guest (cần điền form) vs Authenticated User
 */
const withExamAuth = (ExamComponent, skillType) => {
  return (props) => {
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestInfo, setGuestInfo] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isReview = searchParams.get('review') === 'true';

    useEffect(() => {
      // Nếu đang review, không cần check auth
      if (isReview) {
        setIsCheckingAuth(false);
        return;
      }

      // Check nếu đã có guest info trong session
      const savedGuestInfo = sessionStorage.getItem('guestExamInfo');
      if (savedGuestInfo) {
        try {
          setGuestInfo(JSON.parse(savedGuestInfo));
          setIsCheckingAuth(false);
          return;
        } catch (e) {
          sessionStorage.removeItem('guestExamInfo');
        }
      }

      // Check authentication
      const isAuth = ieltsApi.isAuthenticated();
      if (!isAuth) {
        // Không đăng nhập -> hiện form guest
        setShowGuestForm(true);
      }
      setIsCheckingAuth(false);
    }, [isReview]);

    const handleGuestSubmit = (formData) => {
      setGuestInfo(formData);
      sessionStorage.setItem('guestExamInfo', JSON.stringify(formData));
      setShowGuestForm(false);
    };

    const handleGuestCancel = () => {
      navigate(-1);
    };

    if (isCheckingAuth) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Đang tải...</div>
        </div>
      );
    }

    if (showGuestForm) {
      return (
        <GuestInfoForm 
          onSubmit={handleGuestSubmit} 
          onCancel={handleGuestCancel}
        />
      );
    }

    // Pass guestInfo và isGuest flag xuống component
    return (
      <ExamComponent 
        {...props} 
        guestInfo={guestInfo}
        isGuest={!!guestInfo}
      />
    );
  };
};

export default withExamAuth;
