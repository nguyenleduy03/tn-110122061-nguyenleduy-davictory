import { useState, useEffect, useMemo } from 'react';
import {
  Database, ChevronLeft, ChevronRight, Search, BookOpen, MessageSquare,
  FileJson, FileText, Archive, Filter, X, SlidersHorizontal,
} from 'lucide-react';
import { writingApi } from '../api/writingApi';

async function fetchAllSamples() {
  const pageSize = 100;
  let allSamples = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const res = await writingApi.getSamples(page, pageSize);
    const data = res.data;
    allSamples = allSamples.concat(data.samples || []);
    totalPages = data.totalPages || 1;
    page++;
  }
  return allSamples;
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsJson(samples) {
  downloadBlob(JSON.stringify(samples, null, 2), `davictory-samples-${Date.now()}.json`, 'application/json');
}

function exportAsCsv(samples) {
  const headers = ['ID','BandScore','TaskType','Topic','WordCount','PromptText','EssayText','Annotation','CreatedAt'];
  const rows = samples.map(s => [
    s.id, s.bandScore, s.taskType, s.topic, s.wordCount,
    `"${(s.promptText||'').replace(/"/g,'""')}"`,
    `"${(s.essayText||'').replace(/"/g,'""')}"`,
    `"${(s.annotation||'').replace(/"/g,'""')}"`,
    s.createdAt||'',
  ]);
  downloadBlob([headers.join(','), ...rows.map(r=>r.join(','))].join('\n'), `davictory-samples-${Date.now()}.csv`, 'text/csv;charset=utf-8');
}

function exportAsTxt(samples) {
  let out = '';
  samples.forEach(s => {
    out += `=== Essay #${s.id} | Band ${s.bandScore} | ${s.taskType} | ${s.topic} ===\n\n`;
    if (s.promptText) out += `Prompt:\n${s.promptText}\n\n`;
    out += `Essay:\n${s.essayText}\n\n`;
    if (s.annotation) out += `Annotation:\n${s.annotation}\n\n`;
    out += `${'='.repeat(60)}\n\n`;
  });
  downloadBlob(out, `davictory-samples-${Date.now()}.txt`, 'text/plain;charset=utf-8');
}

const BAND_PRESETS = [
  { label: 'All', value: 'all', min: 0, max: 9 },
  { label: 'Band 9', value: '9', min: 9, max: 9 },
  { label: 'Band 8', value: '8', min: 8, max: 8.9 },
  { label: 'Band 7', value: '7', min: 7, max: 7.9 },
  { label: 'Band 6', value: '6', min: 6, max: 6.9 },
  { label: 'Below 6', value: 'below6', min: 0, max: 5.9 },
];

const TASK_OPTIONS = [
  { label: 'All Tasks', value: 'all' },
  { label: 'Task 1 Academic', value: 'TASK1_ACADEMIC' },
  { label: 'Task 1 General', value: 'TASK1_GENERAL' },
  { label: 'Task 2 Academic', value: 'TASK2_ACADEMIC' },
  { label: 'Task 2 General', value: 'TASK2_GENERAL' },
];

