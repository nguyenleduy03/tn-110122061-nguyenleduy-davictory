import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '../components/layout/Navbar';
import agentApi from '../services/agentApi';
import {
  BarChart3, Download, Calendar, FileText, Send, RefreshCw,
  Layout, Edit3, Eye, Plus, ChevronRight, ChevronLeft, Clock, BookOpen,
  TrendingUp, TrendingDown, Award, ScanLine, Loader2, AlignLeft,
  Users, UserPlus, School, Activity, Target, CheckCircle2,
  PenTool, Mic, MessageSquare, Info, X, MessageCircle
} from 'lucide-react';
import { useToast } from '../components/Toast';
import './AgentReports.css';

const COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
const REPORT_TYPES = [
  { value: 'tong_quan', label: 'Tổng quan' },
  { value: 'hoc_tap', label: 'Học tập' },
  { value: 'thi_cu', label: 'Thi cử' },
];
const PERIODS = [
  { value: 'week', label: 'Tuần', icon: <Calendar size={13} /> },
  { value: 'month', label: 'Tháng', icon: <Calendar size={13} /> },
  { value: 'quarter', label: 'Quý', icon: <Calendar size={13} /> },
  { value: 'year', label: 'Năm', icon: <Calendar size={13} /> },
];
const PERIOD_LABELS = { week: 'tuần', month: 'tháng', quarter: 'quý', year: 'năm' };
const CATEGORY_COLORS = { tong_quan: '#2563eb', hoc_tap: '#059669', thi_cu: '#d97706' };

// Map categories to Lucide icons instead of emojis
const getCategoryIcon = (cat, size = 14) => {
  const props = { size };
  switch (cat) {
    case 'tong_quan':
      return <BarChart3 {...props} />;
    case 'hoc_tap':
      return <BookOpen {...props} />;
    case 'thi_cu':
      return <Award {...props} />;
    default:
      return <FileText {...props} />;
  }
};

// Map backend emoji/icon strings to Lucide icons
const getTemplateIcon = (iconStr, color = 'currentColor') => {
  const props = { size: 24, style: { color } };
  if (!iconStr) return <FileText {...props} />;

  // Normalize/check common emoji unicodes or strings
  if (iconStr.includes('📊') || iconStr.includes('📈') || iconStr.includes('U+1F4CA') || iconStr.includes('U+1F4C8') || iconStr.includes('ca') || iconStr.includes('c8')) {
    return <BarChart3 {...props} />;
  }
  if (iconStr.includes('📉') || iconStr.includes('U+1F4C9') || iconStr.includes('c9')) {
    return <TrendingDown {...props} />;
  }
  if (iconStr.includes('🏆') || iconStr.includes('🎓') || iconStr.includes('U+1F3C6') || iconStr.includes('U+1F393') || iconStr.includes('c6') || iconStr.includes('93')) {
    return <Award {...props} />;
  }
  if (iconStr.includes('📚') || iconStr.includes('📖') || iconStr.includes('U+1F4DA') || iconStr.includes('U+1F4D6') || iconStr.includes('da') || iconStr.includes('d6')) {
    return <BookOpen {...props} />;
  }
  if (iconStr.includes('📝') || iconStr.includes('U+1F4DD') || iconStr.includes('dd')) {
    return <FileText {...props} />;
  }
  if (iconStr.includes('🎯') || iconStr.includes('U+1F3AF') || iconStr.includes('af')) {
    return <Target {...props} />;
  }

  return <FileText {...props} />;
};

const getKpiIcon = (key, color) => {
  const iconProps = { size: 22, style: { color } };
  switch (key) {
    case 'total_users':
      return <Users {...iconProps} />;
    case 'new_users':
      return <UserPlus {...iconProps} />;
    case 'total_classes':
      return <School {...iconProps} />;
    case 'total_tests':
      return <FileText {...iconProps} />;
    case 'exam_attempts':
      return <Activity {...iconProps} />;
    case 'avg_band_score':
      return <Target {...iconProps} />;
    case 'completion_rate':
      return <CheckCircle2 {...iconProps} />;
    case 'writing_submissions':
      return <PenTool {...iconProps} />;
    case 'speaking_attempts':
      return <Mic {...iconProps} />;
    default:
      return <Info {...iconProps} />;
  }
};

