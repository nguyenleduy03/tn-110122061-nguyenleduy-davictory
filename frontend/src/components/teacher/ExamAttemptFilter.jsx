import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import './ExamAttemptFilter.css';

const ExamAttemptFilter = ({ onFilter, onClear }) => {
  const [filters, setFilters] = useState({
    classId: '',
    studentId: '',
    testId: '',
    skillType: '',
    status: '',
    startDate: '',
    endDate: '',
    minBandScore: '',
    maxBandScore: '',
    sortBy: 'submittedAt',
    sortDirection: 'DESC',
    page: 0,
    size: 20
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
    );
    onFilter(cleanFilters);
  };

  const handleClear = () => {
    setFilters({
      classId: '',
      studentId: '',
      testId: '',
      skillType: '',
      status: '',
      startDate: '',
      endDate: '',
      minBandScore: '',
      maxBandScore: '',
      sortBy: 'submittedAt',
      sortDirection: 'DESC',
      page: 0,
      size: 20
    });
    onClear();
  };

  return (
    <div className="exam-filter-container">
      <button 
        className="filter-toggle-btn"
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter size={18} />
        {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
      </button>

      {showFilters && (
        <form className="filter-form" onSubmit={handleSubmit}>
          <div className="filter-grid">
            <div className="filter-field">
              <label>Kỹ năng</label>
              <select value={filters.skillType} onChange={(e) => handleChange('skillType', e.target.value)}>
                <option value="">Tất cả</option>
                <option value="LISTENING">Listening</option>
                <option value="READING">Reading</option>
                <option value="WRITING">Writing</option>
                <option value="SPEAKING">Speaking</option>
              </select>
            </div>

            <div className="filter-field">
              <label>Trạng thái</label>
              <select value={filters.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="">Tất cả</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="SUBMITTED">Đã nộp</option>
                <option value="GRADED">Đã chấm</option>
                <option value="TIMED_OUT">Hết giờ</option>
              </select>
            </div>

            <div className="filter-field">
              <label>Từ ngày</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Đến ngày</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Band tối thiểu</label>
              <input 
                type="number" 
                step="0.5"
                min="0"
                max="9"
                value={filters.minBandScore}
                onChange={(e) => handleChange('minBandScore', e.target.value)}
                placeholder="0.0"
              />
            </div>

            <div className="filter-field">
              <label>Band tối đa</label>
              <input 
                type="number" 
                step="0.5"
                min="0"
                max="9"
                value={filters.maxBandScore}
                onChange={(e) => handleChange('maxBandScore', e.target.value)}
                placeholder="9.0"
              />
            </div>

            <div className="filter-field">
              <label>Sắp xếp theo</label>
              <select value={filters.sortBy} onChange={(e) => handleChange('sortBy', e.target.value)}>
                <option value="submittedAt">Ngày nộp</option>
                <option value="bandScore">Điểm số</option>
                <option value="createdAt">Ngày tạo</option>
              </select>
            </div>

            <div className="filter-field">
              <label>Thứ tự</label>
              <select value={filters.sortDirection} onChange={(e) => handleChange('sortDirection', e.target.value)}>
                <option value="DESC">Giảm dần</option>
                <option value="ASC">Tăng dần</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button type="button" onClick={handleClear} className="btn-clear">
              <X size={16} />
              Xóa bộ lọc
            </button>
            <button type="submit" className="btn-apply">
              <Filter size={16} />
              Áp dụng
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExamAttemptFilter;