export default function Samples() {
  const [allSamples, setAllSamples] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [size] = useState(25);
  const [expanded, setExpanded] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const [bandPreset, setBandPreset] = useState('all');
  const [bandMin, setBandMin] = useState('');
  const [bandMax, setBandMax] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [wordMin, setWordMin] = useState('');
  const [wordMax, setWordMax] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load all samples once on mount
  useEffect(() => {
    loadAllSamples();
  }, []);

  async function loadAllSamples() {
    setLoading(true); setError(null);
    try {
      const all = await fetchAllSamples();
      setAllSamples(all);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  }

  async function handleDownload(format) {
    setDownloading(true);
    try {
      const samples = allSamples || await fetchAllSamples();
      const filtered = applyFilters(samples);
      if (!filtered.length) { alert('No samples match filters.'); return; }
      if (format === 'json') exportAsJson(filtered);
      else if (format === 'csv') exportAsCsv(filtered);
      else exportAsTxt(filtered);
    } catch (err) {
      alert('Download failed: ' + (err.message || 'Unknown error'));
    } finally { setDownloading(false); }
  }

  function applyFilters(samples) {
    return samples.filter(s => {
      const b = s.bandScore;
      if (bandPreset !== 'all') {
        const p = BAND_PRESETS.find(x => x.value === bandPreset);
        if (p && (b < p.min || b > p.max)) return false;
      }
      if (bandMin !== '' && b < Number(bandMin)) return false;
      if (bandMax !== '' && b > Number(bandMax)) return false;
      if (taskFilter !== 'all' && s.taskType !== taskFilter) return false;
      if (topicFilter && !(s.topic || '').toLowerCase().includes(topicFilter.toLowerCase())) return false;
      if (wordMin !== '' && (s.wordCount || 0) < Number(wordMin)) return false;
      if (wordMax !== '' && (s.wordCount || 0) > Number(wordMax)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const essay = (s.essayText || '').toLowerCase();
        const prompt = (s.promptText || '').toLowerCase();
        const annotation = (s.annotation || '').toLowerCase();
        if (!essay.includes(q) && !prompt.includes(q) && !annotation.includes(q)) return false;
      }
      return true;
    });
  }

  // Compute filtered results and paginate
  const filteredAll = useMemo(() => allSamples ? applyFilters(allSamples) : [], [allSamples, bandPreset, bandMin, bandMax, taskFilter, topicFilter, searchText, wordMin, wordMax]);
  const totalFiltered = filteredAll.length;
  const totalPages = Math.ceil(totalFiltered / size);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedSamples = filteredAll.slice(safePage * size, (safePage + 1) * size);
  const taskTypes = [...new Set((allSamples || []).map(s => s.taskType))];

  const activeFilters = [
    bandPreset !== 'all' && `${BAND_PRESETS.find(x=>x.value===bandPreset)?.label}`,
    bandMin !== '' && `Min: ${bandMin}`,
    bandMax !== '' && `Max: ${bandMax}`,
    taskFilter !== 'all' && taskFilter,
    topicFilter && `Topic: ${topicFilter}`,
    searchText && `Search: "${searchText}"`,
    wordMin !== '' && `Words ≥ ${wordMin}`,
    wordMax !== '' && `Words ≤ ${wordMax}`,
  ].filter(Boolean);

  function clearFilters() {
    setBandPreset('all'); setBandMin(''); setBandMax('');
    setTaskFilter('all'); setTopicFilter(''); setSearchText('');
    setWordMin(''); setWordMax(''); setPage(0);
  }

  return (
    <div className="main">
      <div className="page-header">
        <h1><Database size={28} /> Sample Essays</h1>
        <p>Browse <strong>{allSamples?.length || 0}</strong> sample essays from the database. Click to expand and see full content.</p>
      </div>

      {/* Quick Band Chips */}
      <div className="card" style={{ marginBottom: 8, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Filter size={14} color="var(--primary)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Quick Band Filter
          </span>
          {activeFilters.length > 0 && (
            <button className="btn btn-sm" onClick={clearFilters}
              style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BAND_PRESETS.map(p => (
            <button
              key={p.value}
              className={`btn btn-sm ${bandPreset === p.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setBandPreset(p.value); setBandMin(''); setBandMax(''); setPage(0); }}
              style={{ padding: '4px 14px', fontSize: 12 }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="card" style={{ marginBottom: 16, padding: showAdvanced ? 16 : '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <SlidersHorizontal size={14} /> {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>

          {!showAdvanced && (
            <>
              <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
                <select value={taskFilter} onChange={e => { setTaskFilter(e.target.value); setPage(0); }}
                  style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--bg)' }}>
                  {TASK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
                <input placeholder="Search essay text..." value={searchText}
                  onChange={e => { setSearchText(e.target.value); setPage(0); }}
                  style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--bg)' }} />
              </div>
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="btn btn-sm btn-primary" onClick={() => handleDownload('json')} disabled={downloading}><FileJson size={13} /> JSON</button>
            <button className="btn btn-sm btn-primary" onClick={() => handleDownload('csv')} disabled={downloading}><FileText size={13} /> CSV</button>
            <button className="btn btn-sm btn-primary" onClick={() => handleDownload('txt')} disabled={downloading}><Archive size={13} /> TXT</button>
            <div style={{ width: 8 }} />
            <button className="btn btn-sm btn-secondary" onClick={loadAllSamples} disabled={loading}><Search size={13} /> Refresh</button>
          </div>
        </div>

        {showAdvanced && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
              <label style={{ fontSize: 11 }}>Task Type</label>
              <select value={taskFilter} onChange={e => { setTaskFilter(e.target.value); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }}>
                {TASK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
              <label style={{ fontSize: 11 }}>Band Min</label>
              <select value={bandMin} onChange={e => { setBandMin(e.target.value); setBandPreset('all'); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }}>
                <option value="">Any</option>
                {[0,1,2,3,4,5,6,7,8,9].map(v => <option key={v} value={v}>{v}.0</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
              <label style={{ fontSize: 11 }}>Band Max</label>
              <select value={bandMax} onChange={e => { setBandMax(e.target.value); setBandPreset('all'); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }}>
                <option value="">Any</option>
                {[0,1,2,3,4,5,6,7,8,9].map(v => <option key={v} value={v}>{v}.9</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
              <label style={{ fontSize: 11 }}>Words Min</label>
              <input type="number" placeholder="e.g. 200" value={wordMin}
                onChange={e => { setWordMin(e.target.value); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
              <label style={{ fontSize: 11 }}>Words Max</label>
              <input type="number" placeholder="e.g. 500" value={wordMax}
                onChange={e => { setWordMax(e.target.value); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 160, flex: 1 }}>
              <label style={{ fontSize: 11 }}>Topic</label>
              <input placeholder="Filter by topic..." value={topicFilter}
                onChange={e => { setTopicFilter(e.target.value); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 200, flex: 1 }}>
              <label style={{ fontSize: 11 }}>Search in essay / prompt / annotation</label>
              <input placeholder="Type to search..." value={searchText}
                onChange={e => { setSearchText(e.target.value); setPage(0); }}
                style={{ padding: '5px 10px', fontSize: 12 }} />
            </div>
          </div>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active filters:</span>
          {activeFilters.map((f, i) => (
            <span key={i} className="badge badge-info" style={{ fontSize: 11 }}>
              {f}
            </span>
          ))}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            ({totalFiltered} total, showing {pagedSamples.length})
          </span>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, color: 'var(--primary)' }}>
          <span className="spinner" /> Loading all {allSamples ? 'filtered' : 'samples from database'}...
          {allSamples && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({allSamples.length} loaded, {totalFiltered} match filters)</span>}
        </div>
      )}

      {downloading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, color: 'var(--primary)' }}>
          <span className="spinner" /> Preparing download...
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      {pagedSamples.length === 0 && !loading && (
        <div className="empty-state">
          <Database size={48} />
          <p>No samples found matching your filters</p>
          {allSamples && allSamples.length > 0 && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters} style={{ marginTop: 12 }}>
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
      )}

      {pagedSamples.map(s => (
        <div key={s.id} className="card"
          style={{ marginBottom: 8, cursor: 'pointer', borderLeft: `4px solid ${getBandColor(s.bandScore)}` }}
          onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>#{s.id}</strong>
              <span className={`badge badge-${getBandClass(s.bandScore)}`} style={{ marginLeft: 8 }}>Band {s.bandScore}</span>
              <span className="badge badge-secondary" style={{ marginLeft: 4 }}>{s.taskType}</span>
              <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>{s.topic}</span>
              <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>({s.wordCount} words)</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.createdAt?.split('T')[0]}</div>
          </div>

          {expanded === s.id && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 12 }}>
                <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); downloadBlob(JSON.stringify(s,null,2), `essay-${s.id}.json`, 'application/json'); }}>
                  <FileJson size={12} /> JSON
                </button>
                <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation();
                  const txt = `Band: ${s.bandScore}\nTask: ${s.taskType}\nTopic: ${s.topic}\nWords: ${s.wordCount}\nPrompt: ${s.promptText||'N/A'}\n\n--- Essay ---\n${s.essayText}\n\n--- Examiner Comment ---\n${s.annotation||'N/A'}`;
                  downloadBlob(txt, `essay-${s.id}.txt`, 'text/plain;charset=utf-8');
                }}>
                  <FileText size={12} /> TXT
                </button>
              </div>

              {s.promptText && s.promptText !== s.topic && s.promptText !== 'General Training essay' ? (
                <div style={{ marginBottom: 12, background: 'var(--info-bg)', padding: 12, borderRadius: 8 }}>
                  <strong><BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Question / Prompt:</strong>
                  <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0', color: 'var(--text-secondary)', fontSize: 14, fontStyle: 'italic' }}>{s.promptText}</p>
                </div>
              ) : s.promptTitle && s.promptTitle !== 'General' ? (
                <div style={{ marginBottom: 12, background: 'var(--info-bg)', padding: 12, borderRadius: 8 }}>
                  <strong><BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Topic:</strong>
                  <span style={{ marginLeft: 4, color: 'var(--text-secondary)' }}>{s.promptTitle}</span>
                </div>
              ) : null}

              <div style={{ marginBottom: 8 }}>
                <strong><MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Essay:</strong>
                <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0', fontSize: 14, lineHeight: 1.6 }}>{s.essayText}</p>
              </div>

              {s.annotation && (
                <div style={{ marginTop: 8, background: '#f0f7ff', padding: 12, borderRadius: 8 }}>
                  <strong>Examiner Comment:</strong>
                  {s.annotation.split('\n').map((line, i) => {
                    if (line.startsWith('[POSITIVE]') || line.startsWith('[negative]')) {
                      const isPos = line.startsWith('[POSITIVE]');
                      return <div key={i} style={{ margin: '2px 0', color: isPos ? '#166534' : '#991b1b', fontSize: 13 }}>
                        {isPos ? '✓ ' : '✗ '}{line.replace(/\[POSITIVE\]|\[negative\]/g, '').trim()}
                      </div>;
                    }
                    if (line.startsWith('[')) {
                      const parts = line.split(']');
                      return <div key={i} style={{ margin: '4px 0', fontWeight: 600, fontSize: 13 }}>{parts[0].replace('[','')}{parts[1] ? ']' + parts[1] : ''}</div>;
                    }
                    return <p key={i} style={{ margin: '2px 0', fontSize: 13 }}>{line}</p>;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {allSamples && totalPages > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" disabled={safePage === 0} onClick={() => setPage(0)}>
            First
          </button>
          <button className="btn btn-secondary" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Page {safePage + 1} / {totalPages}
            <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
              ({totalFiltered} total{bandPreset !== 'all' || taskFilter !== 'all' || searchText ? ' filtered' : ''})
            </span>
          </span>
          <button className="btn btn-secondary" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight size={16} />
          </button>
          <button className="btn btn-secondary btn-sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
            Last
          </button>
        </div>
      )}
    </div>
  );
}

function getBandColor(score) {
  if (score >= 9) return '#1a8a1a';
  if (score >= 8) return '#2d9f2d';
  if (score >= 7) return '#4caf50';
  if (score >= 6) return '#ff9800';
  return '#f44336';
}

function getBandClass(score) {
  if (score >= 8) return 'success';
  if (score >= 7) return 'primary';
  if (score >= 6) return 'warning';
  return 'danger';
}
