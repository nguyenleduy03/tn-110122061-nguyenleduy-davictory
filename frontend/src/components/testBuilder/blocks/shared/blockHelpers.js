import { normalizeRichHtml } from '../../../../utils/textFormatters';

// ---- Helper functions ----
export const toRoman = (n) => {
  const nums = [1, 4, 5, 9, 10, 40, 50];
  const syms = ['i', 'iv', 'v', 'ix', 'x', 'xl', 'l'];
  let r = '';
  for (let i = syms.length - 1; i >= 0; i--) { 
    while (n >= nums[i]) { r += syms[i]; n -= nums[i]; } 
  }
  return r;
};

export const toPlainText = (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);
  const normalized = normalizeRichHtml(value);
  if (!normalized.includes('<')) return normalized.trim();

  try {
    const el = document.createElement('div');
    el.innerHTML = normalized;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  } catch {
    return normalized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

export const countBlankTokens = (text = '') => 
  (String(text).match(/\[blank\]|\(ô trống\)/gi) || []).length;

export const isImagePinQuestion = (q) => 
  q?.questionMode === 'image-pin' || (q?.questionMode !== 'note-blank' && q?.pinX != null && q?.pinY != null);

export const isNoteBlankQuestion = (q) => 
  q?.questionMode === 'note-blank' || (q?.questionMode !== 'image-pin' && q?.pinX == null && q?.pinY == null);

export const getQuestionWeight = (q) => Number(q?.questionCount || 1) || 1;

export const getPartQuestionStartNumber = (group, allGroups = []) => {
  const idx = allGroups.findIndex((g) => g.id === group?.id);
  const previousGroups = idx >= 0 ? allGroups.slice(0, idx) : [];

  const totalBefore = previousGroups.reduce((sum, g) => (
    sum + (g.questions ?? []).reduce((qSum, q) => qSum + getQuestionWeight(q), 0)
  ), 0);

  return totalBefore + 1;
};

export const getNextQuestionNumber = (questions = []) => {
  const maxNumber = questions.reduce((max, q) => {
    const num = Number(q?.questionNumber ?? 0);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return maxNumber + 1;
};

// Tính fromQuestion và toQuestion cho một group dựa trên vị trí trong part
export const calculateQuestionRange = (group, allGroupsInPart = []) => {
  const groupIndex = allGroupsInPart.findIndex((g) => g.id === group.id);
  if (groupIndex === -1) return { fromQuestion: 1, toQuestion: 1 };

  // Đếm tổng số câu hỏi trước group này
  const totalBefore = allGroupsInPart.slice(0, groupIndex).reduce((sum, g) => {
    return sum + (g.questions ?? []).reduce((qSum, q) => qSum + getQuestionWeight(q), 0);
  }, 0);

  const fromQuestion = totalBefore + 1;
  const questionCount = (group.questions ?? []).reduce((sum, q) => sum + getQuestionWeight(q), 0);
  const toQuestion = totalBefore + questionCount;

  return { fromQuestion, toQuestion };
};

export const fileToCompressedDataUrl = (file, { maxWidth = 1280, quality = 0.82 } = {}) => 
  new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Invalid image file'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      if (!rawDataUrl) {
        reject(new Error('Không có dữ liệu ảnh'));
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxWidth / Math.max(img.width || 1, img.height || 1));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          resolve(rawDataUrl);
        }
      };
      try {
        img.src = rawDataUrl;
      } catch {
        resolve(rawDataUrl);
        return;
      }
    };
    reader.readAsDataURL(file);
  });

const buildUploadFileName = (originalName, module, testTitle, assetLabel, extFallback = '') => {
  const safeSegment = (value) => String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const safeModule = safeSegment(module).toUpperCase() || 'GENERAL';
  const safeTitle = safeSegment(testTitle).toUpperCase();
  const safeLabel = safeSegment(assetLabel).toUpperCase();
  const ext = String(originalName || extFallback || '').includes('.')
    ? `.${String(originalName || extFallback).split('.').pop()}`
    : extFallback;

  const parts = ['DAVictory', safeTitle, safeModule, safeLabel].filter(Boolean);
  return `${parts.join('_')}${ext || ''}`;
};

export const loadImageFile = async (file, setImageUrl, module = 'READING', testTitle = '', testId = null, assetLabel = '') => {
  if (!file || !file.type?.startsWith('image/')) return;
  
  try {
    // Compress image first
    const compressedDataUrl = await fileToCompressedDataUrl(file, { maxWidth: 1280, quality: 0.82 });
    setImageUrl(compressedDataUrl); // Show preview
    
    // Convert data URL back to File for upload
    const blob = await fetch(compressedDataUrl).then(r => r.blob());
    const compressedFileName = buildUploadFileName(file.name, module, testTitle, assetLabel, '.jpg');
    const compressedFile = new File([blob], compressedFileName, { type: 'image/jpeg' });

    // Upload to Google Drive
    const { fileApi } = await import('../../../../services/fileApi');
    const result = await fileApi.uploadImage(compressedFile, module, testTitle, testId);
    
    // Set the Drive URL
    setImageUrl(result.url);
    return result;
  } catch (err) {
    console.error('Image upload failed:', err);
    alert('Lỗi upload ảnh: ' + (err.response?.data?.error || err.message || 'Unknown error'));
  }
};

export const loadAudioFile = async (file, setAudioUrl, module = 'LISTENING', testTitle = '', testId = null, assetLabel = '', options = {}) => {
  if (!file || !file.type?.startsWith('audio/')) return;
  const {
    onStart,
    onProgress,
    onDone,
    onError,
  } = options;
  
  try {
    onStart?.();

    let lastProgress = 0;
    const emitProgress = (nextProgress, message) => {
      const clamped = Math.max(lastProgress, Math.min(100, Math.round(nextProgress)));
      lastProgress = clamped;
      onProgress?.(clamped, message);
    };

    // Show loading state with base64 preview first
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.max(1, Math.min(18, Math.round((event.loaded / event.total) * 18)));
      emitProgress(progress, 'Đang xử lý file audio...');
    };
    reader.onload = () => {
      const preview = String(reader.result || '');
      if (preview) setAudioUrl(preview);
      emitProgress(20, 'Đang tải lên Google Drive...');
    };
    reader.readAsDataURL(file);

    // Upload to Google Drive
    const { fileApi } = await import('../../../../services/fileApi');
    emitProgress(24, 'Đang khởi tạo tải lên...');
    const uploadName = buildUploadFileName(file.name, module, testTitle, assetLabel, file.name.includes('.') ? `.${String(file.name).split('.').pop()}` : '');
    const uploadFile = new File([file], uploadName, { type: file.type || 'audio/*' });
    const result = module === 'SPEAKING'
      ? await fileApi.uploadSpeakingAudio(uploadFile, testTitle, testId, {
          onProgress: (progress, message) => emitProgress(24 + Math.round((Math.max(0, Math.min(100, progress)) / 100) * 68), message),
        })
      : await fileApi.uploadListeningAudio(uploadFile, testTitle, testId, {
          onProgress: (progress, message) => emitProgress(24 + Math.round((Math.max(0, Math.min(100, progress)) / 100) * 68), message),
        });
    
    // Set the Drive URL
    setAudioUrl(result.url);
    emitProgress(100, 'Tải lên hoàn tất');
    onDone?.(result);
    return result;
  } catch (err) {
    console.error('Audio upload failed:', err);
    onError?.(err);
    alert('Lỗi upload audio: ' + (err.response?.data?.error || err.message || 'Unknown error'));
  }
};
