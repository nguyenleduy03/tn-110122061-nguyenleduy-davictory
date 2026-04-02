import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Home, Eye, Save, Send, Settings, Shuffle, List,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ListOrdered, Undo2, Redo2, Eraser, Subscript, Superscript,
  ChevronDown, ChevronUp,
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

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;
const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_PRESETS = Array.from({ length: 21 }, (_, i) => String(MIN_FONT_SIZE + (i * 2)));

const extractIntegerText = (rawSize) => String(rawSize ?? '').match(/\d+/)?.[0] ?? '';

const normalizeEvenFontSize = (rawSize) => {
  const parsed = Number.parseInt(extractIntegerText(rawSize), 10);
  if (!Number.isFinite(parsed)) return String(DEFAULT_FONT_SIZE);

  let sizePx = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, parsed));
  if (sizePx % 2 !== 0) sizePx += 1;
  if (sizePx > MAX_FONT_SIZE) sizePx = MAX_FONT_SIZE;
  return String(sizePx);
};

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
  showFormatToolbar, onToggleFormatToolbar,
  autoSaveEnabled, onToggleAutoSave,
  savedTestId,
  previewMode,
  onPreviewToggle,
  activeSkill,
}) => {
  const [activeFormats, setActiveFormats] = useState({});
  const [customFontSize, setCustomFontSize] = useState(String(DEFAULT_FONT_SIZE));
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeMenuStyle, setSizeMenuStyle] = useState(null);
  const lastRangeRef = useRef(null);
  const lastContentEditableRef = useRef(null);
  const sizePickerRef = useRef(null);
  const sizeMenuRef = useRef(null);

  const resolveTextAlign = (node, editableEl) => {
    const seen = [];
    let current = node?.nodeType === 1 ? node : node?.parentElement;

    while (current) {
      seen.push(current);
      if (current === editableEl) break;
      current = current.parentElement;
    }

    let fallback = '';
    for (const el of seen) {
      const inlineAlign = String(el.getAttribute?.('style') || '').match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify|start|end)\s*(?:;|$)/i)?.[1]?.toLowerCase() || '';
      const attrAlign = String(el.getAttribute?.('align') || '').toLowerCase();
      const styleAlign = String(window.getComputedStyle(el).textAlign || '').toLowerCase();
      const align = inlineAlign || attrAlign || styleAlign;

      if (align === 'center' || align === 'right' || align === 'justify' || align === 'end') return align;
      if (!fallback && (align === 'left' || align === 'start')) fallback = align;
    }

    return fallback;
  };

  // Track active formatting state + save last selection
  useEffect(() => {
    const update = () => {
      try {
        const sel = window.getSelection();
        const anchorNode = sel?.anchorNode || sel?.focusNode || null;
        const anchorEl = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
        const activeEl = document.activeElement;
        const editableEl = (activeEl && activeEl.isContentEditable)
          ? activeEl
          : anchorEl?.closest?.('[contenteditable="true"]')
            || document.querySelector('[contenteditable="true"]');

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
        
        // Check CSS alignment for the selected block rather than only the root editable.
        if (editableEl) {
          const blockEl = anchorEl?.closest?.('p,div,section,article,header,footer,blockquote,figure,figcaption,h1,h2,h3,h4,h5,h6,li') || editableEl;
          const textAlign = resolveTextAlign(blockEl, editableEl) || resolveTextAlign(anchorEl, editableEl) || resolveTextAlign(sel?.focusNode, editableEl);

          states.justifyLeft = textAlign === 'left' || textAlign === 'start' || textAlign === '';
          states.justifyCenter = textAlign === 'center';
          states.justifyRight = textAlign === 'right' || textAlign === 'end';
        }
        
        setActiveFormats(states);
        if (editableEl?.isContentEditable) {
          lastContentEditableRef.current = editableEl;
        }
        if (sel?.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rangeAnchor = range.commonAncestorContainer;
          const rangeAnchorEl = rangeAnchor?.nodeType === 1 ? rangeAnchor : rangeAnchor?.parentElement;
          if (rangeAnchorEl?.closest?.('[contenteditable="true"]')) {
            lastRangeRef.current = range.cloneRange();
          }
        }
      } catch (_) {}
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  useEffect(() => {
    const onFocusIn = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.isContentEditable) {
        lastContentEditableRef.current = target;
      }
    };

    const onPointerDown = (e) => {
      const insidePicker = sizePickerRef.current?.contains(e.target);
      const insideMenu = sizeMenuRef.current?.contains(e.target);
      if (!insidePicker && !insideMenu) {
        setSizeMenuOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSizeMenuOpen(false);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!sizeMenuOpen) return undefined;

    const updateSizeMenuPosition = () => {
      const rect = sizePickerRef.current?.getBoundingClientRect();
      if (!rect || typeof window === 'undefined') return;

      const menuWidth = 84;
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      const top = rect.bottom + 4;

      setSizeMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        minWidth: `${menuWidth}px`,
      });
    };

    updateSizeMenuPosition();
    window.addEventListener('resize', updateSizeMenuPosition);
    window.addEventListener('scroll', updateSizeMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateSizeMenuPosition);
      window.removeEventListener('scroll', updateSizeMenuPosition, true);
    };
  }, [sizeMenuOpen]);

  // For select dropdowns that steal focus: restore selection then exec
  const getTargetEditable = () => {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.isContentEditable) {
      return activeEl;
    }

    const sel = window.getSelection?.();
    const anchorNode = sel?.anchorNode || sel?.focusNode || null;
    const anchorEl = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
    const selectionEditable = anchorEl?.closest?.('[contenteditable="true"]');
    return selectionEditable || lastContentEditableRef.current || document.querySelector('[contenteditable="true"]');
  };

  const captureCurrentSelection = () => {
    try {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      const anchor = range.commonAncestorContainer;
      const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
      if (anchorEl?.closest?.('[contenteditable="true"]')) {
        lastRangeRef.current = range.cloneRange();
      }
    } catch (error) {
      console.error('captureCurrentSelection error:', error);
    }
  };

  const restoreSelection = () => {
    try {
      const sel = window.getSelection();
      if (lastRangeRef.current) {
        sel.removeAllRanges();
        sel.addRange(lastRangeRef.current);
        return true;
      }
    } catch (error) {
      console.error('restoreSelection error:', error);
    }
    return false;
  };

  const restoreAndExec = (cmd, val) => {
    const editableEl = getTargetEditable();
    if (!editableEl) return;

    editableEl.focus();
    restoreSelection();

    try {
      if (['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'foreColor', 'hiliteColor', 'fontName', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'formatBlock', 'removeFormat'].includes(cmd)) {
        document.execCommand('styleWithCSS', false, true);
      }

      if (cmd === 'formatBlock') {
        const block = String(val || '').trim();
        const normalized = block.startsWith('<') ? block : `<${block}>`;
        document.execCommand(cmd, false, normalized);
      } else if (cmd.startsWith('justify')) {
        document.execCommand(cmd, false, null);
      } else {
        document.execCommand(cmd, false, val);
      }
    } catch (error) {
      console.error(`restoreAndExec '${cmd}' error:`, error);
    }

    try {
      editableEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatChange', data: null }));
    } catch {
      editableEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const applyCustomFontSize = (rawSize) => {
    const sizePx = Number.parseInt(normalizeEvenFontSize(rawSize), 10);
    if (!Number.isFinite(sizePx) || sizePx <= 0) return;

    const editableEl = getTargetEditable();
    if (!editableEl || !editableEl.isContentEditable) return;

    editableEl.focus();

    try {
      const sel = window.getSelection();
      if (lastRangeRef.current) {
        sel.removeAllRanges();
        sel.addRange(lastRangeRef.current);
      } else if (sel?.rangeCount) {
        const currentRange = sel.getRangeAt(0);
        const currentAnchor = currentRange.commonAncestorContainer;
        const currentAnchorEl = currentAnchor?.nodeType === 1 ? currentAnchor : currentAnchor?.parentElement;
        if (currentAnchorEl?.closest?.('[contenteditable="true"]')) {
          lastRangeRef.current = currentRange.cloneRange();
        }
      }

      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      
      // Nếu không có text được chọn, không làm gì
      if (range.collapsed) return;

      const wrapper = document.createElement('span');
      wrapper.style.fontSize = `${sizePx}px`;
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);

      const nextRange = document.createRange();
      nextRange.selectNodeContents(wrapper);
      nextRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(nextRange);
      lastRangeRef.current = nextRange.cloneRange();

      editableEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatChange', data: null }));
    } catch (error) {
      console.error('applyCustomFontSize error:', error);
    }
  };

  const applyPresetFontSize = (size) => {
    const next = normalizeEvenFontSize(size);
    setCustomFontSize(next);

    try {
      const sel = window.getSelection();
      if (lastRangeRef.current) {
        sel.removeAllRanges();
        sel.addRange(lastRangeRef.current);
      }
    } catch (e) {
      console.error('Failed to restore selection:', e);
    }
    
    applyCustomFontSize(next);
    setSizeMenuOpen(false);
  };

  const renderSizeMenu = () => {
    if (!sizeMenuOpen || !sizeMenuStyle || typeof document === 'undefined') return null;

    return createPortal(
      <div ref={sizeMenuRef} className="tb-size-picker-menu" style={sizeMenuStyle} onMouseDown={(e) => e.stopPropagation()}>
        {FONT_SIZE_PRESETS.map((size) => (
          <button
            key={size}
            type="button"
            className={`tb-size-picker-item${String(customFontSize) === String(size) ? ' active' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyPresetFontSize(size);
            }}
          >
            {size}
          </button>
        ))}
      </div>,
      document.body,
    );
  };

  // For buttons: preventDefault keeps focus in the contentEditable
  const btn = (cmd, val = null) => (e) => {
    e.preventDefault();

    const editableEl = getTargetEditable();
    
    if (!editableEl) {
      console.warn('No editable element found');
      return;
    }
    
    editableEl.focus();
    
    // Restore the highlighted range before applying formatting so the
    // command affects the selected instruction text, not the caret only.
    try {
      if (lastRangeRef.current) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastRangeRef.current);
      }

      if (cmd.startsWith('justify')) {
        document.execCommand(cmd, false, null);
      } else {
        document.execCommand(cmd, false, val);
      }
    } catch (error) {
      console.error(`execCommand '${cmd}' error:`, error);
    }

    try {
      editableEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatChange', data: null }));
    } catch {
      editableEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const rbnCls = (cmd) => `tb-rbn-btn${activeFormats[cmd] ? ' tb-rbn-active' : ''}`;

  return (
    <>
    <header className="tb-header">

      {/* ══════════════ ROW 1 — Title / Document bar ══════════════ */}
      <div className="tb-titlebar">
        <div className="tb-header-left">
          <Link to="/lms/teacher/tests" className="tb-back-btn" title="Danh sách đề thi"><List size={16} /></Link>
          <Link to="/" className="tb-back-btn" title="Trang chủ"><Home size={16} /></Link>
          <div className="tb-divider" />
          <input
            className="tb-title-input"
            placeholder="Nhập tiêu đề đề thi..."
            value={test.title}
            onChange={(e) => onTestChange({ title: e.target.value })}
            maxLength={255}
          />
          <span className={`tb-status-badge tb-status-${test.status?.toLowerCase()}`}>
            {STATUS_LABELS[test.status] ?? test.status}
          </span>
        </div>

        <div className="tb-header-center">
          <div className="tb-toolbar-group">
            <select className="tb-select" value={test.testType}
              onChange={(e) => onTestChange({ testType: e.target.value })}>
              <option value="ACADEMIC">Academic</option>
              <option value="GENERAL">General Training</option>
            </select>
            <select
              className="tb-select"
              value={test.seriesLabel || 'IELTS'}
              onChange={(e) => onTestChange({ seriesLabel: e.target.value })}
              title="Đổi logo đề thi"
              style={{ minWidth: 112 }}
            >
              <option value="IELTS">IELTS</option>
              <option value="Cambridge">Cambridge</option>
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
        </div>

        <div className="tb-header-right">
          {savedTestId && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '6px 12px', 
              background: '#f0fdf4', 
              borderRadius: 6,
              border: '1px solid #86efac',
              fontSize: 13
            }}>
              <span style={{ color: '#15803d', fontWeight: 600 }}>ID: {savedTestId}</span>
              <Link 
                to="/lms/teacher/assignments/new"
                state={{ testId: savedTestId, testTitle: test.title }}
                style={{ 
                  padding: '4px 10px', 
                  background: '#16a34a', 
                  color: 'white', 
                  borderRadius: 4, 
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                📝 Tạo bài tập
              </Link>
            </div>
          )}
          
          <div className="tb-toolbar-group tb-action-group">
            <button className="tb-tool-btn tb-tool-btn-primary" onClick={onSave} disabled={saving} title="Lưu đề thi">
              <Save size={15} /><span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
            {savedTestId && (
              <Link 
                to={`/teacher/assignments/create?testId=${savedTestId}`}
                className="tb-tool-btn tb-tool-btn-secondary"
                title="Lưu làm bài tập mẫu"
              >
                <List size={15} /><span>Lưu BT</span>
              </Link>
            )}
            {onToggleAutoSave && (
              <button 
                className={`tb-tool-btn ${autoSaveEnabled ? 'tb-tool-btn-active' : ''}`}
                onClick={onToggleAutoSave}
                title={autoSaveEnabled ? 'Tắt tự động lưu' : 'Bật tự động lưu'}
                style={{ 
                  background: autoSaveEnabled ? '#dcfce7' : 'transparent',
                  color: autoSaveEnabled ? '#15803d' : '#6b7280',
                  border: autoSaveEnabled ? '1px solid #86efac' : '1px solid #e5e7eb'
                }}
              >
                <Save size={15} style={{ opacity: autoSaveEnabled ? 1 : 0.5 }} />
                <span>Tự động</span>
              </button>
            )}
          </div>

          <div className="tb-toolbar-group tb-action-group">
            {test.status === 'DRAFT' && (
              <button className="tb-tool-btn tb-tool-btn-success" onClick={onSubmitReview} title="Gửi kiểm duyệt">
                <Send size={15} /><span>Gửi duyệt</span>
              </button>
            )}
            <button className="tb-tool-btn tb-tool-btn-icon" title="Cài đặt đề thi" aria-label="Cài đặt đề thi">
              <Settings size={15} />
            </button>
          </div>

          <div className="tb-toolbar-group tb-action-group">
            <button className="tb-tool-btn" onClick={onShuffle} disabled={shuffling} title="Trộn đề ngẫu nhiên">
              <Shuffle size={15} /><span>{shuffling ? 'Đang trộn...' : 'Trộn đề'}</span>
            </button>
            <button 
              className="tb-tool-btn" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreviewToggle();
              }}
              title="Xem trước đề thi"
              type="button"
            >
              <Eye size={15} /><span>{previewMode ? 'Đóng xem trước' : 'Xem trước'}</span>
            </button>
          </div>

          {saveMessage && (
            <div className={`tb-save-status ${saveMessage.includes('Lỗi') ? 'tb-save-error' : 'tb-save-success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ ROW 2 — Formatting Ribbon ══════════════ */}
      {showFormatToolbar && (
      <div className="tb-ribbon" style={{ position: 'relative' }}>

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
              onMouseDown={captureCurrentSelection}
              onFocus={captureCurrentSelection}
              onChange={(e) => restoreAndExec('fontName', e.target.value)}>
              {FONT_FAMILIES.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
            </select>
            <div className="tb-size-picker" ref={sizePickerRef}>
              <input
                className="tb-rbn-select tb-rbn-size-input tb-size-picker-input"
                type="text"
                min={8}
                max={96}
                inputMode="numeric"
                value={customFontSize}
                placeholder="16"
                onChange={(e) => setCustomFontSize(extractIntegerText(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  e.preventDefault();
                  const direction = e.deltaY > 0 ? -2 : 2;
                  const current = Number.parseInt(normalizeEvenFontSize(customFontSize), 10);
                  const fallback = Number.isFinite(current) ? current : DEFAULT_FONT_SIZE;
                  const next = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fallback + direction));
                  const evenNext = next % 2 === 0 ? next : next + 1;
                  const normalized = String(Math.min(MAX_FONT_SIZE, evenNext));
                  setCustomFontSize(normalized);
                  applyCustomFontSize(normalized);
                }}
                onBlur={() => {
                  const next = normalizeEvenFontSize(customFontSize);
                  setCustomFontSize(next);
                  applyCustomFontSize(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const next = normalizeEvenFontSize(customFontSize);
                    setCustomFontSize(next);
                    applyCustomFontSize(next);
                  }
                }}
                title="Cỡ chữ (cuộn chuột hoặc nhập số)"
              />
              <button
                type="button"
                className="tb-size-picker-toggle"
                title="Chọn cỡ chữ mặc định"
                aria-label="Chọn cỡ chữ mặc định"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Lưu selection hiện tại trước khi mở menu
                  const sel = window.getSelection();
                  if (sel?.rangeCount) {
                    lastRangeRef.current = sel.getRangeAt(0).cloneRange();
                  }
                  
                  setSizeMenuOpen((open) => !open);
                }}
              >
                <ChevronDown size={12} />
              </button>

              {renderSizeMenu()}
            </div>
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
              onMouseDown={captureCurrentSelection}
              onFocus={captureCurrentSelection}
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

      {/* Nút mũi tên ở giữa */}
      <div className="tb-ribbon-toggle-wrap">
        <button
          className="tb-ribbon-toggle-btn"
          onClick={onToggleFormatToolbar}
          title={showFormatToolbar ? 'Ẩn thanh công cụ' : 'Hiện thanh công cụ'}
        >
          {showFormatToolbar ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

    </header>

    </>
  );
};

export default BuilderHeader;
