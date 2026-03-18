import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Eye, Save, Send, Settings, Shuffle, List,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ListOrdered, Undo2, Redo2, Eraser, Subscript, Superscript,
} from 'lucide-react';

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  REVIEWING: 'Đang kiểm duyệt',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
};

const SKILL_OPTIONS = [
  { key: 'LISTENING', label: 'Listening' },
  { key: 'READING',   label: 'Reading'   },
  { key: 'WRITING',   label: 'Writing'   },
  { key: 'SPEAKING',  label: 'Speaking'  },
];

const FONT_FAMILIES = [
  { val: 'Arial',           label: 'Arial'           },
  { val: 'Times New Roman', label: 'Times New Roman' },
  { val: 'Courier New',     label: 'Courier New'     },
  { val: 'Georgia',         label: 'Georgia'         },
  { val: 'Verdana',         label: 'Verdana'         },
  { val: 'Calibri',         label: 'Calibri'         },
];

// execCommand fontSize: 1=8px 2=10px 3=12px 4=14px 5=18px 6=24px 7=36px
const FONT_SIZES = [
  { val: '1', label: '8'  },
  { val: '2', label: '10' },
  { val: '3', label: '12' },
  { val: '4', label: '14' },
  { val: '5', label: '18' },
  { val: '6', label: '24' },
  { val: '7', label: '36' },
];

// Builder mode tools
const BUILDER_TOOLS = [
  { id: 'region', label: 'Kéo vùng', icon: 'Zones', disabled: false },
  // Future tools can be added here
  // { id: 'text_box', label: 'Hộp chữ', icon: 'Type', disabled: true },
  // { id: 'comment', label: 'Nhận xét', icon: 'MessageSquare', disabled: true },
];

