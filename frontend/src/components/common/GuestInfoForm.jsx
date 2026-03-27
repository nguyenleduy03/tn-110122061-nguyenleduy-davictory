import React, { useState } from 'react';
import { User, Mail, Phone } from 'lucide-react';
import '../styles/guestForm.css';

const GuestInfoForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="guest-form-overlay">
      <div className="guest-form-container">
        <h2>Thông tin thí sinh</h2>
        <p className="guest-form-subtitle">Vui lòng điền thông tin để bắt đầu làm bài thi</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <User size={18} />
              Họ và tên <span className="required">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
              className={errors.fullName ? 'error' : ''}
            />
            {errors.fullName && <span className="error-text">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label>
              <Mail size={18} />
              Email (tùy chọn)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>
              <Phone size={18} />
              Số điện thoại (tùy chọn)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0912345678"
              className={errors.phone ? 'error' : ''}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="form-actions">
            {onCancel && (
              <button type="button" onClick={onCancel} className="btn-cancel">
                Hủy
              </button>
            )}
            <button type="submit" className="btn-submit">
              Bắt đầu làm bài
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuestInfoForm;