// ─── SVG chart generators for export ──────
function svgBarChart(data, title, w = 500) {
  if (!data?.length) return '';
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barH = 24; const pad = 10; const labelW = 120;
  const chartW = w - labelW - pad * 2;
  const bars = data.slice(0, 10).map((d, i) => {
    const bw = Math.max((d.value / maxVal) * chartW, 2);
    const by = pad + i * (barH + 6);
    const c = COLORS[i % COLORS.length];
    return `<rect x="${labelW}" y="${by}" width="${bw}" height="${barH}" fill="${c}" rx="3"/>
<text x="${labelW - 4}" y="${by + barH / 2 + 4}" text-anchor="end" font-size="11" fill="#333">${d.label}</text>
<text x="${labelW + bw + 4}" y="${by + barH / 2 + 4}" font-size="11" fill="#555">${d.value}</text>`;
  });
  const h = data.length * (barH + 6) + pad * 2;
  return `<div style="margin:16px 0"><p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px">${title}</p><svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${bars.join('\n')}</svg></div>`;
}

function svgDonutChart(data, title, r = 60) {
  if (!data?.length) return '';
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = r + 10, cy = r + 10, circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = data.map((d, i) => {
    const len = (d.value / total) * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="12" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len; return seg;
  });
  const legend = data.map((d, i) => `<span style="margin:0 8px;font-size:11px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS[i % COLORS.length]};margin-right:4px"></span>${d.label}: ${d.value}</span>`).join('');
  return `<div style="margin:16px 0"><p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px">${title}</p><svg width="${(r+10)*2}" height="${(r+10)*2}" xmlns="http://www.w3.org/2000/svg">${segs.join('\n')}<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="14" font-weight="700" fill="#333">${Math.round((data[0]?.value/total)*100)}%</text></svg><div style="font-size:11px;margin-top:4px">${legend}</div></div>`;
}

