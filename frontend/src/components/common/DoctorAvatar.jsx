import React, { useState } from 'react';
import { getMediaUrl } from '../../utils/media';

const getInitials = (nameStr) => {
  if (!nameStr) return 'DR';
  const clean = nameStr.replace(/^Dr\.\s+/i, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'DR';
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 rounded-xl text-xs',
  md: 'w-10 h-10 rounded-xl text-sm',
  lg: 'w-14 h-14 rounded-2xl text-lg',
  xl: 'w-20 h-20 rounded-2xl text-3xl',
  '2xl': 'w-24 h-24 rounded-3xl text-4xl',
};

const VARIANT_GRADIENTS = {
  teal: 'from-teal-600 to-emerald-500',
  emerald: 'from-emerald-600 to-teal-500',
  sky: 'from-sky-600 to-teal-500',
  purple: 'from-purple-600 to-indigo-600',
  amber: 'from-amber-600 to-orange-500',
  slate: 'from-slate-700 to-slate-800',
};

export const DoctorAvatar = ({
  src,
  name,
  alt,
  size = 'md',
  className = '',
  fallbackVariant = 'teal',
}) => {
  const [hasError, setHasError] = useState(false);
  const mediaUrl = getMediaUrl(src);
  const initials = getInitials(name);
  const sizeClass = SIZE_CLASSES[size] || size;
  const gradientClass = VARIANT_GRADIENTS[fallbackVariant] || VARIANT_GRADIENTS.teal;

  if (mediaUrl && !hasError) {
    return (
      <img
        src={mediaUrl}
        alt={alt || name || 'Doctor Profile Photo'}
        onError={() => setHasError(true)}
        className={`${sizeClass} object-cover object-top border border-slate-200/80 shadow-xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} bg-gradient-to-tr ${gradientClass} text-white font-black flex items-center justify-center shrink-0 shadow-xs ${className}`}
    >
      {initials}
    </div>
  );
};
