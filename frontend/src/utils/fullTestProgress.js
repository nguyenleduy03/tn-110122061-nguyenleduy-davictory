export const parseJsonSafe = (raw, fallback = null) => {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const getFullTestSessionState = () => {
  return parseJsonSafe(sessionStorage.getItem('ieltsFullTest'), null);
};

export const computeFullTestProgressPercent = ({
  currentSection = 0,
  totalSections = 4,
  sectionProgress = 0,
}) => {
  const safeTotalSections = Math.max(1, Number(totalSections) || 1);
  const safeCurrentSection = Math.max(0, Number(currentSection) || 0);
  const safeSectionProgress = Math.max(0, Math.min(1, Number(sectionProgress) || 0));
  const value = ((safeCurrentSection + safeSectionProgress) / safeTotalSections) * 100;
  return Math.max(0, Math.min(100, Math.round(value)));
};
