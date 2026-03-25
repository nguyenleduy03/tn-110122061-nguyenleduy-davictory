import { Info } from 'lucide-react';
import { useState } from 'react';
import './SourceTestBadge.css';

export default function SourceTestBadge({ sourceTestId, sourceTestTitle }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!sourceTestId || !sourceTestTitle) return null;

  return (
    <span 
      className="source-test-badge"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <Info size={16} />
      {showTooltip && (
        <span className="source-test-tooltip">
          Trộn từ: <strong>{sourceTestTitle}</strong>
        </span>
      )}
    </span>
  );
}
