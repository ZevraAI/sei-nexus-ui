import React from 'react';
import logoSrc from '../logo.png';

export function ZevraLogo({ size = 26, className = '', style }) {
  return (
    <img
      src={logoSrc}
      alt="Zevra"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'cover', ...style }}
    />
  );
}

export default ZevraLogo;
