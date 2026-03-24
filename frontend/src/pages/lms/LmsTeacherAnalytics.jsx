import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';
import { authApi } from '../../services/authApi';

const SKILL_LABELS = {
  LISTENING: 'Nghe',
  READING: 'Đọc',
  WRITING: 'Viết',
  SPEAKING: 'Nói',
};

const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];

const extractScore = (item) => {
  const raw = item?.overallBandScore ?? item?.bandScore ?? item?.score;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeSkill = (item) => {
  const raw = String(item?.examType || item?.skillType || item?.type || '').toUpperCase();
  if (SKILL_LABELS[raw]) return raw;
  return item?.type === 'WRITING' ? 'WRITING' : null;
};

export default function LmsTeacherAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const [submissionResult, classResult] = await Promise.allSettled([
        teacherApi.getAllSubmissions(),
        authApi.getMyClassManagement(),
      ]);

      const submissionPayload = submissionResult.status === 'fulfilled'
        ? submissionResult.value
        : { writingSubmissions: [], examAttempts: [] };

      const mergedSubmissions = [
        ...(submissionPayload.writingSubmissions || []).map((s) => ({ ...s, type: 'WRITING' })),
        ...(submissionPayload.examAttempts || []).map((a) => ({ ...a, type: a.examType || a.skillType || 'EXAM' })),
      ];

      const classPayload = classResult.status === 'fulfilled' ? classResult.value : { classes: [] };

      if (submissionResult.status === 'rejected' && classResult.status === 'rejected') {
        throw submissionResult.reason || classResult.reason;
      }

      setSubmissions(mergedSubmissions);
      setClasses(Array.isArray(classPayload?.classes) ? classPayload.classes : []);
    } catch (e) {
      console.error(e);
      setError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const analytics = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const total = submissions.length;
    const graded = submissions.filter((s) => s.status === 'GRADED' || extractScore(s) !== null);
    const pending = submissions.filter((s) => s.status === 'SUBMITTED');

    const recentWeek = submissions.filter((s) => {
      const d = toDate(s.submittedAt || s.startedAt || s.updatedAt || s.createdAt);
      return d ? now - d.getTime() <= weekMs : false;
    });

    const avgBand = graded.length
      ? (graded.reduce((sum, s) => sum + (extractScore(s) || 0), 0) / graded.length)
      : null;

    const skillBars = SKILL_ORDER.map((skill) => {
      const bucket = submissions.filter((s) => normalizeSkill(s) === skill);
      const bucketGraded = bucket.filter((s) => s.status === 'GRADED' || extractScore(s) !== null);
      const value = bucket.length ? Math.round((bucketGraded.length / bucket.length) * 100) : 0;
      return { label: SKILL_LABELS[skill], value };
    });

    const pendingBySkill = SKILL_ORDER.map((skill) => {
      const count = pending.filter((s) => normalizeSkill(s) === skill).length;
      return { skill, count };
    }).filter((x) => x.count > 0);

    const topClass = classes
      .map((c) => ({
        code: c?.code || c?.classCode || c?.name || 'N/A',
        studentCount: Number(c?.activeStudentCount ?? c?.studentCount ?? 0),
      }))
      .sort((a, b) => b.studentCount - a.studentCount)[0];

    return {
      total,
      gradedCount: graded.length,
      pendingCount: pending.length,
      recentWeekCount: recentWeek.length,
      completionRate: total ? Math.round((graded.length / total) * 100) : 0,
      avgBand,
      skillBars,
      pendingBySkill,
      topClass,
      classCount: classes.length,
    };
  }, [submissions, classes]);

  if (loading) {
    return (
      <LmsLayout title="Báo cáo" subtitle="Xu hướng kết quả học tập và mức độ tương tác">
        <div className="lms-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
          <Loader2 size={16} className="lms-spin" />
          Đang tải dữ liệu báo cáo...
        </div>
      </LmsLayout>
    );
  }

  return (
    <LmsLayout title="Báo cáo" subtitle="Xu hướng kết quả học tập và mức độ tương tác">
      {error && (
        <div className="lms-panel" style={{ marginBottom: 18, color: '#b91c1c' }}>
          {error}
          <button type="button" className="lms-cta ghost" onClick={fetchAnalytics} style={{ marginLeft: 12 }}>
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={18} />
          <h3 className="lms-panel-title">Chỉ số tiến bộ theo kỹ năng</h3>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {analytics.skillBars.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 90, fontSize: 12, color: '#6b7280' }}>{b.label}</div>
              <div style={{ flex: 1, height: 10, background: '#efe8da', borderRadius: 999 }}>
                <div style={{ width: `${b.value}%`, height: '100%', background: '#1b7f79', borderRadius: 999 }} />
              </div>
              <div style={{ width: 40, fontSize: 12, fontWeight: 600 }}>{b.value}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lms-grid">
        <div className="lms-panel">
          <h3 className="lms-panel-title">Tương tác theo tuần</h3>
          <p className="lms-subtitle">{analytics.recentWeekCount} lượt nộp trong 7 ngày gần nhất.</p>
          <div className="lms-chip-row">
            <span className="lms-chip">Tỷ lệ đã chấm: {analytics.completionRate}%</span>
            <span className="lms-chip">Band trung bình: {analytics.avgBand !== null ? analytics.avgBand.toFixed(1) : 'N/A'}</span>
            <span className="lms-chip">Số lớp quản lý: {analytics.classCount}</span>
            {analytics.topClass && <span className="lms-chip">Lớp đông nhất: {analytics.topClass.code}</span>}
          </div>
        </div>
        <div className="lms-panel">
          <h3 className="lms-panel-title">Khối lượng chấm bài</h3>
          <p className="lms-subtitle">Còn {analytics.pendingCount} bài nộp đang chờ chấm.</p>
          <div className="lms-chip-row">
            {analytics.pendingBySkill.length === 0 ? (
              <span className="lms-chip">Không có bài tồn đọng</span>
            ) : (
              analytics.pendingBySkill.map((item) => (
                <span key={item.skill} className="lms-chip">{SKILL_LABELS[item.skill]}: {item.count} bài</span>
              ))
            )}
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}
