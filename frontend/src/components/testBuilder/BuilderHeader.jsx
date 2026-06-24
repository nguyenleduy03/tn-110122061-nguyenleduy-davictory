import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Home, Eye, Save, Send, Settings, Shuffle, List, CheckCircle2, Loader2, Mic,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ListOrdered, Undo2, Redo2, Eraser, Subscript, Superscript,
  ChevronDown, ChevronUp, Upload,
} from 'lucide-react';

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  REVIEWING: 'Đang kiểm duyệt',
  TEST_EXAM: 'Test Exam',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
};

const SKILL_OPTIONS = [
  { key: 'LISTENING', label: 'Listening' },
  { key: 'READING', label: 'Reading' },
  { key: 'WRITING', label: 'Writing' },
  { key: 'SPEAKING', label: 'Speaking' },
];

const FONT_FAMILIES = [
  { val: 'Arial', label: 'Arial' },
  { val: 'Times New Roman', label: 'Times New Roman' },
  { val: 'Courier New', label: 'Courier New' },
  { val: 'Georgia', label: 'Georgia' },
  { val: 'Verdana', label: 'Verdana' },
  { val: 'Calibri', label: 'Calibri' },
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
  onReviewSpeaking,
  activeSkill,
  onOpenVersionHistory,
  hasUnsavedChanges,
  onNavigate,
  onOpenImport,
}) => {
  const [activeFormats, setActiveFormats] = useState({});
  const [customFontSize, setCustomFontSize] = useState(String(DEFAULT_FONT_SIZE));
  const [currentLineHeight, setCurrentLineHeight] = useState('');
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeMenuStyle, setSizeMenuStyle] = useState(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsMenuStyle, setSettingsMenuStyle] = useState(null);
  const [savedMenuOpen, setSavedMenuOpen] = useState(false);
  const [savedMenuStyle, setSavedMenuStyle] = useState(null);
  const lastRangeRef = useRef(null);
  const lastContentEditableRef = useRef(null);
  const sizePickerRef = useRef(null);
  const sizeMenuRef = useRef(null);
  const settingsBtnRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const savedMenuBtnRef = useRef(null);
  const savedMenuRef = useRef(null);

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

  const resolveFontSize = (node, editableEl) => {
    const seen = [];
    let current = node?.nodeType === 1 ? node : node?.parentElement;

    while (current) {
      seen.push(current);
      if (current === editableEl) break;
      current = current.parentElement;
    }

    for (const el of seen) {
      const inlineSize = String(el.getAttribute?.('style') || '').match(/(?:^|;)\s*font-size\s*:\s*([^;]+)\s*(?:;|$)/i)?.[1];
      if (inlineSize) return normalizeEvenFontSize(inlineSize);

      const computedSize = String(window.getComputedStyle(el).fontSize || '').trim();
      const px = computedSize.match(/\d+(?:\.\d+)?/)?.[0];
      if (px) return normalizeEvenFontSize(px);
    }

    return '';
  };

  const resolveSelectionNode = (range, editableEl) => {
    if (!range) return editableEl || null;

    const { startContainer, startOffset } = range;
    if (!startContainer) return editableEl || null;

    if (startContainer.nodeType === 3) {
      return startContainer.parentElement || editableEl || null;
    }

    if (startContainer.nodeType === 1) {
      const element = startContainer;
      const beforeNode = element.childNodes?.[Math.max(0, startOffset - 1)] || null;
      const atNode = element.childNodes?.[startOffset] || null;
      const candidate = beforeNode || atNode || element;
      if (candidate?.nodeType === 3) return candidate.parentElement || element || editableEl || null;
      if (candidate?.nodeType === 1) return candidate;
      return element;
    }

    return startContainer.parentElement || editableEl || null;
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
        if (editableEl) {
          const currentRange = sel?.rangeCount > 0 ? sel.getRangeAt(0) : null;
          const selectionNode = resolveSelectionNode(currentRange, editableEl) || anchorEl || editableEl;
          const activeFontSize = resolveFontSize(selectionNode, editableEl);
          if (activeFontSize) {
            setCustomFontSize((prev) => (String(prev) === String(activeFontSize) ? prev : activeFontSize));
          }
          
          // Đọc line-height hiện tại
          let lh = '';
          let curr = selectionNode;
          
          // Danh sách các giá trị hợp lệ để nhận diện
          const validOptions = ['1.5', '1.8', '2.0', '2.2', '2.4', '2.6'];

          while (curr && curr !== editableEl.parentElement) {
            if (curr.nodeType === 1) {
              // Ưu tiên kiểm tra inline style trước vì đó là nơi ta lưu giá trị giãn dòng
              const inlineStyle = curr.getAttribute('style') || '';
              const match = inlineStyle.match(/line-height\s*:\s*([^;]+)/i);
              
              if (match) {
                const val = match[1].trim();
                // Nếu là giá trị số thuần túy (không đơn vị)
                if (/^\d+(\.\d+)?$/.test(val)) {
                  lh = val;
                  break;
                }
              }

              // Nếu không có inline style, kiểm tra computed style nhưng chỉ lấy nếu nó khớp với các option của ta
              const styleLh = window.getComputedStyle(curr).lineHeight;
              if (styleLh && !styleLh.includes('normal')) {
                const num = parseFloat(styleLh);
                if (!isNaN(num)) {
                  let computedLh = '';
                  if (styleLh.includes('px')) {
                    const fs = parseFloat(window.getComputedStyle(curr).fontSize);
                    computedLh = (num / fs).toFixed(1);
                  } else {
                    computedLh = String(num);
                  }
                  
                  // Chỉ lấy nếu nó gần giống với một trong các option (tránh lấy nhầm giá trị mặc định của trình duyệt)
                  if (validOptions.some(opt => Math.abs(parseFloat(opt) - parseFloat(computedLh)) < 0.05)) {
                    lh = computedLh;
                    break;
                  }
                }
              }
            }
            curr = curr.parentElement;
          }
          setCurrentLineHeight(lh || '');
        }
        if (sel?.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rangeAnchor = range.commonAncestorContainer;
          const rangeAnchorEl = rangeAnchor?.nodeType === 1 ? rangeAnchor : rangeAnchor?.parentElement;
          if (rangeAnchorEl?.closest?.('[contenteditable="true"]')) {
            lastRangeRef.current = range.cloneRange();
          }
        }
      } catch (_) { }
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
      const insideSettingsButton = settingsBtnRef.current?.contains(e.target);
      const insideSettingsMenu = settingsMenuRef.current?.contains(e.target);
      const insideSavedButton = savedMenuBtnRef.current?.contains(e.target);
      const insideSavedMenu = savedMenuRef.current?.contains(e.target);
      if (!insidePicker && !insideMenu) {
        setSizeMenuOpen(false);
      }
      if (!insideSettingsButton && !insideSettingsMenu) {
        setSettingsMenuOpen(false);
      }
      if (!insideSavedButton && !insideSavedMenu) {
        setSavedMenuOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSizeMenuOpen(false);
      if (e.key === 'Escape') setSettingsMenuOpen(false);
      if (e.key === 'Escape') setSavedMenuOpen(false);
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

  useEffect(() => {
    if (!settingsMenuOpen) return undefined;

    const updateSettingsMenuPosition = () => {
      const rect = settingsBtnRef.current?.getBoundingClientRect();
      if (!rect || typeof window === 'undefined') return;

      const menuWidth = 252;
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      const top = rect.bottom + 4;

      setSettingsMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        minWidth: `${menuWidth}px`,
      });
    };

    updateSettingsMenuPosition();
    window.addEventListener('resize', updateSettingsMenuPosition);
    window.addEventListener('scroll', updateSettingsMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateSettingsMenuPosition);
      window.removeEventListener('scroll', updateSettingsMenuPosition, true);
    };
  }, [settingsMenuOpen]);

  useEffect(() => {
    if (!savedMenuOpen) return undefined;

    const updateSavedMenuPosition = () => {
      const rect = savedMenuBtnRef.current?.getBoundingClientRect();
      if (!rect || typeof window === 'undefined') return;

      const menuWidth = 208;
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      const top = rect.bottom + 4;

      setSavedMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        minWidth: `${menuWidth}px`,
      });
    };

    updateSavedMenuPosition();
    window.addEventListener('resize', updateSavedMenuPosition);
    window.addEventListener('scroll', updateSavedMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateSavedMenuPosition);
      window.removeEventListener('scroll', updateSavedMenuPosition, true);
    };
  }, [savedMenuOpen]);

  // For select dropdowns that steal focus: restore selection then exec
  // IMPORTANT: Không dùng document.querySelector('[contenteditable]') vì có nhiều editable trên trang.
  // Chỉ dùng lastContentEditableRef (element cuối cùng user tương tác).
  const getTargetEditable = () => {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.isContentEditable) {
      return activeEl;
    }

    const sel = window.getSelection?.();
    const anchorNode = sel?.anchorNode || sel?.focusNode || null;
    const anchorEl = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
    const selectionEditable = anchorEl?.closest?.('[contenteditable="true"]');
    // lastContentEditableRef.current là element cuối user focus vào — đúng hơn querySelector đầu tiên.
    return selectionEditable || lastContentEditableRef.current || null;
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

  const syncCurrentSelection = (editableEl) => {
    try {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      const anchor = range.commonAncestorContainer;
      const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
      if (editableEl?.contains?.(anchorEl)) {
        lastContentEditableRef.current = editableEl;
        lastRangeRef.current = range.cloneRange();
      }
    } catch (error) {
      console.error('syncCurrentSelection error:', error);
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

    syncCurrentSelection(editableEl);
  };

  const applyCustomFontSize = (rawSize) => {
    const sizePx = Number.parseInt(normalizeEvenFontSize(rawSize), 10);
    if (!Number.isFinite(sizePx) || sizePx <= 0) return;

    const editableEl = getTargetEditable();
    if (!editableEl || !editableEl.isContentEditable) return;

    editableEl.focus();

    try {
      const sel = window.getSelection();

      // Khôi phục selection đã lưu (từ trước khi focus rời contenteditable)
      if (lastRangeRef.current) {
        try {
          // Kiểm tra range còn hợp lệ không (node chưa bị remove khỏi DOM)
          const rangeAnchor = lastRangeRef.current.commonAncestorContainer;
          if (rangeAnchor && editableEl.contains(rangeAnchor)) {
            sel.removeAllRanges();
            sel.addRange(lastRangeRef.current);
          } else {
            // Range stale — không khôi phục, reset để tránh apply sai vị trí
            lastRangeRef.current = null;
          }
        } catch (_rangeErr) {
          lastRangeRef.current = null;
        }
      }

      // Nếu sau khi restore vẫn không có range, thử lấy từ selection hiện tại
      if (!sel?.rangeCount) {
        // Không có selection, không thể áp dụng font size
        return;
      }

      const range = sel.getRangeAt(0);

      // Verify range nằm trong editable đúng
      const rangeAnchor = range.commonAncestorContainer;
      const rangeAnchorEl = rangeAnchor?.nodeType === 1 ? rangeAnchor : rangeAnchor?.parentElement;
      if (!rangeAnchorEl?.closest?.('[contenteditable="true"]')) return;

      if (range.collapsed) {
        // Không có text chọn: áp dụng cỡ chữ cho lần gõ tiếp theo bằng execCommand fontSize.
        // Dùng CSS thông qua styleWithCSS để tương thích các trình duyệt.
        try {
          document.execCommand('styleWithCSS', false, true);
          // execCommand fontSize chỉ nhận giá trị 1-7 (HTML font size)
          // Dùng wrapper span thay thế để không giới hạn ở 7 mức.
          // Chèn span rỗng với font-size CSS làm điểm neo cỡ chữ.
          const marker = document.createElement('span');
          marker.style.fontSize = `${sizePx}px`;
          marker.textContent = '\u200B'; // Zero-width space để có thể đặt caret vào
          range.insertNode(marker);
          const afterMarker = document.createRange();
          afterMarker.setStart(marker.firstChild, marker.firstChild.length);
          afterMarker.collapse(true);
          sel.removeAllRanges();
          sel.addRange(afterMarker);
          lastRangeRef.current = afterMarker.cloneRange();
        } catch (_) {
          // Bỏ qua nếu không thể áp dụng
        }
      } else {
        // Có text đang chọn: wrap bằng span với font-size
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
      }

      editableEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatChange', data: null }));
    } catch (error) {
      console.error('applyCustomFontSize error:', error);
    }

    syncCurrentSelection(editableEl);
  };

  const applyPresetFontSize = (size) => {
    const next = normalizeEvenFontSize(size);
    // Cập nhật UI input đồng bộ
    setCustomFontSize(next);
    // Đóng menu trước khi apply để tránh event conflict
    setSizeMenuOpen(false);
    // Áp dụng ngay lập tức với giá trị đã tính (không chờ React re-render)
    // lastRangeRef đã được lưu khi user click nút toggle menu.
    applyCustomFontSize(next);
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

  const renderSettingsMenu = () => {
    if (!settingsMenuOpen || !settingsMenuStyle || typeof document === 'undefined') return null;

    return createPortal(
      <div ref={settingsMenuRef} className="tb-settings-menu" style={settingsMenuStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div className="tb-settings-menu-row">
          <span className="tb-settings-menu-label">Loại đề</span>
          <select
            className="tb-select tb-settings-menu-select"
            value={test.testType}
            onChange={(e) => onTestChange({ testType: e.target.value })}
          >
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General Training</option>
          </select>
        </div>
        <div className="tb-settings-menu-row">
          <span className="tb-settings-menu-label">Logo</span>
          <select
            className="tb-select tb-settings-menu-select"
            value={test.seriesLabel || 'IELTS'}
            onChange={(e) => onTestChange({ seriesLabel: e.target.value })}
          >
            <option value="IELTS">IELTS</option>
            <option value="Cambridge">Cambridge</option>
          </select>
        </div>
        <div className="tb-settings-menu-row">
          <span className="tb-settings-menu-label">Dạng đề</span>
          <select
            className="tb-select tb-settings-menu-select"
            value={test.isFullTest ? 'FULL' : (test.singleSkill || 'LISTENING')}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'FULL') onSkillModeChange({ isFullTest: true, singleSkill: null });
              else onSkillModeChange({ isFullTest: false, singleSkill: val });
            }}
          >
            <option value="FULL">Full Test</option>
            {SKILL_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>,
      document.body,
    );
  };

  const renderSavedMenu = () => {
    if (!savedTestId || !savedMenuOpen || !savedMenuStyle || typeof document === 'undefined') return null;

    return createPortal(
      <div ref={savedMenuRef} className="tb-saved-menu" style={savedMenuStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div className="tb-saved-menu-head">ID {savedTestId}</div>
        <Link
          to="/lms/teacher/assignments/new"
          state={{ testId: savedTestId, testTitle: test.title }}
          className="tb-saved-menu-item"
          onClick={() => setSavedMenuOpen(false)}
        >
          Tạo BT
        </Link>
        <Link
          to={`/teacher/assignments/create?testId=${savedTestId}`}
          className="tb-saved-menu-item"
          onClick={() => setSavedMenuOpen(false)}
        >
          Lưu BT
        </Link>
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
            <button 
              onClick={() => onNavigate?.('/lms/teacher/tests')}
              className="tb-back-btn" 
              title="Danh sách đề thi"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <List size={16} />
            </button>
            <button 
              onClick={() => onNavigate?.('/')}
              className="tb-back-btn" 
              title="Trang chủ"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Home size={16} />
            </button>
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

          <div className="tb-header-center" />

          <div className="tb-header-right">
            <div className="tb-toolbar-group tb-action-group tb-save-group">
              {!autoSaveEnabled && (
                <button className="tb-tool-btn tb-tool-btn-primary tb-tool-btn-compact" onClick={onSave} disabled={saving} title="Lưu đề thi">
                  <Save size={15} /><span className="tb-btn-text">{saving ? 'Đang lưu...' : 'Lưu'}</span>
                </button>
              )}
              {savedTestId && (
                <button
                  ref={savedMenuBtnRef}
                  type="button"
                  className={`tb-tool-btn tb-tool-btn-secondary tb-tool-btn-compact tb-saved-menu-btn ${savedMenuOpen ? 'tb-tool-btn-active' : ''}`}
                  title="Đề đã lưu"
                  onClick={() => setSavedMenuOpen((open) => !open)}
                >
                  <List size={15} />
                  <span className="tb-btn-text">ID {savedTestId}</span>
                </button>
              )}
              {onOpenVersionHistory && savedTestId && (
                <button
                  type="button"
                  className="tb-tool-btn tb-tool-btn-secondary tb-tool-btn-compact"
                  onClick={onOpenVersionHistory}
                  title="Lịch sử phiên bản"
                >
                  <List size={15} />
                  <span className="tb-btn-text">Phiên bản</span>
                </button>
              )}
              {onToggleAutoSave && (
                <button
                  className={`tb-tool-btn tb-tool-btn-compact tb-auto-save-btn ${autoSaveEnabled ? 'tb-tool-btn-active' : ''}`}
                  onClick={onToggleAutoSave}
                  title={autoSaveEnabled ? 'Tắt tự động lưu' : 'Bật tự động lưu'}
                >
                  <Save size={15} style={{ opacity: autoSaveEnabled ? 1 : 0.5 }} />
                  <span className="tb-auto-save-label">Tự động</span>
                  {autoSaveEnabled && (
                    <span className="tb-auto-indicator">
                      <span className={`tb-auto-dot ${autoSaveEnabled ? 'is-on' : ''}`} />
                      {saving ? (
                        <span className="tb-auto-save-state is-saving" title="Đang lưu..." aria-label="Đang lưu...">
                          <Loader2 size={13} className="tb-auto-save-spinner" aria-hidden="true" />
                        </span>
                      ) : saveMessage && saveMessage.includes('thành công') ? (
                        <span className="tb-auto-save-state is-success" title={saveMessage} aria-label={saveMessage}>
                          <CheckCircle2 size={13} />
                        </span>
                      ) : null}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="tb-toolbar-group tb-action-group">
              {test.status === 'DRAFT' && (
                <button className="tb-tool-btn tb-tool-btn-success" onClick={onSubmitReview} title="Gửi kiểm duyệt">
                  <Send size={15} /><span>Gửi duyệt</span>
                </button>
              )}
              <button ref={settingsBtnRef} className={`tb-tool-btn tb-tool-btn-icon ${settingsMenuOpen ? 'tb-tool-btn-active' : ''}`} title="Cài đặt đề thi" aria-label="Cài đặt đề thi" onClick={() => setSettingsMenuOpen((open) => !open)}>
                <Settings size={15} />
              </button>
            </div>

            <div className="tb-toolbar-group tb-action-group">
              <button className="tb-tool-btn" onClick={onOpenImport} title="Import đề thi từ tài liệu (PDF/DOCX/TXT)"
                style={{ background: '#f0f7ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                <Upload size={15} /><span>Import</span>
              </button>
              <button className="tb-tool-btn" onClick={onShuffle} disabled={shuffling} title="Trộn đề ngẫu nhiên">
                <Shuffle size={15} /><span>{shuffling ? 'Đang trộn...' : 'Trộn đề'}</span>
              </button>
              {activeSkill === 'SPEAKING' && (
                <button className="tb-tool-btn" onClick={onReviewSpeaking} title="Review cấu hình Speaking"
                  style={{ background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8' }}>
                  <Mic size={15} /><span>Review Speaking</span>
                </button>
              )}
              <button
                className="tb-tool-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onPreviewToggle({
                    origin: {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                    },
                  });
                }}
                title="Xem trước đề thi"
                type="button"
              >
                <Eye size={15} /><span>{previewMode ? 'Đóng xem trước' : 'Xem trước'}</span>
              </button>
            </div>

            {saveMessage && !autoSaveEnabled && (
              <div className={`tb-save-status ${saveMessage.includes('Lỗi') ? 'tb-save-error' : 'tb-save-success'}`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>
        {renderSavedMenu()}
        {renderSettingsMenu()}

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
                    onMouseDown={(e) => {
                      // Capture selection TRƯỚC khi input nhận focus (trước khi selection bị clear)
                      captureCurrentSelection();
                      e.stopPropagation();
                    }}
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

                      // Lưu selection hiện tại trước khi mở menu.
                      // Phải lưu cả lastContentEditableRef nếu selection không nằm trong editable.
                      const sel = window.getSelection();
                      if (sel?.rangeCount) {
                        const r = sel.getRangeAt(0);
                        const anchor = r.commonAncestorContainer;
                        const anchorEl = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
                        const insideEditable = anchorEl?.closest?.('[contenteditable="true"]');
                        if (insideEditable) {
                          // Capture cả lastContentEditableRef để getTargetEditable() trả về đúng
                          lastContentEditableRef.current = insideEditable;
                          lastRangeRef.current = r.cloneRange();
                        } else if (lastRangeRef.current) {
                          // Giữ nguyên lastRangeRef đã có từ trước
                        }
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
                <button className={rbnCls('bold')} onMouseDown={btn('bold')} title="In đậm (Ctrl+B)">      <Bold size={14} /></button>
                <button className={rbnCls('italic')} onMouseDown={btn('italic')} title="In nghiêng (Ctrl+I)">  <Italic size={14} /></button>
                <button className={rbnCls('underline')} onMouseDown={btn('underline')} title="Gạch chân (Ctrl+U)">  <Underline size={14} /></button>
                <button className={rbnCls('strikeThrough')} onMouseDown={btn('strikeThrough')} title="Gạch ngang">       <Strikethrough size={14} /></button>
                <span className="tb-rsep-mini" />
                <button className={rbnCls('superscript')} onMouseDown={btn('superscript')} title="Chỉ số trên">         <Superscript size={14} /></button>
                <button className={rbnCls('subscript')} onMouseDown={btn('subscript')} title="Chỉ số dưới">         <Subscript size={14} /></button>
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
                <button className={rbnCls('justifyLeft')} onMouseDown={btn('justifyLeft')} title="Căn trái">       <AlignLeft size={14} /></button>
                <button className={rbnCls('justifyCenter')} onMouseDown={btn('justifyCenter')} title="Căn giữa">       <AlignCenter size={14} /></button>
                <button className={rbnCls('justifyRight')} onMouseDown={btn('justifyRight')} title="Căn phải">       <AlignRight size={14} /></button>
                <button className="tb-rbn-btn" onMouseDown={btn('justifyFull')} title="Căn đều 2 bên"> <AlignJustify size={14} /></button>
                <span className="tb-rsep-mini" />
                <button className={rbnCls('insertUnorderedList')} onMouseDown={btn('insertUnorderedList')} title="Danh sách gạch đầu dòng">
                  <List size={14} />
                </button>
                <button className={rbnCls('insertOrderedList')} onMouseDown={btn('insertOrderedList')} title="Danh sách có số thứ tự">
                  <ListOrdered size={14} />
                </button>
                <span className="tb-rsep-mini" />
                <button className="tb-rbn-btn" onMouseDown={btn('outdent')} title="Giảm thụt lề" style={{ fontSize: 13, fontWeight: 700 }}>⇤</button>
                <button className="tb-rbn-btn" onMouseDown={btn('indent')} title="Tăng thụt lề" style={{ fontSize: 13, fontWeight: 700 }}>⇥</button>
                <span className="tb-rsep-mini" />
                <select 
                  className="tb-rbn-select" 
                  style={{ width: 70 }} 
                  title="Khoảng cách dòng"
                  value={currentLineHeight}
                  onFocus={captureCurrentSelection}
                  onChange={(e) => {
                    const target = getTargetEditable();
                    if (!target) return;
                    
                    const lineHeightValue = e.target.value;
                    const sel = window.getSelection();
                    
                    // Trường hợp có bôi đen văn bản
                    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                      const range = sel.getRangeAt(0);
                      
                      if (target.contains(range.commonAncestorContainer)) {
                        const wrapper = document.createElement('div');
                        wrapper.style.lineHeight = lineHeightValue;
                        wrapper.setAttribute('data-line-height-wrapper', 'true');
                        
                        try {
                          wrapper.appendChild(range.extractContents());
                          range.insertNode(wrapper);
                        } catch (err) {
                          console.error('Failed to apply line height to selection:', err);
                        }
                      }
                    } else {
                      // Trường hợp không bôi đen: Áp dụng cho toàn bộ khối như cũ
                      const currentHtml = target.innerHTML;
                      if (target.firstElementChild?.hasAttribute('data-line-height-wrapper')) {
                        target.firstElementChild.style.lineHeight = lineHeightValue;
                      } else {
                        target.innerHTML = `<div data-line-height-wrapper="true" style="line-height: ${lineHeightValue}">${currentHtml}</div>`;
                      }
                    }
                    
                    // Update state
                    setCurrentLineHeight(lineHeightValue);
                    
                    // Trigger auto-save
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                >
                  <option value="1.5">1.5</option>
                  <option value="1.8">1.8</option>
                  <option value="2.0">2.0</option>
                  <option value="2.2">2.2</option>
                  <option value="2.4">2.4</option>
                  <option value="2.6">2.6</option>
                </select>
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
