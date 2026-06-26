import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'folder' | 'file';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
  count = 1,
}) => {
  const style: React.CSSProperties = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'rounded-md h-4 w-full';
      case 'folder':
        return 'rounded-2xl h-14 w-full';
      case 'file':
        return 'rounded-2xl h-32 w-full';
      case 'card':
        return 'rounded-3xl h-48 w-full';
      case 'rect':
      default:
        return 'rounded-xl w-full';
    }
  };

  const shimmerStyle = `
    @keyframes skeleton-shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    .shimmer-skeleton {
      background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.05) 25%,
        rgba(0, 0, 0, 0.02) 37%,
        rgba(0, 0, 0, 0.05) 63%
      );
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.8s infinite linear;
    }
    .dark .shimmer-skeleton {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.04) 25%,
        rgba(255, 255, 255, 0.08) 37%,
        rgba(255, 255, 255, 0.04) 63%
      );
      background-size: 200% 100%;
    }
  `;

  const items = Array.from({ length: count });

  if (count === 1) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: shimmerStyle }} />
        <div
          className={`shimmer-skeleton relative overflow-hidden shrink-0 ${getVariantClass()} ${className}`}
          style={style}
        />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmerStyle }} />
      {items.map((_, i) => (
        <div
          key={i}
          className={`shimmer-skeleton relative overflow-hidden shrink-0 ${getVariantClass()} ${className}`}
          style={style}
        />
      ))}
    </>
  );
};

export default Skeleton;
