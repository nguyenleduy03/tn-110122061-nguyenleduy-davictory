import React, { useRef, useEffect, useState } from 'react';
import Quill from 'quill';
import QuillBetterTable from 'quill-better-table';
import 'quill/dist/quill.snow.css';
import 'quill-better-table/dist/quill-better-table.css';
import 'katex/dist/katex.min.css';
import './QuillEditor.css';

Quill.register('modules/better-table', QuillBetterTable);

const EmbedBlot = Quill.import('blots/embed');
const Parchment = Quill.import('parchment');

class HrBlot extends EmbedBlot {
  static blotName = 'hr';
  static tagName = 'hr';
}

const LineHeightStyle = new Parchment.Attributor.Style('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5', '3']
});

Quill.register(HrBlot);
Quill.register(LineHeightStyle);

const QuillEditor = ({ value, onChange, placeholder, height = 200 }) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung...',
      modules: {
        toolbar: {
          container: containerRef.current,
          handlers: {
            'table': function() {
              const tableModule = quill.getModule('better-table');
              tableModule.insertTable(3, 3);
            },
            'hr': function() {
              const range = quill.getSelection();
              if (range) {
                quill.insertEmbed(range.index, 'hr', true);
                quill.setSelection(range.index + 1);
              }
            },
            'undo': function() {
              quill.history.undo();
            },
            'redo': function() {
              quill.history.redo();
            }
          }
        },
        'better-table': {
          operationMenu: {
            items: {
              unmergeCells: { text: 'Tách ô' },
              insertColumnRight: { text: 'Thêm cột phải' },
              insertColumnLeft: { text: 'Thêm cột trái' },
              insertRowUp: { text: 'Thêm hàng trên' },
              insertRowDown: { text: 'Thêm hàng dưới' },
              mergeCells: { text: 'Gộp ô' },
              deleteColumn: { text: 'Xóa cột' },
              deleteRow: { text: 'Xóa hàng' },
              deleteTable: { text: 'Xóa bảng' }
            }
          }
        },
        keyboard: {
          bindings: QuillBetterTable.keyboardBindings
        },
        history: {
          delay: 1000,
          maxStack: 100,
          userOnly: true
        }
      }
    });

    quillRef.current = quill;

    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      onChange(html);
      
      const text = quill.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;
      const chars = text.length;
      setWordCount(words);
      setCharCount(chars);
    });

    return () => {
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = value || '';
    }
  }, [value]);

  return (
    <div style={{ marginBottom: '42px' }}>
      <div ref={containerRef} className="custom-toolbar">
        <div className="toolbar-row">
          <span className="ql-formats">
            <button className="ql-undo" title="Hoàn tác (Ctrl+Z)">↶</button>
            <button className="ql-redo" title="Làm lại (Ctrl+Y)">↷</button>
          </span>

          <span className="ql-formats">
            <select className="ql-font" title="Font">
              <option value="sans-serif">Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
            <select className="ql-size" title="Cỡ chữ">
              <option value="small">Nhỏ</option>
              <option selected>Bình thường</option>
              <option value="large">Lớn</option>
              <option value="huge">Rất lớn</option>
            </select>
          </span>
          
          <span className="ql-formats">
            <button className="ql-bold" title="In đậm (Ctrl+B)">B</button>
            <button className="ql-italic" title="In nghiêng (Ctrl+I)">I</button>
            <button className="ql-underline" title="Gạch chân (Ctrl+U)">U</button>
            <button className="ql-strike" title="Gạch ngang">S</button>
          </span>

          <span className="ql-formats">
            <select className="ql-color" title="Màu chữ"></select>
            <select className="ql-background" title="Màu nền"></select>
          </span>

          <span className="ql-formats">
            <select className="ql-lineheight" title="Khoảng cách dòng">
              <option value="1">Đơn</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2">Đôi</option>
              <option value="2.5">2.5</option>
              <option value="3">3</option>
            </select>
          </span>

          <span className="ql-formats">
            <button className="ql-script" value="sub" title="Chỉ số dưới">X₂</button>
            <button className="ql-script" value="super" title="Chỉ số trên">X²</button>
          </span>

          <span className="ql-formats">
            <select className="ql-header" title="Tiêu đề">
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
              <option value="4">Heading 4</option>
              <option value="5">Heading 5</option>
              <option value="6">Heading 6</option>
              <option selected>Normal</option>
            </select>
          </span>

          <span className="ql-formats">
            <button className="ql-list" value="ordered" title="Danh sách đánh số">1.</button>
            <button className="ql-list" value="bullet" title="Danh sách dấu đầu dòng">•</button>
            <button className="ql-list" value="check" title="Danh sách checkbox">☑</button>
          </span>

          <span className="ql-formats">
            <button className="ql-indent" value="-1" title="Giảm thụt lề">◁</button>
            <button className="ql-indent" value="+1" title="Tăng thụt lề">▷</button>
          </span>

          <span className="ql-formats">
            <button className="ql-align" value="" title="Căn trái"></button>
            <button className="ql-align" value="center" title="Căn giữa"></button>
            <button className="ql-align" value="right" title="Căn phải"></button>
            <button className="ql-align" value="justify" title="Căn đều"></button>
          </span>

          <span className="ql-formats">
            <button className="ql-direction" value="rtl" title="Hướng văn bản">⇄</button>
          </span>

          <span className="ql-formats">
            <button className="ql-blockquote" title="Trích dẫn">"</button>
            <button className="ql-code-block" title="Khối code">&lt;/&gt;</button>
          </span>

          <span className="ql-formats">
            <button className="ql-link" title="Chèn link">🔗</button>
            <button className="ql-image" title="Chèn ảnh">🖼</button>
            <button className="ql-video" title="Chèn video">📹</button>
          </span>

          <span className="ql-formats">
            <button className="ql-formula" title="Công thức toán">∑</button>
            <button className="ql-table" title="Chèn bảng">
              <svg viewBox="0 0 18 18" width="16" height="16"><rect className="ql-stroke" height="12" width="12" x="3" y="3"></rect><rect className="ql-fill" height="2" width="3" x="5" y="5"></rect><rect className="ql-fill" height="2" width="3" x="5" y="9"></rect><rect className="ql-fill" height="2" width="3" x="10" y="5"></rect><rect className="ql-fill" height="2" width="3" x="10" y="9"></rect></svg>
            </button>
            <button className="ql-hr" title="Đường kẻ ngang">―</button>
          </span>

          <span className="ql-formats">
            <button className="ql-clean" title="Xóa định dạng">🗑</button>
          </span>

          <span className="ql-formats">
            <button 
              type="button"
              onClick={() => setShowStats(!showStats)} 
              title="Thống kê"
              className={showStats ? 'ql-active' : ''}
            >
              📊
            </button>
          </span>
        </div>
      </div>
      <div ref={editorRef} style={{ height: `${height}px` }} />
      
      {showStats && (
        <div className="editor-stats">
          <span>Từ: {wordCount}</span>
          <span>•</span>
          <span>Ký tự: {charCount}</span>
        </div>
      )}
    </div>
  );
};

export default QuillEditor;
