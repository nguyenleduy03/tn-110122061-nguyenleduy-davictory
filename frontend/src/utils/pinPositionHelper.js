// Normalize pin position data (migrate old left/top to pinX/pinY)
export const normalizePinPosition = (question) => {
  if (!question) return question;
  
  // If already has pinX/pinY, use them
  if (question.pinX != null && question.pinY != null) {
    return question;
  }
  
  // Migrate from old left/top format
  let pinX = question.pinX;
  let pinY = question.pinY;
  
  if (pinX == null && question.left != null) {
    const leftStr = String(question.left).replace('%', '').trim();
    const leftNum = Number.parseFloat(leftStr);
    if (Number.isFinite(leftNum)) {
      pinX = leftNum;
    }
  }
  
  if (pinY == null && question.top != null) {
    const topStr = String(question.top).replace('%', '').trim();
    const topNum = Number.parseFloat(topStr);
    if (Number.isFinite(topNum)) {
      pinY = topNum;
    }
  }
  
  return {
    ...question,
    pinX: pinX ?? 50,
    pinY: pinY ?? 50
  };
};

// Shared helper for accurate pin positioning
export const calculatePinPosition = (clickX, clickY, imageRect, pinWidth = 120, pinHeight = 26) => {
  // Calculate exact pixel position relative to image
  const pixelX = clickX - imageRect.left;
  const pixelY = clickY - imageRect.top;
  
  // Convert to percentage for storage (maintains accuracy across different image sizes)
  const percentX = (pixelX / imageRect.width) * 100;
  const percentY = (pixelY / imageRect.height) * 100;
  
  // Clamp to ensure pin stays within image bounds
  const minX = 0;
  const maxX = Math.max(0, 100 - (pinWidth / imageRect.width) * 100);
  const minY = 0;
  const maxY = Math.max(0, 100 - (pinHeight / imageRect.height) * 100);
  
  return {
    x: Math.max(minX, Math.min(maxX, percentX)),
    y: Math.max(minY, Math.min(maxY, percentY))
  };
};
