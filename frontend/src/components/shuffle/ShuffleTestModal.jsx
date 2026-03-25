import React, { useState, useEffect } from 'react';
import { Shuffle, X, AlertCircle } from 'lucide-react';
import { testBuilderApi } from '../../services/testBuilderApi';
import './ShuffleTestModal.css';

const ShuffleTestModal = ({ isOpen, onClose, onSuccess, currentUser }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [title, setTitle] = useState('');
  const [testType, setTestType] = useState('ACADEMIC');
  const [shuffleMode, setShuffleMode] = useState('FULL_TEST');
  const [skillType, setSkillType] = useState('LISTENING');
  const [selectedParts, setSelectedParts] = useState([]);
  const [shuffleSource, setShuffleSource] = useState('ALL');
  const [sourceTestIds, setSourceTestIds] = useState([]);
  const [filterCriteria, setFilterCriteria] = useState({
    status: 'PUBLISHED',
    targetBand: '',
    minDuration: '',
    maxDuration: '',
    createdByIds: [],
    seriesLabel: ''
  });
  
  const [availableTests, setAvailableTests] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setTitle(`Đề trộn - ${new Date().toLocaleDateString('vi-VN')}`);
      if (shuffleMode === 'CUSTOM_PARTS') {
        fetchAvailableParts();
      }
      if (shuffleSource === 'SPECIFIC_TESTS') {
        fetchAvailableTests();
      }
    }
  }, [isOpen, shuffleMode, shuffleSource]);

  const fetchAvailableParts = async () => {
    try {
      const structure = await testBuilderApi.getStructure(testType);
      const parts = [];
      Object.values(structure).forEach(session => {
        session.parts.forEach(part => {
          parts.push({
            id: part.partId,
            name: `${session.name} - ${part.name}`,
            skillType: session.skillType
          });
        });
      });
      setAvailableParts(parts);
    } catch (err) {
      console.error('Error fetching parts:', err);
    }
  };

  const fetchAvailableTests = async () => {
    try {
      const data = await testBuilderApi.filterTests({ 
        testType, 
        status: 'PUBLISHED',
        size: 100 
      });
      setAvailableTests(data.content || []);
    } catch (err) {
      console.error('Error fetching tests:', err);
    }
  };

  const handleShuffle = async () => {
    setLoading(true);
    setError('');
    
    try {
      const request = {
        title,
        testType,
        shuffleMode,
        createdByUserId: currentUser.id,
        shuffleSource
      };

      if (shuffleMode === 'SINGLE_SKILL') {
        request.skillType = skillType;
      } else if (shuffleMode === 'CUSTOM_PARTS') {
        request.partIds = selectedParts;
      }

      if (shuffleSource === 'SPECIFIC_TESTS') {
        request.sourceTestIds = sourceTestIds;
      } else if (shuffleSource === 'BY_FILTER') {
        request.filterCriteria = {
          ...filterCriteria,
          createdByIds: filterCriteria.createdByIds.length > 0 ? filterCriteria.createdByIds : null,
          minDuration: filterCriteria.minDuration ? parseInt(filterCriteria.minDuration) : null,
          maxDuration: filterCriteria.maxDuration ? parseInt(filterCriteria.maxDuration) : null
        };
      }

      const result = await testBuilderApi.shuffleTest(request);
      onSuccess(result);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể trộn đề. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setTitle('');
    setShuffleMode('FULL_TEST');
    setSkillType('LISTENING');
    setSelectedParts([]);
    setShuffleSource('ALL');
    setSourceTestIds([]);
    setError('');
    onClose();
  };

  const togglePart = (partId) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const toggleTest = (testId) => {
    setSourceTestIds(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="shuffle-modal-overlay">
      <div className="shuffle-modal">
        <div className="shuffle-modal-header">
          <div className="shuffle-modal-title">
            <Shuffle size={20} />
            <h2>Trộn đề thi tự động</h2>
          </div>
          <button onClick={handleClose} className="shuffle-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="shuffle-modal-body">
          {/* Step 1: Cấu hình cơ bản */}
          {step === 1 && (
            <div className="shuffle-step">
              <h3>Bước 1: Cấu hình cơ bản</h3>
              
              <div className="shuffle-form-group">
                <label>Tên đề thi</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Đề trộn - 25/03/2026"
                />
              </div>

              <div className="shuffle-form-group">
                <label>Loại đề</label>
                <select value={testType} onChange={(e) => setTestType(e.target.value)}>
                  <option value="ACADEMIC">Academic</option>
                  <option value="GENERAL">General Training</option>
                </select>
              </div>

              <div className="shuffle-form-group">
                <label>Đơn vị trộn</label>
                <div className="shuffle-radio-group">
                  <label className="shuffle-radio">
                    <input
                      type="radio"
                      value="FULL_TEST"
                      checked={shuffleMode === 'FULL_TEST'}
                      onChange={(e) => setShuffleMode(e.target.value)}
                    />
                    <span>Full Test (4 kỹ năng)</span>
                  </label>
                  <label className="shuffle-radio">
                    <input
                      type="radio"
                      value="SINGLE_SKILL"
                      checked={shuffleMode === 'SINGLE_SKILL'}
                      onChange={(e) => setShuffleMode(e.target.value)}
                    />
                    <span>Đơn kỹ năng</span>
                  </label>
                  <label className="shuffle-radio">
                    <input
                      type="radio"
                      value="CUSTOM_PARTS"
                      checked={shuffleMode === 'CUSTOM_PARTS'}
                      onChange={(e) => setShuffleMode(e.target.value)}
                    />
                    <span>Tùy chỉnh parts</span>
                  </label>
                </div>
              </div>

              {shuffleMode === 'SINGLE_SKILL' && (
                <div className="shuffle-form-group">
                  <label>Chọn kỹ năng</label>
                  <select value={skillType} onChange={(e) => setSkillType(e.target.value)}>
                    <option value="LISTENING">Listening</option>
                    <option value="READING">Reading</option>
                    <option value="WRITING">Writing</option>
                    <option value="SPEAKING">Speaking</option>
                  </select>
                </div>
              )}

              {shuffleMode === 'CUSTOM_PARTS' && (
                <div className="shuffle-form-group">
                  <label>Chọn parts ({selectedParts.length} đã chọn)</label>
                  <div className="shuffle-parts-list">
                    {availableParts.map(part => (
                      <label key={part.id} className="shuffle-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part.id)}
                          onChange={() => togglePart(part.id)}
                        />
                        <span>{part.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="shuffle-step-actions">
                <button onClick={() => setStep(2)} className="shuffle-btn primary">
                  Tiếp theo
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Phạm vi trộn */}
          {step === 2 && (
            <div className="shuffle-step">
              <h3>Bước 2: Phạm vi trộn</h3>

              <div className="shuffle-form-group">
                <label>Nguồn trộn</label>
                <div className="shuffle-radio-group">
                  <label className="shuffle-radio">
                    <input
                      type="radio"
                      value="ALL"
                      checked={shuffleSource === 'ALL'}
                      onChange={(e) => setShuffleSource(e.target.value)}
                    />
                    <span>Tất cả đề đã phát hành</span>
                  </label>
                  <label className="shuffle-radio">
                    <input
                      type="radio"
                      value="SPECIFIC_TESTS"
                      checked={shuffleSource === 'SPECIFIC_TESTS'}
                      onChange={(e) => setShuffleSource(e.target.value)}
                    />
                    <span>Chọn đề cụ thể</span>
                  </label>
                  <label className="shuffle-radio">
                    <input
                      type="radio"
                      value="BY_FILTER"
                      checked={shuffleSource === 'BY_FILTER'}
                      onChange={(e) => setShuffleSource(e.target.value)}
                    />
                    <span>Lọc theo điều kiện</span>
                  </label>
                </div>
              </div>

              {shuffleSource === 'SPECIFIC_TESTS' && (
                <div className="shuffle-form-group">
                  <label>Chọn đề thi ({sourceTestIds.length} đã chọn)</label>
                  <div className="shuffle-tests-list">
                    {availableTests.map(test => (
                      <label key={test.id} className="shuffle-checkbox">
                        <input
                          type="checkbox"
                          checked={sourceTestIds.includes(test.id)}
                          onChange={() => toggleTest(test.id)}
                        />
                        <span>{test.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {shuffleSource === 'BY_FILTER' && (
                <div className="shuffle-filter-group">
                  <div className="shuffle-form-row">
                    <div className="shuffle-form-group">
                      <label>Target Band</label>
                      <select 
                        value={filterCriteria.targetBand}
                        onChange={(e) => setFilterCriteria({...filterCriteria, targetBand: e.target.value})}
                      >
                        <option value="">Tất cả</option>
                        <option value="5.0">5.0</option>
                        <option value="5.5">5.5</option>
                        <option value="6.0">6.0</option>
                        <option value="6.5">6.5</option>
                        <option value="7.0">7.0</option>
                        <option value="7.5">7.5</option>
                        <option value="8.0">8.0+</option>
                      </select>
                    </div>
                    <div className="shuffle-form-group">
                      <label>Series</label>
                      <select 
                        value={filterCriteria.seriesLabel}
                        onChange={(e) => setFilterCriteria({...filterCriteria, seriesLabel: e.target.value})}
                      >
                        <option value="">Tất cả</option>
                        <option value="IELTS">IELTS</option>
                        <option value="Cambridge">Cambridge</option>
                      </select>
                    </div>
                  </div>
                  <div className="shuffle-form-row">
                    <div className="shuffle-form-group">
                      <label>Thời gian tối thiểu (phút)</label>
                      <input
                        type="number"
                        value={filterCriteria.minDuration}
                        onChange={(e) => setFilterCriteria({...filterCriteria, minDuration: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div className="shuffle-form-group">
                      <label>Thời gian tối đa (phút)</label>
                      <input
                        type="number"
                        value={filterCriteria.maxDuration}
                        onChange={(e) => setFilterCriteria({...filterCriteria, maxDuration: e.target.value})}
                        placeholder="180"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="shuffle-step-actions">
                <button onClick={() => setStep(1)} className="shuffle-btn secondary">
                  Quay lại
                </button>
                <button onClick={handleShuffle} disabled={loading} className="shuffle-btn primary">
                  {loading ? 'Đang trộn...' : 'Trộn đề'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="shuffle-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShuffleTestModal;
