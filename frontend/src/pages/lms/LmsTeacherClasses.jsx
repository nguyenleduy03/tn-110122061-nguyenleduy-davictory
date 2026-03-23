import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, RefreshCw, School, Search } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { authApi } from '../../services/authApi';

function parseCodes(rawText) {
  return (rawText || '')
    .split(/[,\n;\t\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCodesFromCsv(csvText) {
  const cleanText = String(csvText || '').replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const parseRow = (line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  const first = parseRow(lines[0]);
  const normalizedHeader = first.map((h) => h.toLowerCase());
  const codeCol = normalizedHeader.findIndex((h) =>
    ['studentcode', 'student_code', 'username', 'code', 'mahv', 'mshv'].includes(h)
  );

  const startIndex = codeCol >= 0 ? 1 : 0;
  const out = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const row = parseRow(lines[i]);
    const raw = codeCol >= 0 ? row[codeCol] : row[0];
    if (raw && raw.trim()) out.push(raw.trim());
  }

  return [...new Set(out)];
}

export default function LmsTeacherClasses() {
  const isTeacher = authApi.hasRole('TEACHER');
  const user = authApi.getStoredUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [data, setData] = useState({ classes: [], teacher: null });
  const [search, setSearch] = useState('');

  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverForm, setHandoverForm] = useState({ classCode: '', studentCodesText: '', notes: '' });
  const [csvCodes, setCsvCodes] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState('');
  const csvInputRef = useRef(null);

  useEffect(() => {
    if (!isTeacher) {
      alert('Chỉ giáo viên được truy cập trang LMS lớp học.');
      window.location.href = '/';
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await authApi.getMyClassManagement();
        if (!mounted) return;
        setData({
          classes: Array.isArray(resp?.classes) ? resp.classes : [],
          teacher: resp?.teacher || null,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || 'Không thể tải dữ liệu lớp học.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isTeacher, refreshTick]);

  const classes = data.classes || [];

  const getClassCode = (c) => c?.code || c?.classCode || '';
  const getClassKey = (c) => String(c?.id ?? c?.classCode ?? c?.code ?? '');
  const getStudentCount = (c) => Number(c?.activeStudentCount ?? c?.studentCount ?? 0);

  const filteredClasses = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    const source = !q
      ? classes
      : classes.filter((c) =>
        String(getClassCode(c) || '').toLowerCase().includes(q) ||
        String(c?.name || '').toLowerCase().includes(q) ||
        String(c?.status || '').toLowerCase().includes(q)
      );

    // Teacher được toàn quyền nhưng chỉ trong lớp chính của mình.
    return source.slice(0, 1);
  }, [classes, search]);

  const selectedClass = useMemo(() => {
    if (!filteredClasses.length) return null;
    return filteredClasses[0];
  }, [filteredClasses]);

  useEffect(() => {
    if (!selectedClass?.id) return;
    setHandoverForm((prev) => ({ ...prev, classCode: getClassCode(selectedClass) || prev.classCode }));
  }, [selectedClass?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToClassDetail = (clazz) => {
    const classKey = getClassKey(clazz);
    if (!classKey) {
      alert('Lớp chưa có định danh hợp lệ để mở chi tiết.');
      return;
    }
    navigate(`/lms/teacher/classes/${encodeURIComponent(classKey)}`, {
      state: { classData: clazz },
    });
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setCsvFileName(file.name || '');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvCodes([]);
      setCsvError('Chỉ chấp nhận file .csv');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCodesFromCsv(text);
      if (parsed.length === 0) {
        setCsvCodes([]);
        setCsvError('Không tìm thấy mã học viên hợp lệ trong file CSV.');
        return;
      }
      setCsvCodes(parsed);
      setCsvError('');
    } catch {
      setCsvCodes([]);
      setCsvError('Không đọc được file CSV.');
    }
  };

  const clearCsv = () => {
    setCsvCodes([]);
    setCsvFileName('');
    setCsvError('');
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleAssignStudents = async () => {
    if (!handoverForm.classCode.trim()) {
      alert('Vui lòng nhập mã lớp');
      return;
    }

    const manualCodes = parseCodes(handoverForm.studentCodesText);
    const studentCodes = [...new Set([...(manualCodes || []), ...(csvCodes || [])])];
    if (studentCodes.length === 0) {
      alert('Vui lòng nhập mã học viên thủ công hoặc upload CSV');
      return;
    }

    try {
      setHandoverLoading(true);
      await authApi.assignStudentsByClassCodeScoped({
        classCode: handoverForm.classCode.trim(),
        studentCodes,
        notes: handoverForm.notes,
      });

      alert('Đã thêm học viên vào lớp');
      setHandoverForm((prev) => ({ ...prev, studentCodesText: '', notes: '' }));
      clearCsv();
      setRefreshTick((v) => v + 1);
    } catch (e) {
      alert(e?.response?.data?.message || 'Thêm học viên thất bại');
    } finally {
      setHandoverLoading(false);
    }
  };

  return (
    <LmsLayout title="Lớp học (Giảng viên)" subtitle={`Giảng viên: ${data?.teacher?.fullName || user?.fullName || ''}`}>
      {error && (
        <div className="lms-panel" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div className="lms-cards">
        <div className="lms-card"><h3>Tổng lớp phụ trách</h3><div className="lms-card-value">{classes.length}</div></div>
        <div className="lms-card"><h3>Học viên active</h3><div className="lms-card-value">{classes.reduce((sum, c) => sum + getStudentCount(c), 0)}</div></div>
        <div className="lms-card"><h3>Lớp đang chọn</h3><div className="lms-card-value">{getClassCode(selectedClass) || '-'}</div></div>
      </div>

      <div className="lms-class-workspace">
        <div className="lms-class-list-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 className="lms-panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><School size={16} /> Lớp của tôi</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: '#94a3b8' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm lớp..." style={{ padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid var(--lms-border)' }} />
              </div>
              <button className="lms-cta ghost" onClick={() => setRefreshTick((v) => v + 1)}><RefreshCw size={14} /></button>
            </div>
          </div>

          {loading ? (
            <p className="lms-subtitle">Đang tải dữ liệu lớp...</p>
          ) : (
            <div className="lms-class-list">
              {filteredClasses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`lms-class-item${c.id === selectedClass?.id ? ' active' : ''}`}
                  onClick={() => goToClassDetail(c)}
                >
                  <div className="lms-class-item-head">
                    <strong>{getClassCode(c) || 'N/A'}</strong>
                    <span>{c.status || 'N/A'}</span>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 3 }}>{c.name || 'Chưa đặt tên'}</div>
                  <div className="lms-class-item-meta">{getStudentCount(c)} học viên active</div>
                </button>
              ))}
              {filteredClasses.length === 0 && <p className="lms-subtitle">Không có lớp phù hợp</p>}
            </div>
          )}
        </div>

        <div className="lms-class-detail-panel">
          <div className="lms-panel" style={{ marginBottom: 14 }}>
            <div className="lms-class-overview">
              <div>
                <h2 className="lms-class-title">{selectedClass?.name || 'Chọn lớp để quản lý'}</h2>
                <p className="lms-subtitle" style={{ marginTop: 4 }}>
                  {selectedClass ? `${getClassCode(selectedClass)} • ${selectedClass.status || 'N/A'}` : 'Danh sách lớp phụ trách của giảng viên'}
                </p>
              </div>
              {selectedClass && <span className="lms-pill success">{getStudentCount(selectedClass)} học viên</span>}
            </div>
          </div>

          <div className="lms-panel" style={{ marginBottom: 14 }}>
            <h3 className="lms-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={16} /> Thêm học viên vào lớp phụ trách</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <input value={handoverForm.classCode} onChange={(e) => setHandoverForm((p) => ({ ...p, classCode: e.target.value }))} placeholder="Mã lớp" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--lms-border)' }} />
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
              {csvError && <p style={{ margin: 0, color: '#dc2626', fontSize: 12 }}>{csvError}</p>}
              {csvCodes.length > 0 && <p style={{ margin: 0, color: '#1e3a8a', fontSize: 12 }}>{csvFileName} • {csvCodes.length} mã</p>}
              <textarea rows={5} value={handoverForm.studentCodesText} onChange={(e) => setHandoverForm((p) => ({ ...p, studentCodesText: e.target.value }))} placeholder="Nhập thủ công mã học viên/username" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--lms-border)', resize: 'vertical' }} />
              <button className="lms-cta" onClick={handleAssignStudents} disabled={handoverLoading}>{handoverLoading ? 'Đang xử lý...' : 'Thêm học viên'}</button>
              {csvCodes.length > 0 && <button className="lms-cta ghost" onClick={clearCsv}>Xóa CSV</button>}
            </div>
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}
