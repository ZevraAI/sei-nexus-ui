import React from 'react';
import logoSrc from '../logo.png';

export function ZevraLogo({ size = 26, className = '' }) {
  return (
    <img
      src={logoSrc}
      alt="Zevra"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

export default ZevraLogo;
