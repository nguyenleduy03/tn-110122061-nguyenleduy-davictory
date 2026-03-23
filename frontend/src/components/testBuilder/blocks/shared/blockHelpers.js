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
  q?.questionMode === 'image-pin' || (q?.pinX != null && q?.pinY != null);

export const isNoteBlankQuestion = (q) => 
  q?.questionMode === 'note-blank' || !isImagePinQuestion(q);

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

export const loadImageFile = (file, setImageUrl) => {
  if (!file || !file.type?.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onerror = () => console.error('Image upload failed: Không đọc được file ảnh');
  reader.onload = () => {
    const rawDataUrl = String(reader.result || '');
    if (!rawDataUrl) return;
    setImageUrl(rawDataUrl);

    fileToCompressedDataUrl(file)
      .then((dataUrl) => setImageUrl(dataUrl))
      .catch((err) => console.error('Image upload failed:', err));
  };
  reader.readAsDataURL(file);
};