const BuilderHeader = ({
  test, onTestChange, onSave, onSubmitReview,
  saving, onPreview, onShuffle, shuffling, saveMessage, onSkillModeChange,
  builderMode, activeTool, onModeChange, onToolChange,
}) => {
  const [activeFormats, setActiveFormats] = useState({});
  const lastRangeRef = useRef(null);

  // Track active formatting state + save last selection
  useEffect(() => {
    const update = () => {
      try {
        const states = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          subscript: document.queryCommandState('subscript'),
          superscript: document.queryCommandState('superscript'),
          insertUnorderedList: document.queryCommandState('insertUnorderedList'),
          insertOrderedList: document.queryCommandState('insertOrderedList'),
          justifyLeft: false,
          justifyCenter: false,
          justifyRight: false,
        };
        
        // Check CSS alignment for active contentEditable
        const activeEl = document.activeElement;
        if (activeEl && activeEl.isContentEditable) {
          const computedStyle = window.getComputedStyle(activeEl);
          const textAlign = computedStyle.textAlign;
          
          states.justifyLeft = textAlign === 'left' || textAlign === 'start' || textAlign === '';
          states.justifyCenter = textAlign === 'center';
          states.justifyRight = textAlign === 'right' || textAlign === 'end';
        }
        
        setActiveFormats(states);
        
        const sel = window.getSelection();
        if (sel?.rangeCount > 0 && document.activeElement?.isContentEditable) {
          lastRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch (_) {}
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  // For select dropdowns that steal focus: restore selection then exec
  const restoreAndExec = (cmd, val) => {
    if (lastRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(lastRangeRef.current);
    }
    document.execCommand(cmd, false, val);
  };

  // For buttons: preventDefault keeps focus in the contentEditable
  const btn = (cmd, val = null) => (e) => {
    e.preventDefault();
    
    // Find contentEditable element
    const activeEl = document.activeElement;
    let editableEl = null;
    
    if (activeEl && activeEl.isContentEditable) {
      editableEl = activeEl;
    } else {
      editableEl = document.querySelector('[contenteditable="true"]');
    }
    
    if (!editableEl) {
      console.warn('No contentEditable element found');
      return;
    }
    
    editableEl.focus();
    
    // Use CSS for alignment commands
    if (cmd.startsWith('justify')) {
      const alignMap = {
        'justifyLeft': 'left',
        'justifyCenter': 'center', 
        'justifyRight': 'right',
        'justifyFull': 'justify'
      };
      editableEl.style.textAlign = alignMap[cmd] || 'left';
    } else {
      // Use execCommand for other formatting
      try {
        document.execCommand(cmd, false, val);
      } catch (error) {
        console.error(`execCommand '${cmd}' error:`, error);
      }
    }
  };

  const rbnCls = (cmd) => `tb-rbn-btn${activeFormats[cmd] ? ' tb-rbn-active' : ''}`;

  return (
    <header className="tb-header">

      {/* ══════════════ ROW 1 — Title / Document bar ══════════════ */}
      <div className="tb-titlebar">
        <div className="tb-header-left">
          <Link to="/" className="tb-back-btn" title="Trang chủ"><ArrowLeft size={16} /></Link>
          <Link to="/lms/teacher/tests" className="tb-back-btn" title="Danh sách đề thi"><List size={16} /></Link>
          <div className="tb-divider" />
          <input
            className="tb-title-input"
            placeholder="Nhập tiêu đề đề thi..."
            value={test.title}
            onChange={(e) => onTestChange({ title: e.target.value })}
            maxLength={255}
          />
        </div>

        <div className="tb-header-center">
          <div className="tb-toolbar-group">
            <select className="tb-select" value={test.testType}
              onChange={(e) => onTestChange({ testType: e.target.value })}>
              <option value="ACADEMIC">Academic</option>
              <option value="GENERAL">General Training</option>
            </select>
            <select className="tb-select"
              value={test.isFullTest ? 'FULL' : (test.singleSkill || 'LISTENING')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'FULL') onSkillModeChange({ isFullTest: true, singleSkill: null });
                else onSkillModeChange({ isFullTest: false, singleSkill: val });
              }}>
              <option value="FULL">Full Test</option>
              {SKILL_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <span className={`tb-status-badge tb-status-${test.status?.toLowerCase()}`}>
            {STATUS_LABELS[test.status] ?? test.status}
          </span>
        </div>

        <div className="tb-header-right">
          {/* ██ Mode Toggle + Tool Selector ██ */}
          <div className="tb-toolbar-group">
            {/* Mode Toggle Button */}
            <button 
              className={`tb-mode-toggle ${builderMode === 'format' ? 'tb-mode-format' : 'tb-mode-builder'}`}
              onClick={() => {
                onModeChange?.(builderMode === 'format' ? 'builder' : 'format');
                // Clear tool selection when switching modes
                if (builderMode === 'format') {
                  onToolChange?.('region');
                }
              }}
              title={`Chế độ: ${builderMode === 'format' ? 'Định dạng' : 'Tạo đề'}`}
            >
              {builderMode === 'format' ? (
                <>
                  <Settings size={14} />
                  <span>Định dạng</span>
                </>
              ) : (
                <>
                  <Settings size={14} />
                  <span>Tạo đề</span>
                </>
              )}
            </button>

            {/* Tool Selector - only show in BUILDER mode */}
            {builderMode === 'builder' && (
              <>
                <div className="tb-divider" style={{ margin: '0 4px' }} />
                {BUILDER_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    className={`tb-tool-selector-btn${activeTool === tool.id ? ' active' : ''}${tool.disabled ? ' disabled' : ''}`}
                    onClick={() => !tool.disabled && onToolChange?.(tool.id)}
                    disabled={tool.disabled}
                    title={tool.label}
                  >
                    <Settings size={14} />
                    <span>{tool.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="tb-divider" />
          <div className="tb-toolbar-group">
            <button className="tb-tool-btn" onClick={onShuffle} disabled={shuffling} title="Trộn đề ngẫu nhiên">
              <Shuffle size={15} /><span>{shuffling ? 'Đang trộn...' : 'Trộn đề'}</span>
            </button>
            <button className="tb-tool-btn" onClick={onPreview} title="Xem trước">
              <Eye size={15} /><span>Xem trước</span>
            </button>
          </div>
          <div className="tb-divider" />
          <div className="tb-toolbar-group">
            <button className="tb-tool-btn tb-tool-btn-primary" onClick={onSave} disabled={saving} title="Lưu đề thi">
              <Save size={15} /><span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
            {test.status === 'DRAFT' && (
              <button className="tb-tool-btn tb-tool-btn-success" onClick={onSubmitReview} title="Gửi kiểm duyệt">
                <Send size={15} /><span>Gửi duyệt</span>
              </button>
            )}
            <button className="tb-tool-btn" title="Cài đặt đề thi"><Settings size={15} /></button>
          </div>
          {saveMessage && (
            <div className={`tb-save-status ${saveMessage.includes('Lỗi') ? 'tb-save-error' : 'tb-save-success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ ROW 2 — Formatting Ribbon ══════════════ */}
      {builderMode === 'format' && (
      <div className="tb-ribbon">

        {/* ── Lịch sử ── */}
        <div className="tb-rgroup">
          <div className="tb-rgroup-btns">
            <button className="tb-rbn-btn" onMouseDown={btn('undo')} title="Hoàn tác (Ctrl+Z)"><Undo2 size={14} /></button>
            <button className="tb-rbn-btn" onMouseDown={btn('redo')} title="Làm lại (Ctrl+Y)"><Redo2 size={14} /></button>
          </div>
          <span className="tb-rgroup-lbl">Lịch sử</span>
        </div>

        <div className="tb-rsep" />

        {/* ── Phông chữ ── */}
        <div className="tb-rgroup">
          <div className="tb-rgroup-btns">
            <select className="tb-rbn-select" style={{ width: 126 }} title="Font chữ"
              onChange={(e) => restoreAndExec('fontName', e.target.value)}>
              {FONT_FAMILIES.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
            </select>
            <select className="tb-rbn-select" style={{ width: 52 }} title="Cỡ chữ"
              onChange={(e) => restoreAndExec('fontSize', e.target.value)}>
              {FONT_SIZES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
          </div>
          <span className="tb-rgroup-lbl">Phông chữ</span>
        </div>

        <div className="tb-rsep" />

        {/* ── Định dạng chữ ── */}
        <div className="tb-rgroup">
          <div className="tb-rgroup-btns">
            <button className={rbnCls('bold')}        onMouseDown={btn('bold')}        title="In đậm (Ctrl+B)">      <Bold size={14} /></button>
            <button className={rbnCls('italic')}      onMouseDown={btn('italic')}      title="In nghiêng (Ctrl+I)">  <Italic size={14} /></button>
            <button className={rbnCls('underline')}   onMouseDown={btn('underline')}   title="Gạch chân (Ctrl+U)">  <Underline size={14} /></button>
            <button className={rbnCls('strikeThrough')} onMouseDown={btn('strikeThrough')} title="Gạch ngang">       <Strikethrough size={14} /></button>
            <span className="tb-rsep-mini" />
            <button className={rbnCls('superscript')} onMouseDown={btn('superscript')} title="Chỉ số trên">         <Superscript size={14} /></button>
            <button className={rbnCls('subscript')}   onMouseDown={btn('subscript')}   title="Chỉ số dưới">         <Subscript size={14} /></button>
          </div>
          <span className="tb-rgroup-lbl">Chữ</span>
        </div>

        <div className="tb-rsep" />

        {/* ── Màu sắc ── */}
        <div className="tb-rgroup">
          <div className="tb-rgroup-btns">
            <label className="tb-rbn-color-lbl" title="Màu chữ">
              <span className="tb-rbn-color-icon">A</span>
              <input type="color" className="tb-rbn-color-input" defaultValue="#000000"
                onInput={(e) => document.execCommand('foreColor', false, e.target.value)} />
            </label>
            <label className="tb-rbn-color-lbl" title="Màu nền chữ">
              <span className="tb-rbn-color-icon tb-rbn-hl">▣</span>
              <input type="color" className="tb-rbn-color-input" defaultValue="#ffff00"
                onInput={(e) => document.execCommand('hiliteColor', false, e.target.value)} />
            </label>
            <button className="tb-rbn-btn" onMouseDown={btn('removeFormat')} title="Xóa toàn bộ định dạng">
              <Eraser size={14} />
            </button>
          </div>
          <span className="tb-rgroup-lbl">Màu sắc</span>
        </div>

        <div className="tb-rsep" />

        {/* ── Đoạn văn ── */}
        <div className="tb-rgroup">
          <div className="tb-rgroup-btns">
            <button className={rbnCls('justifyLeft')}   onMouseDown={btn('justifyLeft')}   title="Căn trái">       <AlignLeft size={14} /></button>
            <button className={rbnCls('justifyCenter')} onMouseDown={btn('justifyCenter')} title="Căn giữa">       <AlignCenter size={14} /></button>
            <button className={rbnCls('justifyRight')}  onMouseDown={btn('justifyRight')}  title="Căn phải">       <AlignRight size={14} /></button>
            <button className="tb-rbn-btn"               onMouseDown={btn('justifyFull')}   title="Căn đều 2 bên"> <AlignJustify size={14} /></button>
            <span className="tb-rsep-mini" />
            <button className={rbnCls('insertUnorderedList')} onMouseDown={btn('insertUnorderedList')} title="Danh sách gạch đầu dòng">
              <List size={14} />
            </button>
            <button className={rbnCls('insertOrderedList')} onMouseDown={btn('insertOrderedList')} title="Danh sách có số thứ tự">
              <ListOrdered size={14} />
            </button>
            <span className="tb-rsep-mini" />
            <button className="tb-rbn-btn" onMouseDown={btn('outdent')} title="Giảm thụt lề" style={{ fontSize: 13, fontWeight: 700 }}>⇤</button>
            <button className="tb-rbn-btn" onMouseDown={btn('indent')}  title="Tăng thụt lề" style={{ fontSize: 13, fontWeight: 700 }}>⇥</button>
          </div>
          <span className="tb-rgroup-lbl">Đoạn văn</span>
        </div>

        <div className="tb-rsep" />

        {/* ── Kiểu chữ (Heading) ── */}
        <div className="tb-rgroup">
          <div className="tb-rgroup-btns">
            <select className="tb-rbn-select" style={{ width: 138 }} title="Kiểu văn bản"
              onChange={(e) => restoreAndExec('formatBlock', e.target.value)}>
              <option value="p">Văn bản thường</option>
              <option value="h1">Tiêu đề 1</option>
              <option value="h2">Tiêu đề 2</option>
              <option value="h3">Tiêu đề 3</option>
              <option value="blockquote">Trích dẫn</option>
              <option value="pre">Code</option>
            </select>
          </div>
          <span className="tb-rgroup-lbl">Kiểu chữ</span>
        </div>

      </div>
      )}
    </header>
  );
};

export default BuilderHeader;
