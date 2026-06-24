import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '../components/layout/Navbar';
import agentApi from '../services/agentApi';
import {
  BarChart3, Download, Calendar, FileText, Send, RefreshCw,
  Layout, Edit3, Eye, Plus, ChevronRight, Clock, BookOpen,
  TrendingUp, Award, ScanLine, Loader2, AlignLeft
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
const CATEGORY_ICONS = { tong_quan: '📊', hoc_tap: '📚', thi_cu: '📝' };
const CATEGORY_COLORS = { tong_quan: '#2563eb', hoc_tap: '#059669', thi_cu: '#d97706' };

const PERIOD_LABELS = { week: 'tuần', month: 'tháng', quarter: 'quý', year: 'năm' };

// ─── Markdown → HTML ────────────────────
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let inTable = false, inList = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/━{3,}/.test(line)) { out.push('<hr>'); continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { flushTable(); flushList(); out.push(`<h2>${h2[1]}</h2>`); continue; }
    const h3 = line.match(/^### (.+)/);
    if (h3) { flushTable(); flushList(); out.push(`<h3>${h3[1]}</h3>`); continue; }
    if (line.startsWith('|') && line.endsWith('|')) {
      const inner = line.slice(1, -1).trim();
      if (/^[\s|:\-]+$/.test(inner)) { inTable = true; continue; }
      const cells = line.split('|').filter(c => c.trim());
      inTable = true;
      const row = cells.map(c => `<td>${c.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</td>`).join('');
      out.push(`<tr>${row}</tr>`);
      continue;
    }
    if (inTable) { flushTable(); }
    const li = line.match(/^- (.+)/);
    if (li) {
      if (!inList) inList = true;
      out.push(`<li>${li[1].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`);
      continue;
    }
    if (inList) flushList();
    if (!line.trim()) { out.push(''); continue; }
    const fmt = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    out.push(`<p>${fmt}</p>`);
  }
  flushTable(); flushList();
  return out.filter(l => l !== '<p></p>').join('\n');
  function flushTable() {
    if (inTable) {
      const rows = out.splice(out.length - countBack('tr>'), countBack('tr>'));
      out.push(`<table>${rows.join('')}</table>`);
      inTable = false;
    }
  }
  function flushList() {
    if (inList) {
      const items = out.splice(out.length - countBack('li>'), countBack('li>'));
      out.push(`<ul>${items.join('')}</ul>`);
      inList = false;
    }
  }
  function countBack(prefix) {
    let c = 0;
    for (let j = out.length - 1; j >= 0 && out[j].startsWith(`<${prefix}`); j--) c++;
    return c;
  }
}

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
function BarChart({ data, title }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => d.value));
  const fmt = v => typeof v === 'number' ? (Number.isInteger(v) ? v.toString() : v.toFixed(1)) : v;
  return (
    <div style={{ margin: '8px 0 16px' }}>
      {title && <div className="ar-chart-title">{title}</div>}
      {data.map((d, i) => (
        <div key={i} className="ar-chart-bar-item">
          <div className="ar-chart-bar-label"><span>{d.label}</span><span>{fmt(d.value)}</span></div>
          <div className="ar-chart-bar-track">
            <div className="ar-chart-bar-fill" style={{ width: `${Math.min((d.value/(d.max||maxVal))*100,100)}%`, background: `linear-gradient(90deg,${COLORS[i%COLORS.length]},${COLORS[(i+1)%COLORS.length]})` }}>
              {d.value > 0 ? fmt(d.value) : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
function DonutChart({ data, title }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 60, cy = 60, r = 40, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="ar-donut-wrap">
      {title && <div className="ar-chart-title" style={{ width: '100%' }}>{title}</div>}
      <svg width={120} height={120} viewBox="0 0 120 120">
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const seg = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={COLORS[i%COLORS.length]} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} />;
          offset += len; return seg;
        })}
        <circle cx={cx} cy={cy} r={22} fill="var(--ar-surface)" />
        <text x={cx} y={cy+4} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ar-text)">{Math.round((data[0]?.value/total)*100)}%</text>
      </svg>
      <div className="ar-legend">{data.map((d,i) => <div key={i} className="ar-legend-item"><span className="ar-legend-dot" style={{background:COLORS[i%COLORS.length]}} />{d.label}: {d.value}</div>)}</div>
    </div>
  );
}
function LineChart({ data, title }) {
  if (!data?.length) return null;
  const w = 280, h = 100, pad = 10;
  const vals = data.map(d => d.value);
  const maxV = Math.max(...vals, 1), minV = Math.min(...vals, 0);
  const range = maxV - minV || 1;
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({ x: pad + i * stepX, y: h - pad - ((d.value - minV)/range) * (h - pad*2) }));
  const pathD = pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${pts[pts.length-1].x},${h-pad} L${pts[0].x},${h-pad} Z`;
  return (
    <div style={{ margin: '8px 0 16px' }}>
      {title && <div className="ar-chart-title">{title}</div>}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={areaD} fill="rgba(37,99,235,0.1)" /><path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2} />
        {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2563eb" />)}
      </svg>
    </div>
  );
}
function RadarChart({ data, title }) {
  if (!data?.length) return null;
  const cx = 80, cy = 80, r = 60, levels = 4;
  const angleStep = (2 * Math.PI) / data.length;
  const maxVal = Math.max(...data.map(d => d.max||9), 1);
  function point(index, value) {
    const angle = angleStep * index - Math.PI / 2;
    const dist = (value / maxVal) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }
  const grid = []; for (let lv=1; lv<=levels; lv++) { const pts=data.map((_,i)=>point(i,(lv/levels)*maxVal)); grid.push(pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ')+'Z'); }
  const axis = data.map((_,i) => { const p=point(i,maxVal); return `M${cx},${cy}L${p.x},${p.y}`; });
  const dataPts = data.map((d,i) => point(i, d.value));
  const dataPath = dataPts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ') + 'Z';
  return (
    <div style={{ margin: '8px 0 16px', textAlign: 'center' }}>
      {title && <div className="ar-chart-title">{title}</div>}
      <svg width={180} height={180} viewBox="0 0 160 160" style={{display:'inline-block'}}>
        {grid.map((g,i) => <path key={i} d={g} fill="none" stroke="var(--ar-border)" strokeWidth={1} strokeDasharray={i===levels-1?'0':'3,3'} />)}
        {axis.map((a,i) => <path key={i} d={a} fill="none" stroke="var(--ar-border)" strokeWidth={1} />)}
        {data.map((d,i) => { const p=point(i,maxVal*1.05); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--ar-text-dim)" fontSize={8}>{d.label}</text>; })}
        <path d={dataPath} fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth={2} />
        {dataPts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2563eb" />)}
      </svg>
      <div style={{fontSize:11,color:'var(--ar-text-secondary)',marginTop:4}}>{data.map((d,i) => <span key={i} style={{margin:'0 8px'}}>{d.label}: <strong>{d.value.toFixed(1)}</strong></span>)}</div>
    </div>
  );
}

// ─── Merge markdown + charts into full HTML ──
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
        htmlParts.push(`_Biểu đồ: ${chart.title}_`);
      }
    }
    htmlParts.push('');
  }
  return { html: htmlParts.join('\n'), chartGroups };
}

// ─── Build markdown text from sections (for editing) ──
function sectionsToMarkdown(sections) {
  return (sections || []).map(s => {
    let md = '';
    if (s.heading) md += `## ${s.heading}\n\n`;
    if (s.content) md += `${s.content}\n\n`;
    for (const chart of s.charts || []) {
      if (chart.data?.length) md += `_Biểu đồ: ${chart.title}_\n\n`;
    }
    return md;
  }).join('');
}

