// Force normalize all pin positions (handle all legacy formats)
export const normalizePinPosition = (question) => {
  if (!question) return question;
  
  let pinX = question.pinX;
  let pinY = question.pinY;
  
  // Handle legacy left/top values
  if (pinX == null && question.left != null) {
    const leftStr = String(question.left).replace('%', '').replace('px', '').trim();
    const leftNum = Number.parseFloat(leftStr);
    if (Number.isFinite(leftNum)) {
      pinX = leftNum;
    }
  }
  
  if (pinY == null && question.top != null) {
    const topStr = String(question.top).replace('%', '').replace('px', '').trim();
    const topNum = Number.parseFloat(topStr);
    if (Number.isFinite(topNum)) {
      pinY = topNum;
    }
  }
  
  // Ensure valid numbers
  if (!Number.isFinite(pinX)) pinX = 50;
  if (!Number.isFinite(pinY)) pinY = 50;
  
  // Clamp to valid range
  pinX = Math.max(0, Math.min(100, pinX));
  pinY = Math.max(0, Math.min(100, pinY));
  
  return {
    ...question,
    pinX,
    pinY,
    // Clear legacy fields
    left: undefined,
    top: undefined
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