// ─── Chart components ────────────────
function BarChart({ data, title, onAnalyze }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => typeof d.value === 'number' ? d.value : 0), 1);
  const fmt = v => {
    if (v === null || v === undefined) return 'Chưa thi';
    return typeof v === 'number' ? (Number.isInteger(v) ? v.toString() : v.toFixed(1)) : v;
  };
  return (
    <div className="ar-chart-card">
      <div className="ar-chart-card-header">
        {title && <div className="ar-chart-title">{title}</div>}
        {onAnalyze && (
          <button className="ar-chart-analyze-btn" onClick={onAnalyze}>
            <MessageSquare size={12} /> Phân tích
          </button>
        )}
      </div>
      <div className="ar-chart-card-body">
        {data.map((d, i) => {
          const widthPct = (d.value === null || d.value === undefined) ? 0 : Math.min((d.value / (d.max || maxVal)) * 100, 100);
          return (
            <div key={i} className="ar-chart-bar-item">
              <div className="ar-chart-bar-label">
                <span>{d.label}</span>
                <span className="ar-chart-bar-val">
                  {fmt(d.value)} {d.extra ? <span className="ar-chart-extra">{d.extra}</span> : ''}
                </span>
              </div>
              <div className="ar-chart-bar-track">
                <div className="ar-chart-bar-fill" style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})` }}>
                  {d.value > 0 ? fmt(d.value) : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ data, title, onAnalyze }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 60, cy = 60, r = 40, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="ar-chart-card">
      <div className="ar-chart-card-header">
        {title && <div className="ar-chart-title">{title}</div>}
        {onAnalyze && (
          <button className="ar-chart-analyze-btn" onClick={onAnalyze}>
            <MessageSquare size={12} /> Phân tích
          </button>
        )}
      </div>
      <div className="ar-chart-card-body ar-donut-body">
        <div className="ar-donut-wrap">
          <svg width={120} height={120} viewBox="0 0 120 120">
            {data.map((d, i) => {
              const len = (d.value / total) * circ;
              const seg = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} />;
              offset += len; return seg;
            })}
            <circle cx={cx} cy={cy} r={22} fill="var(--ar-surface)" />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ar-text)">{Math.round((data[0]?.value / total) * 100)}%</text>
          </svg>
        </div>
        <div className="ar-legend">
          {data.map((d, i) => (
            <div key={i} className="ar-legend-item">
              <span className="ar-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="ar-legend-text">{d.label}: <strong>{d.value}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineChart({ data, title, onAnalyze }) {
  if (!data?.length) return null;
  const w = 560, h = 160, pad = 20;
  const vals = data.map(d => d.value);
  const maxV = Math.max(...vals, 1), minV = Math.min(...vals, 0);
  const range = maxV - minV || 1;
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({ x: pad + i * stepX, y: h - pad - ((d.value - minV) / range) * (h - pad * 2) }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;
  return (
    <div className="ar-chart-card ar-chart-full">
      <div className="ar-chart-card-header">
        {title && <div className="ar-chart-title">{title}</div>}
        {onAnalyze && (
          <button className="ar-chart-analyze-btn" onClick={onAnalyze}>
            <MessageSquare size={12} /> Phân tích
          </button>
        )}
      </div>
      <div className="ar-chart-card-body">
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
            </linearGradient>
          </defs>
          <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke="var(--ar-border)" strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="var(--ar-border)" strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--ar-border)" strokeWidth={0.5} />

          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2.5} />

          {pts.map((p, i) => (
            <g key={i} className="ar-line-node">
              <circle cx={p.x} cy={p.y} r={4} fill="#2563eb" stroke="var(--ar-surface)" strokeWidth={1.5} />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fill="var(--ar-text)" fontWeight={600}>{data[i].value}</text>
              <text x={p.x} y={h - 4} textAnchor="middle" fontSize={8} fill="var(--ar-text-dim)">{data[i].label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function buildFullHtml(report) {
  if (!report) return { html: '', chartGroups: [] };
  const htmlParts = [];
  const chartGroups = [];
  for (const section of report.sections || []) {
    if (section.heading) htmlParts.push(`## ${section.heading}`);
    if (section.content) htmlParts.push(section.content);
    for (const chart of section.charts || []) {
      if (chart.data?.length) {
        chartGroups.push(chart);
        htmlParts.push(` _Biểu đồ: ${chart.title}_`);
      }
    }
    htmlParts.push('');
  }
  return { html: htmlParts.join('\n'), chartGroups };
}

export default function AgentReports({ isEmbedded = false }) {
  const addToast = useToast();
  
  // Layout state
  const [showChat, setShowChat] = useState(true);

  // Template state
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadedReport, setLoadedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');

  // Metric analysis modal state
  const [analysisModal, setAnalysisModal] = useState({
    isOpen: false,
    metricKey: '',
    metricLabel: '',
    metricValue: null,
    period: 'month',
    question: '',
    loading: false,
    result: ''
  });

  // Dedicated Chat Sidebar state
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Xin chào! Tôi là Trợ lý phân tích dữ liệu AI của DAVictory. Bạn có thể hỏi tôi về các chỉ số học tập, thi thử, năng suất giáo viên hoặc yêu cầu phân tích các biểu đồ đang hiển thị bên trái.', time: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const msgsEnd = useRef(null);

  useEffect(() => {
    msgsEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await agentApi.getReportTemplates();
      setCategories(res.data?.categories || []);
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const loadTemplate = async (id) => {
    setLoadingReport(true);
    setLoadedReport(null);
    try {
      const res = await agentApi.getReportTemplate(id);
      setLoadedReport(res.data);
      setEditMode(false);
      
      // Auto push context message to chat when report changes
      setMessages(prev => [
        ...prev,
        { role: 'agent', text: `Tôi đã tải dữ liệu của báo cáo "${res.data.title}". Bạn có muốn hỏi sâu hơn về chỉ số nào trong báo cáo này không?`, time: new Date() }
      ]);
    } catch (e) {
      addToast('Lỗi tạo báo cáo: ' + (e.response?.data?.detail || e.message), 'error');
    }
    setLoadingReport(false);
  };

  const handleExportWord = (report) => {
    let h = `<h2>Báo cáo: ${report.title}</h2><p>Ngày tạo: ${new Date(report.generated_at).toLocaleDateString('vi-VN')}</p>`;
    
    (report.sections || []).forEach(s => {
      if (s.heading) h += `<h2>${s.heading}</h2>`;
      if (s.content) h += `<p>${s.content.replace(/\n/g, '<br>')}</p>`;
      (s.charts || []).forEach(chart => {
        if (!chart.data?.length) return;
        if (chart.type === 'bar') h += svgBarChart(chart.data, chart.title);
        else if (chart.type === 'donut') h += svgDonutChart(chart.data, chart.title);
      });
    });

    if (report.dashboard_charts) {
      Object.values(report.dashboard_charts).forEach(cg => {
        if (cg.type === 'bar') h += svgBarChart(cg.data, cg.title);
        else if (cg.type === 'donut') h += svgDonutChart(cg.data, cg.title);
      });
    }

    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bao cao</title>
<style>body{font-family:'Times New Roman',serif;padding:40px;line-height:1.8}
h2{color:#2563eb;font-size:20px;border-bottom:2px solid #2563eb;padding-bottom:8px}
h3{color:#334155;font-size:18px}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#2563eb;color:#fff;padding:10px 12px;text-align:left}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
tr:nth-child(even){background:#f8fafc}
blockquote{border-left:4px solid #2563eb;padding:12px 20px;margin:20px 0;background:#f8fafc}
ul{margin:10px 0;padding-left:24px}li{margin:6px 0}
hr{border:none;border-top:2px solid #e2e8f0;margin:20px 0}
</style></head><body>${h}</body></html>`;
    const blob = new Blob([doc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Bao_cao_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExportPdf = async (report) => {
    const { html, chartGroups } = buildFullHtml(report);
    try {
      const res = await fetch('/api/agent/report/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken') },
        body: JSON.stringify({ markdown: html, chart_groups: chartGroups }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Bao_cao_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { addToast('Lỗi xuất PDF: ' + e.message, 'error'); }
  };

  // Chat with Agent logic
  const handleSendChatMessage = async (text) => {
    if (!text.trim() || chatLoading) return;
    setChatLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: text.trim(), time: new Date() }]);
    setChatInput('');
    try {
      // Execute standard agent query in report mode
      const res = await agentApi.query(text, sessionId, true, 'report');
      const data = res.data;
      if (data.session_id) setSessionId(data.session_id);
      if (data.response) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'agent', 
            text: data.response, 
            chartGroups: data.data?.chart_groups || null, 
            time: new Date() 
          }
        ]);
      }
      if (data.session_id && (data.pending_action || !data.response)) {
        pollChatResult(data.session_id);
      } else {
        setChatLoading(false);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', text: '❌ Lỗi kết nối đến Agent: ' + (e.message || ''), time: new Date() }]);
      setChatLoading(false);
    }
  };

  const pollChatResult = (sid) => {
    let pc = 0;
    const timer = setInterval(async () => {
      pc++;
      try {
        const taskRes = await agentApi.getTasks(sid);
        const tasks = taskRes.data?.tasks || [];
        const done = tasks.filter(t => t.status === 'completed');
        const failed = tasks.filter(t => t.status === 'failed');
        if (done.length > 0) {
          const r = done[0].result;
          if (r?.response) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'agent' && last?.text === r.response) return prev;
              return [...prev, { role: 'agent', text: r.response, chartGroups: r.data?.chart_groups || null, time: new Date() }];
            });
          }
          clearInterval(timer); setChatLoading(false); return;
        }
        if (failed.length > 0) {
          setMessages(prev => [...prev, { role: 'agent', text: '❌ Agent thất bại: ' + (failed[0].error || 'Lỗi không xác định'), time: new Date() }]);
          clearInterval(timer); setChatLoading(false); return;
        }
        if (pc > 30) { clearInterval(timer); setChatLoading(false); }
      } catch { /* */ }
    }, 2000);
  };

  const handleSaveEdit = () => {
    if (!loadedReport) return;
    const lines = editText.split('\n');
    const newSections = [];
    let currentSection = null;
    for (const line of lines) {
      const hMatch = line.match(/^## (.+)/);
      if (hMatch) {
        if (currentSection) newSections.push(currentSection);
        currentSection = { heading: hMatch[1], content: '', charts: [] };
      } else if (currentSection) {
        if (currentSection.content) currentSection.content += '\n';
        currentSection.content += line;
      }
    }
    if (currentSection) newSections.push(currentSection);
    setLoadedReport({ ...loadedReport, sections: newSections.length ? newSections : loadedReport.sections });
    setEditMode(false);
    addToast('Đã lưu chỉnh sửa', 'success');
  };

  // Metric analysis modal
  const handleOpenAnalysis = (key, label, value) => {
    setAnalysisModal({
      isOpen: true,
      metricKey: key,
      metricLabel: label,
      metricValue: value,
      period: loadedReport?.period || 'month',
      question: `Hãy phân tích chi tiết nguyên nhân tại sao chỉ số "${label}" lại đạt giá trị ${value}${key === 'avg_band_score' ? ' band' : (key === 'completion_rate' ? '%' : '')} và đề xuất giải pháp cải thiện.`,
      loading: false,
      result: ''
    });
  };

  const submitMetricAnalysis = async () => {
    if (analysisModal.loading) return;
    setAnalysisModal(prev => ({ ...prev, loading: true, result: '' }));
    try {
      const res = await agentApi.analyzeMetric(
        analysisModal.metricKey,
        analysisModal.metricValue,
        analysisModal.period,
        analysisModal.question
      );
      if (res.data?.success) {
        setAnalysisModal(prev => ({ ...prev, loading: false, result: res.data.analysis }));
      } else {
        setAnalysisModal(prev => ({ ...prev, loading: false, result: 'Lỗi: ' + (res.data?.error || 'Phân tích thất bại') }));
      }
    } catch (e) {
      setAnalysisModal(prev => ({ ...prev, loading: false, result: 'Lỗi: ' + e.message }));
    }
  };

  // ─── Filter templates ──────────────────
  const filteredTemplates = categories
    .filter(c => !selectedCat || c.value === selectedCat)
    .map(c => ({
      ...c,
      templates: c.templates.filter(t => selectedPeriod === 'all' || t.period === selectedPeriod),
    }))
    .filter(c => c.templates.length > 0);

  // ─── Left Panel: Templates List ────────
  const renderTemplatesList = () => (
    <div className="ar-template-page">
      <div className="ar-template-filters">
        <div className="ar-filter-row">
          <div className="ar-filter-group">
            <span className="ar-filter-label">Danh mục</span>
            <div className="ar-filter-chips">
              <button className={`ar-filter-chip ${!selectedCat ? 'active' : ''}`} onClick={() => setSelectedCat(null)}>Tất cả</button>
              {categories.map(c => (
                <button key={c.value} className={`ar-filter-chip ${selectedCat === c.value ? 'active' : ''}`}
                  style={selectedCat === c.value ? { background: `${CATEGORY_COLORS[c.value]}12`, color: CATEGORY_COLORS[c.value], borderColor: CATEGORY_COLORS[c.value] } : {}}
                  onClick={() => setSelectedCat(c.value)}>
                  {getCategoryIcon(c.value, 13)}
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="ar-filter-divider" />
          
          <div className="ar-filter-group">
            <span className="ar-filter-label">Kỳ hạn</span>
            <div className="ar-filter-chips">
              <button className={`ar-filter-chip ${selectedPeriod === 'all' ? 'active' : ''}`} onClick={() => setSelectedPeriod('all')}>Tất cả</button>
              {PERIODS.map(p => (
                <button key={p.value} className={`ar-filter-chip ${selectedPeriod === p.value ? 'active' : ''}`}
                  onClick={() => setSelectedPeriod(p.value)}>
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ar-template-grid">
        {loadingTemplates ? (
          <div className="ar-template-loading">
            <Loader2 size={28} className="ar-spin" style={{ color: 'var(--ar-primary)' }} />
            <p>Đang tải danh sách mẫu báo cáo...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="ar-template-loading">
            <p style={{ color: 'var(--ar-text-dim)' }}>Không tìm thấy mẫu báo cáo nào phù hợp</p>
          </div>
        ) : filteredTemplates.map(cat => (
          cat.templates.map(t => {
            const catColor = CATEGORY_COLORS[cat.value] || '#2563eb';
            return (
              <div key={t.id} className="ar-template-card" onClick={() => loadTemplate(t.id)}>
                <div className="ar-template-card-body">
                  <div className="ar-template-card-top-row">
                    <div className="ar-template-card-badge-icon" style={{ backgroundColor: `${catColor}10`, color: catColor }}>
                      {getTemplateIcon(t.icon, catColor)}
                    </div>
                    <span className="ar-template-card-period-tag">{PERIOD_LABELS[t.period] || t.period}</span>
                  </div>
                  <h3 className="ar-template-card-title">{t.title}</h3>
                  <p className="ar-template-card-desc">{t.description}</p>
                </div>
                <div className="ar-template-card-footer">
                  <span className="ar-template-card-tag" style={{ background: `${catColor}10`, color: catColor }}>
                    {cat.label}
                  </span>
                  <span className="ar-template-card-action" style={{ color: catColor }}>
                    Tạo ngay <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );

  // ─── Left Panel: Loaded Report Viewer ──
  const renderReportViewer = () => {
    if (!loadedReport) return null;
    const hasDashboard = !!loadedReport.kpi_cards;
    const dc = loadedReport.dashboard_charts || {};

    return (
      <div className="ar-report-view">
        <div className="ar-report-toolbar">
          <button className="ar-report-back" onClick={() => { setLoadedReport(null); setEditMode(false); }}>
            <ChevronLeft size={16} /> Danh sách mẫu
          </button>
          <div className="ar-report-toolbar-title">
            <span className="ar-report-toolbar-icon">{getTemplateIcon(loadedReport.icon, 'var(--ar-primary)')}</span>
            <span>{loadedReport.title}</span>
          </div>
          <div className="ar-report-toolbar-actions">
            {editMode ? (
              <>
                <button className="ar-report-btn ar-report-btn-primary" onClick={handleSaveEdit}>
                  Lưu thay đổi
                </button>
                <button className="ar-report-btn" onClick={() => { setEditMode(false); setEditText(sectionsToMarkdown(loadedReport.sections)); }}>
                  Hủy bỏ
                </button>
              </>
            ) : (
              <>
                <button className="ar-report-btn" onClick={() => { setEditMode(true); setEditText(sectionsToMarkdown(loadedReport.sections)); }}>
                  <Edit3 size={13} /> Sửa nội dung
                </button>
                <button className="ar-report-btn ar-report-btn-primary" onClick={() => handleExportWord(loadedReport)}>
                  <Download size={13} /> Word
                </button>
                <button className="ar-report-btn ar-report-btn-primary" onClick={() => handleExportPdf(loadedReport)}>
                  <FileText size={13} /> PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ar-report-content">
          {editMode ? (
            <textarea className="ar-report-editor" value={editText} onChange={e => setEditText(e.target.value)} />
          ) : (
            <div className="ar-dashboard-layout">
              {/* KPI Cards Grid */}
              {hasDashboard && (
                <div className="ar-kpis-grid">
                  {loadedReport.kpi_cards.map((c) => (
                    <div key={c.key} className="ar-kpi-card" onClick={() => handleOpenAnalysis(c.key, c.label, c.value)}>
                      <div className="ar-kpi-card-header">
                        <span className="ar-kpi-card-title">{c.label}</span>
                        <div className="ar-kpi-card-icon-wrap" style={{ backgroundColor: `${c.color}12` }}>
                          {getKpiIcon(c.key, c.color)}
                        </div>
                      </div>
                      <div className="ar-kpi-card-val-row">
                        <span className="ar-kpi-card-value">
                          {c.value}
                          {c.unit && <span className="ar-kpi-card-unit">{c.unit}</span>}
                        </span>
                        {c.change_label && (
                          <span className={`ar-kpi-trend ${c.trend}`}>
                            {c.trend === 'up' ? <TrendingUp size={11} /> : c.trend === 'down' ? <TrendingDown size={11} /> : null}
                            {c.change_label}
                          </span>
                        )}
                      </div>
                      <div className="ar-kpi-card-footer">
                        <span>{c.description}</span>
                        <span className="ar-kpi-card-hover-text">Hỏi Agent phân tích →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Charts Dashboard */}
              {hasDashboard && Object.keys(dc).length > 0 && (
                <div className="ar-charts-grid">
                  <div className="ar-charts-row">
                    {dc.user_distribution && <DonutChart {...dc.user_distribution} onAnalyze={() => handleOpenAnalysis('user_distribution', dc.user_distribution.title, 'Biểu đồ')} />}
                    {dc.test_type && <DonutChart {...dc.test_type} onAnalyze={() => handleOpenAnalysis('test_type', dc.test_type.title, 'Biểu đồ')} />}
                  </div>

                  <div className="ar-charts-row">
                    {dc.skill_distribution && <BarChart {...dc.skill_distribution} onAnalyze={() => handleOpenAnalysis('skill_distribution', dc.skill_distribution.title, 'Biểu đồ')} />}
                    {dc.score_distribution && <BarChart {...dc.score_distribution} onAnalyze={() => handleOpenAnalysis('score_distribution', dc.score_distribution.title, 'Biểu đồ')} />}
                  </div>

                  {dc.time_trend && <LineChart {...dc.time_trend} onAnalyze={() => handleOpenAnalysis('time_trend', dc.time_trend.title, 'Biểu đồ')} />}

                  <div className="ar-charts-row">
                    {dc.top_students && <BarChart {...dc.top_students} onAnalyze={() => handleOpenAnalysis('top_students', dc.top_students.title, 'Biểu đồ')} />}
                    {dc.top_classes && <BarChart {...dc.top_classes} onAnalyze={() => handleOpenAnalysis('top_classes', dc.top_classes.title, 'Biểu đồ')} />}
                  </div>

                  {dc.teacher_productivity && <BarChart {...dc.teacher_productivity} onAnalyze={() => handleOpenAnalysis('teacher_productivity', dc.teacher_productivity.title, 'Biểu đồ')} />}
                </div>
              )}

              {/* AI Markdown analysis narrative */}
              <div className="ar-md-wrapper">
                <div className="ar-section-divider">
                  <AlignLeft size={15} />
                  <span>AI Nhận xét & Đánh giá chuyên sâu</span>
                </div>
                {(loadedReport.sections || []).map((section, idx) => (
                  <div key={idx} className="ar-section-block">
                    {section.heading && <h3 className="ar-section-heading">{section.heading}</h3>}
                    {section.content && (
                      <div className="ar-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                      </div>
                    )}
                    {section.charts?.length > 0 && (
                      <div className="ar-section-charts">
                        {section.charts.map((chart, cidx) => {
                          if (!chart.data?.length) return null;
                          const onAnalyze = () => handleOpenAnalysis(chart.title, chart.title, 'Biểu đồ');
                          switch (chart.type) {
                            case 'bar': return <BarChart key={cidx} data={chart.data} title={chart.title} onAnalyze={onAnalyze} />;
                            case 'donut': return <DonutChart key={cidx} data={chart.data} title={chart.title} onAnalyze={onAnalyze} />;
                            case 'line': return <LineChart key={cidx} data={chart.data} title={chart.title} onAnalyze={onAnalyze} />;
                            default: return null;
                          }
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Right Panel: AI Chat Sidebar ──────
  const renderChatSidebar = () => (
    <div className={`ar-chat-sidebar ${showChat ? 'visible' : 'collapsed'}`}>
      <div className="ar-chat-sidebar-header">
        <div className="ar-chat-sidebar-title">
          <MessageCircle size={18} style={{ color: 'var(--ar-primary)' }} />
          <span>Trợ lý Phân tích & Tạo báo cáo AI</span>
        </div>
        <button className="ar-chat-toggle-btn" onClick={() => setShowChat(false)} title="Thu nhỏ khung chat">
          <X size={16} />
        </button>
      </div>

      <div className="ar-chat-sidebar-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ar-chat-msg ${m.role === 'user' ? 'ar-chat-msg-user' : 'ar-chat-msg-agent'}`}>
            <div className="ar-chat-msg-bubble">
              {m.role === 'user' ? (
                m.text.split('\n').map((line, j) => <p key={j} style={{ margin: '2px 0' }}>{line}</p>)
              ) : (
                <div className="ar-chat-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              )}
              {m.role === 'agent' && m.chartGroups?.length > 0 && (
                <div className="ar-chat-chart-embed">
                  {m.chartGroups.map((cg, gi) => {
                    switch (cg.type) {
                      case 'bar': return <BarChart key={gi} data={cg.data} title={cg.title} />;
                      case 'donut': return <DonutChart key={gi} data={cg.data} title={cg.title} />;
                      default: return null;
                    }
                  })}
                </div>
              )}
            </div>
            <span className="ar-chat-msg-time">
              {m.time ? `${m.time.getHours().toString().padStart(2, '0')}:${m.time.getMinutes().toString().padStart(2, '0')}` : ''}
            </span>
          </div>
        ))}
        {chatLoading && (
          <div className="ar-chat-loading-dots">
            <Loader2 size={16} className="ar-spin" style={{ color: 'var(--ar-text-dim)' }} />
            <span>Agent đang phân tích dữ liệu thật...</span>
          </div>
        )}
        <div ref={msgsEnd} />
      </div>

      {/* Quick Action Suggestions dedicated to Report Generation & Analysis */}
      <div className="ar-chat-suggestions">
        <button onClick={() => handleSendChatMessage("Tạo báo cáo tổng quan tháng này")} disabled={chatLoading}>
          Tạo báo cáo tháng này
        </button>
        <button onClick={() => handleSendChatMessage("Phân tích điểm thi trung bình các lớp học")} disabled={chatLoading}>
          Phân tích điểm các lớp
        </button>
        <button onClick={() => handleSendChatMessage("Phân tích tỷ lệ hoàn thành bài thi thử")} disabled={chatLoading}>
          Tỷ lệ hoàn thành đề thi
        </button>
        <button onClick={() => handleSendChatMessage("Đánh giá năng suất soạn đề của giáo viên")} disabled={chatLoading}>
          Năng suất giáo viên
        </button>
      </div>

      <div className="ar-chat-sidebar-input-row">
        <input
          className="ar-chat-sidebar-input"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() && !chatLoading) {
              e.preventDefault();
              handleSendChatMessage(chatInput);
            }
          }}
          placeholder="Yêu cầu AI tạo báo cáo hoặc phân tích số liệu..."
          disabled={chatLoading}
        />
        <button
          className="ar-chat-sidebar-btn-send"
          onClick={() => handleSendChatMessage(chatInput)}
          disabled={chatLoading || !chatInput.trim()}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="ar-container" style={{ background: isEmbedded ? 'transparent' : '', height: isEmbedded ? '100%' : '100vh' }}>
      {!isEmbedded && <Navbar />}
      
      {/* Split Dashboard Screen Layout */}
      <div className="ar-split-workspace">
        <div className={`ar-left-workspace-panel ${showChat ? 'with-sidebar' : 'full-width'}`}>
          <div className="ar-page-header">
            <h1 className="ar-page-main-title">Báo cáo & Phân tích hệ thống</h1>
            {!showChat && (
              <button className="ar-chat-open-btn" onClick={() => setShowChat(true)}>
                <MessageCircle size={14} /> Hỏi đáp AI Agent
              </button>
            )}
          </div>

          {loadingReport ? (
            <div className="ar-template-loading" style={{ minHeight: 400 }}>
              <Loader2 size={40} className="ar-spin" />
              <p style={{ color: 'var(--ar-text)', fontSize: 15, fontWeight: 500, marginTop: 16 }}>Đang thu thập dữ liệu và sinh báo cáo...</p>
              <p style={{ color: 'var(--ar-text-dim)', fontSize: 13 }}>Đang truy vấn trực tiếp cơ sở dữ liệu DAVictory</p>
            </div>
          ) : loadedReport ? (
            renderReportViewer()
          ) : (
            renderTemplatesList()
          )}
        </div>

        {renderChatSidebar()}
      </div>

      {/* Interactive Analysis Modal */}
      {analysisModal.isOpen && (
        <div className="ar-modal-overlay">
          <div className="ar-modal">
            <div className="ar-modal-header">
              <div className="ar-modal-title">
                <MessageSquare size={16} style={{ color: '#2563eb' }} />
                <span>Phân tích dữ liệu: {analysisModal.metricLabel}</span>
              </div>
              <button className="ar-modal-close" onClick={() => setAnalysisModal(prev => ({ ...prev, isOpen: false }))}>
                <X size={18} />
              </button>
            </div>
            <div className="ar-modal-body">
              <div className="ar-modal-metric-badge">
                <span>Giá trị chỉ số:</span>
                <strong>
                  {analysisModal.metricValue}
                  {analysisModal.metricKey === 'avg_band_score' ? ' band' : (analysisModal.metricKey === 'completion_rate' ? '%' : '')}
                </strong>
              </div>

              <div className="ar-modal-form-group">
                <label>Đặt câu hỏi về thông số này:</label>
                <textarea
                  value={analysisModal.question}
                  onChange={e => setAnalysisModal(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Nhập câu hỏi..."
                  rows={3}
                />
                <div className="ar-modal-suggestions">
                  <span>Gợi ý:</span>
                  <button onClick={() => setAnalysisModal(prev => ({ ...prev, question: `Tại sao chỉ số "${analysisModal.metricLabel}" lại đạt giá trị như vậy?` }))}>Tại sao như vậy?</button>
                  <button onClick={() => setAnalysisModal(prev => ({ ...prev, question: `Giải pháp cải thiện chỉ số "${analysisModal.metricLabel}" trong thời gian tới là gì?` }))}>Giải pháp cải thiện?</button>
                </div>
              </div>

              <button
                className="ar-modal-btn-submit"
                onClick={submitMetricAnalysis}
                disabled={analysisModal.loading || !analysisModal.question.trim()}
              >
                {analysisModal.loading ? (
                  <>
                    <Loader2 size={15} className="ar-spin" />
                    <span>Đang trích xuất dữ liệu & suy luận...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Hỏi AI Agent</span>
                  </>
                )}
              </button>

              {(analysisModal.loading || analysisModal.result) && (
                <div className="ar-modal-result-box">
                  <div className="ar-modal-result-header">
                    <Award size={13} />
                    <span>Kết quả truy vấn & phân tích nguyên nhân</span>
                  </div>
                  <div className="ar-modal-result-content">
                    {analysisModal.loading ? (
                      <div className="ar-modal-loading-placeholder">
                        <div className="ar-pulse-bar" />
                        <div className="ar-pulse-bar" style={{ width: '85%' }} />
                        <div className="ar-pulse-bar" style={{ width: '90%' }} />
                      </div>
                    ) : (
                      <div className="ar-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisModal.result}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
