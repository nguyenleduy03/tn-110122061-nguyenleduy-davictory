import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { authApi } from '../../services/authApi';
import './AddUserModal.css';

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'STUDENT'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authApi.register(formData);
      alert('Tạo tài khoản thành công!');
      onSuccess();
      onClose();
      setFormData({
        username: '',
        email: '',
        fullName: '',
        password: '',
        role: 'STUDENT'
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Thêm tài khoản mới</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label>Tên đăng nhập *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Nhập email"
            />
          </div>

          <div className="form-group">
            <label>Họ tên *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Nhập họ tên"
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Nhập mật khẩu"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label>Vai trò</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="STUDENT">Học viên</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="MANAGER">Quản lý</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
