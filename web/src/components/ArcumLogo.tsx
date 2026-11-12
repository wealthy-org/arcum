import React from 'react';

interface ArcumLogoProps {
  size?: number;
  className?: string;
}

export const ArcumLogo: React.FC<ArcumLogoProps> = ({ size = 28, className = '' }) => {
  return (
    <img
      src="/logo-arcum.jpeg"
      alt="Arcum Logo"
      width={size}
      height={size}
      className={`rounded-lg object-contain shrink-0 transition-transform duration-300 hover:scale-105 shadow-[0_0_10px_rgba(25,230,180,0.25)] ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
};