export default function AgentReports({ isEmbedded = false }) {
  const addToast = useToast();
  const [activeTab, setActiveTab] = useState('templates');

  // Template state
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadedReport, setLoadedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');

  // Chat state (custom report)
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('tong_quan');
  const [period, setPeriod] = useState('month');
  const msgsEnd = useRef(null);

  useEffect(() => {
    msgsEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await agentApi.getReportTemplates();
      setCategories(res.data?.categories || []);
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  }, []);

  useEffect(() => { if (activeTab === 'templates') loadTemplates(); }, [activeTab, loadTemplates]);

  const loadTemplate = async (id) => {
    setLoadingReport(true);
    setLoadedReport(null);
    try {
      const res = await agentApi.getReportTemplate(id);
      setLoadedReport(res.data);
      setEditMode(false);
    } catch (e) {
      addToast('Lỗi tạo báo cáo: ' + (e.response?.data?.detail || e.message), 'error');
    }
    setLoadingReport(false);
  };

  const handleExportWord = (report) => {
    const { html, chartGroups } = buildFullHtml(report);
    let h = mdToHtml(html);
    chartGroups.forEach(cg => {
      if (cg.type === 'bar') h += svgBarChart(cg.data, cg.title);
      else if (cg.type === 'donut') h += svgDonutChart(cg.data, cg.title);
    });
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
    const a = document.createElement('a'); a.href = url; a.download = `Bao_cao_${new Date().toISOString().slice(0,10)}.doc`;
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
      const a = document.createElement('a'); a.href = url; a.download = `Bao_cao_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { addToast('Lỗi xuất PDF: ' + e.message, 'error'); }
  };

  // Chat handlers
  const handleSend = async (text) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: text.trim(), time: new Date() }]);
    setInput('');
    try {
      const res = await agentApi.query(text, sessionId, true, 'report');
      const data = res.data;
      if (data.session_id) setSessionId(data.session_id);
      if (data.response) setMessages(prev => [...prev, { role: 'agent', text: data.response, chartGroups: data.data?.chart_groups || null, time: new Date() }]);
      if (data.session_id && (data.pending_action || !data.response)) pollResult(data.session_id);
      else setLoading(false);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', text: '❌ Lỗi: ' + (e.message || ''), time: new Date() }]);
      setLoading(false);
    }
  };

  const pollResult = (sid) => {
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
          if (r?.response) setMessages(prev => { const last = prev[prev.length-1]; if (last?.role === 'agent') return prev; return [...prev, { role: 'agent', text: r.response, chartGroups: r.data?.chart_groups || null, time: new Date() }]; });
          clearInterval(timer); setLoading(false); return;
        }
        if (failed.length > 0) { setMessages(prev => [...prev, { role: 'agent', text: '❌ ' + (failed[0].error||'Thất bại'), time: new Date() }]); clearInterval(timer); setLoading(false); return; }
        if (pc > 30) { clearInterval(timer); setLoading(false); }
      } catch { /* */ }
    }, 2000);
  };

  const handleGenerate = () => {
    const promptMap = { tong_quan: 'Tạo báo cáo tổng quan trung tâm', hoc_tap: 'Tạo báo cáo tình hình học tập chi tiết', thi_cu: 'Tạo báo cáo kết quả thi cử và điểm số' };
    const periodLabel = PERIODS.find(p => p.value === period)?.label || '';
    handleSend(input.trim() || `${promptMap[reportType]||'Tạo báo cáo'} ${periodLabel}`);
  };

  const handleSaveEdit = () => {
    if (!loadedReport) return;
    // Re-parse the edited markdown back into sections
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

  // ─── Filter templates ──────────────────
  const filteredTemplates = categories
    .filter(c => !selectedCat || c.value === selectedCat)
    .map(c => ({
      ...c,
      templates: c.templates.filter(t => selectedPeriod === 'all' || t.period === selectedPeriod),
    }))
    .filter(c => c.templates.length > 0);

  // ─── Render ────────────────────────────
  const renderTemplates = () => (
    <div className="ar-template-page">
      {/* Header section */}
      <div className="ar-template-hero">
        <div className="ar-template-hero-icon"><BarChart3 size={32} /></div>
        <div>
          <h1 className="ar-template-hero-title">Báo cáo thông minh</h1>
          <p className="ar-template-hero-desc">Chọn mẫu báo cáo có sẵn hoặc tạo báo cáo tùy chỉnh theo yêu cầu</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="ar-template-filters">
        <div className="ar-filter-group">
          <span className="ar-filter-label">Danh mục</span>
          <div className="ar-filter-chips">
            <button className={`ar-filter-chip ${!selectedCat ? 'active' : ''}`} onClick={() => setSelectedCat(null)}>Tất cả</button>
            {categories.map(c => (
              <button key={c.value} className={`ar-filter-chip ${selectedCat === c.value ? 'active' : ''}`}
                style={selectedCat === c.value ? { background: CATEGORY_COLORS[c.value], borderColor: CATEGORY_COLORS[c.value] } : {}}
                onClick={() => setSelectedCat(c.value)}>
                {CATEGORY_ICONS[c.value] || '📄'} {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ar-filter-group">
          <span className="ar-filter-label">Kỳ báo cáo</span>
          <div className="ar-filter-chips">
            <button className={`ar-filter-chip ${selectedPeriod === 'all' ? 'active' : ''}`} onClick={() => setSelectedPeriod('all')}>Tất cả</button>
            {PERIODS.map(p => (
              <button key={p.value} className={`ar-filter-chip ${selectedPeriod === p.value ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(p.value)}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template grid */}
      <div className="ar-template-grid">
        {loadingTemplates ? (
          <div className="ar-template-loading">
            <Loader2 size={32} className="ar-spin" />
            <p>Đang tải mẫu báo cáo...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="ar-template-loading">
            <p style={{ color: 'var(--ar-text-dim)' }}>Không có mẫu báo cáo nào cho bộ lọc này</p>
          </div>
        ) : filteredTemplates.map(cat => (
          cat.templates.map(t => (
            <div key={t.id} className="ar-template-card" onClick={() => loadTemplate(t.id)}>
              <div className="ar-template-card-header" style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[cat.value] || '#2563eb'}, ${CATEGORY_COLORS[cat.value] || '#2563eb'}88)` }}>
                <span className="ar-template-card-icon">{t.icon}</span>
              </div>
              <div className="ar-template-card-body">
                <span className="ar-template-card-period">{PERIOD_LABELS[t.period] || t.period}</span>
                <h3 className="ar-template-card-title">{t.title}</h3>
                <p className="ar-template-card-desc">{t.description}</p>
              </div>
              <div className="ar-template-card-footer">
                <span className="ar-template-card-tag" style={{ background: `${CATEGORY_COLORS[cat.value] || '#2563eb'}18`, color: CATEGORY_COLORS[cat.value] || '#2563eb' }}>
                  {cat.label}
                </span>
                <span className="ar-template-card-action">Sử dụng <ChevronRight size={14} /></span>
              </div>
            </div>
          ))
        ))}
      </div>
    </div>
  );

  const renderReportViewer = () => {
    if (!loadedReport) return null;
    const { html, chartGroups } = buildFullHtml(loadedReport);
    return (
      <div className="ar-report-view">
        {/* Toolbar */}
        <div className="ar-report-toolbar">
          <button className="ar-report-back" onClick={() => { setLoadedReport(null); setEditMode(false); }}>
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Quay lại
          </button>
          <div className="ar-report-toolbar-title">
            <span className="ar-report-toolbar-icon">{loadedReport.icon}</span>
            <span>{loadedReport.title}</span>
          </div>
          <div className="ar-report-toolbar-actions">
            {editMode ? (
              <>
                <button className="ar-report-btn ar-report-btn-primary" onClick={handleSaveEdit}>
                  <FileText size={15} /> Lưu
                </button>
                <button className="ar-report-btn" onClick={() => { setEditMode(false); setEditText(sectionsToMarkdown(loadedReport.sections)); }}>
                  Huỷ
                </button>
              </>
            ) : (
              <>
                <button className="ar-report-btn" onClick={() => { setEditMode(true); setEditText(sectionsToMarkdown(loadedReport.sections)); }}>
                  <Edit3 size={15} /> Chỉnh sửa
                </button>
                <button className="ar-report-btn ar-report-btn-primary" onClick={() => handleExportWord(loadedReport)}>
                  <Download size={15} /> Word
                </button>
                <button className="ar-report-btn ar-report-btn-primary" onClick={() => handleExportPdf(loadedReport)}>
                  <FileText size={15} /> PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="ar-report-content">
          {editMode ? (
            <textarea className="ar-report-editor" value={editText} onChange={e => setEditText(e.target.value)} />
          ) : (
            <>
              <div className="ar-md" dangerouslySetInnerHTML={{ __html: mdToHtml(html) }} />
              {chartGroups.map((cg, i) => {
                switch (cg.type) {
                  case 'bar': return <BarChart key={i} data={cg.data} title={cg.title} />;
                  case 'donut': return <DonutChart key={i} data={cg.data} title={cg.title} />;
                  case 'line': return <LineChart key={i} data={cg.data} title={cg.title} />;
                  case 'radar': return <RadarChart key={i} data={cg.data} title={cg.title} />;
                  default: return null;
                }
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderCustom = () => (
    <div className="ar-custom-page">
      <div className="ar-custom-hero">
        <div className="ar-custom-hero-icon"><ScanLine size={24} /></div>
        <div>
          <h2 className="ar-custom-hero-title">Tạo báo cáo tùy chỉnh</h2>
          <p className="ar-custom-hero-desc">Yêu cầu AI phân tích và tạo báo cáo theo nhu cầu riêng của bạn</p>
        </div>
      </div>

      {/* Controls */}
      {messages.length === 0 && (
        <div className="ar-controls-card" style={{ marginBottom: 16 }}>
          <div className="ar-controls-grid">
            <div className="ar-control-group">
              <label className="ar-control-label">Loại báo cáo</label>
              <select className="ar-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="ar-control-group">
              <label className="ar-control-label">Kỳ báo cáo</label>
              <div className="ar-period-group">
                {PERIODS.map(p => (
                  <button key={p.value} className={`ar-period-btn ${period === p.value ? 'active' : ''}`} onClick={() => setPeriod(p.value)}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="ar-btn-generate" onClick={handleGenerate} disabled={loading}>
              <FileText size={16} /> Tạo báo cáo
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="ar-chat">
        {messages.map((m, i) => (
          <div key={i} className={`ar-msg ${m.role === 'user' ? 'ar-msg-user' : 'ar-msg-agent'}`}>
            <div className={`ar-msg-avatar ${m.role}`}>{m.role === 'user' ? 'U' : 'AI'}</div>
            <div className="ar-msg-body">
              <div className="ar-msg-bubble">
                {m.role === 'user' ? m.text.split('\n').map((line, j) => <p key={j} style={{margin:'2px 0'}}>{line||'\u00A0'}</p>)
                  : <div className="ar-md" dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} />}
              </div>
              <div className="ar-msg-time">{m.time ? `${m.time.getHours().toString().padStart(2,'0')}:${m.time.getMinutes().toString().padStart(2,'0')}` : ''}</div>
              {m.role === 'agent' && m.chartGroups?.length > 0 && (
                <div className="ar-chart-section">
                  {m.chartGroups.map((cg, gi) => { switch(cg.type) { case 'bar': return <BarChart key={gi} data={cg.data} title={cg.title} />; case 'donut': return <DonutChart key={gi} data={cg.data} title={cg.title} />; case 'radar': return <RadarChart key={gi} data={cg.data} title={cg.title} />; case 'line': return <LineChart key={gi} data={cg.data} title={cg.title} />; default: return null; }})}
                  <div className="ar-chart-actions">
                    <button className="ar-btn-download" onClick={() => { const h = mdToHtml(m.text); let doc = `<!DOCTYPE html>...${h}</body></html>`; const b=new Blob([doc],{type:'application/msword'}); const u=URL.createObjectURL(b); const a=document.createElement('a');a.href=u;a.download=`Bao_cao_${new Date().toISOString().slice(0,10)}.doc`;a.click();URL.revokeObjectURL(u);}}><Download size={14} /> Word</button>
                    <button className="ar-btn-download" onClick={async () => { try { const res=await fetch('/api/agent/report/export-pdf',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('authToken')},body:JSON.stringify({markdown:m.text,chart_groups:m.chartGroups||[]})}); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`Bao_cao_${new Date().toISOString().slice(0,10)}.pdf`;a.click();URL.revokeObjectURL(url);} catch(e){addToast('Lỗi xuất PDF: '+e.message,'error');}}}><FileText size={14} /> PDF</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ar-loading-bubble">
            <div className="ar-msg-avatar agent" style={{margin:0}}>AI</div>
            <div className="ar-loading-dots"><div className="ar-loading-dot" /><div className="ar-loading-dot" /><div className="ar-loading-dot" /></div>
          </div>
        )}
        <div ref={msgsEnd} />
      </div>

      {/* Input */}
      <div className="ar-input-row">
        <input className="ar-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim() && !loading) { e.preventDefault(); handleSend(input); } }}
          placeholder="Nhập yêu cầu báo cáo của bạn, VD: 'Báo cáo tình hình học tập tháng này'" disabled={loading} />
        <button className="ar-btn-send" onClick={() => handleSend(input)} disabled={loading || !input.trim()}>
          {loading ? <RefreshCw size={18} className="ar-spin" /> : <Send size={18} />}
        </button>
      </div>

      {messages.length === 0 && !loading && (
        <div className="ar-custom-hint">
          <p>💡 <strong>Gợi ý:</strong> Nhập yêu cầu cụ thể như <em>"Báo cáo tình hình học tập tháng này"</em> hoặc <em>"Phân tích kết quả thi thử IELTS tuần qua"</em></p>
        </div>
      )}
    </div>
  );

  return (
    <div className="ar-container" style={{ background: isEmbedded ? 'transparent' : '', height: isEmbedded ? '100%' : '100vh' }}>
      {!isEmbedded && <Navbar />}
      <div className="ar-page">

        {/* Tabs */}
        <div className="ar-tabs">
          <button className={`ar-tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => { setActiveTab('templates'); setLoadedReport(null); }}>
            <Layout size={16} /> Mẫu báo cáo
          </button>
          <button className={`ar-tab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => { setActiveTab('custom'); setMessages([]); }}>
            <Plus size={16} /> Tạo tùy chỉnh
          </button>
        </div>

        {/* Content */}
        {activeTab === 'templates' && (loadingReport ? (
          <div className="ar-template-loading" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Loader2 size={40} className="ar-spin" />
            <p style={{ color: 'var(--ar-text)', fontSize: 15, fontWeight: 500 }}>Đang tạo báo cáo...</p>
            <p style={{ color: 'var(--ar-text-dim)', fontSize: 13 }}>Thu thập dữ liệu và phân tích bằng AI</p>
          </div>
        ) : loadedReport ? renderReportViewer() : renderTemplates())}
        {activeTab === 'custom' && renderCustom()}

      </div>
    </div>
  );
}
