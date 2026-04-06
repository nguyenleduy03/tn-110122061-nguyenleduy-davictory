import React from 'react';
import { X, Maximize2 } from 'lucide-react';

/**
 * IframePreviewModal - Modal fullscreen để xem trước trang thi thực tế
 * Load trang thi trong iframe chồng lên trang hiện tại
 */
const IframePreviewModal = ({
  testId,
  skillType,
  reloadKey = 0,
  refreshToken = 0,
  isClosing = false,
  isVisible = false,
  previewOrigin = null,
  onClose,
}) => {
  const [phase, setPhase] = React.useState('enter');
  const iframeRef = React.useRef(null);

  const postRefreshMessage = React.useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow || !testId || !skillType) return;

    frameWindow.postMessage({
      type: 'DAVICTORY_PREVIEW_REFRESH',
      testId,
      skillType,
      sentAt: Date.now(),
    }, window.location.origin);
  }, [skillType, testId]);

  React.useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      if (!isVisible) {
        setPhase('hidden');
      } else {
        setPhase(isClosing ? 'closing' : 'open');
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isClosing, isVisible, reloadKey]);

  React.useEffect(() => {
    if (!refreshToken || !isVisible || isClosing) return;
    postRefreshMessage();
  }, [refreshToken, isVisible, isClosing, postRefreshMessage]);

  // Đóng modal khi nhấn ESC
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!testId || !skillType) return null;

  const previewUrl = `/test/${skillType.toLowerCase()}/${testId}?mode=practice&preview=${reloadKey}`;
  const overlayState = phase;
  const panelState = phase;
  const originStyle = previewOrigin
    ? {
        '--preview-origin-x': `${previewOrigin.x}px`,
        '--preview-origin-y': `${previewOrigin.y}px`,
      }
    : undefined;

  return (
    <div className={`iframe-preview-overlay is-${overlayState}`} style={originStyle} onClick={onClose}>
      <div className={`iframe-preview-container is-${panelState}`} onClick={(e) => e.stopPropagation()}>
        {/* Header với nút đóng */}
        <div className="iframe-preview-header">
          <div className="iframe-preview-title">
            <Maximize2 size={18} />
            <span>Xem trước đề thi - {skillType}</span>
          </div>
          <button
            className="iframe-preview-close"
            onClick={onClose}
            title="Đóng xem trước (ESC)"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Iframe chứa trang thi */}
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={previewUrl}
          className="iframe-preview-frame"
          title="Preview Test"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          onLoad={postRefreshMessage}
        />
      </div>
    </div>
  );
};

export default IframePreviewModal;
