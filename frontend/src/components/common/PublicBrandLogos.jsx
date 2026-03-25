import React from 'react';

const PublicBrandLogos = ({ className = '' }) => {
  return (
    <div className={`public-brand-logos ${className}`.trim()}>
      <img src="/brand/cambridge-logo.svg" alt="University of Cambridge" className="public-brand-logo public-brand-cambridge" />
      <img src="/brand/ielts-logo.svg" alt="IELTS" className="public-brand-logo public-brand-ielts" />
    </div>
  );
};

export default PublicBrandLogos;
