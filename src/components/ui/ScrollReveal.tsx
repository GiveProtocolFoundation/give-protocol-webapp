import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  delay?: number;
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
}

/**
 * ScrollReveal component that animates children when they enter viewport
 * @param children - React children to animate
 * @param direction - Animation direction (up, down, left, right, scale)
 * @param delay - Delay before animation starts (in ms)
 * @param threshold - Percentage of element that must be visible to trigger
 * @param triggerOnce - Whether animation should only trigger once
 * @param className - Additional CSS classes
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.1,
  triggerOnce = true,
  className = ''
}) => {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold,
    triggerOnce
  });

  /**
   * Returns the CSS animation class for the configured scroll direction.
   * @returns CSS class name string
   */
  const getAnimationClass = () => {
    switch (direction) {
      case 'left':
        return 'scroll-reveal-left';
      case 'right':
        return 'scroll-reveal-right';
      case 'scale':
        return 'scroll-reveal-scale';
      case 'up':
      default:
        return 'scroll-reveal';
    }
  };

  /**
   * Returns the CSS transition-delay class for the configured delay value.
   * @returns CSS class name string or empty string for no delay
   */
  const getDelayClass = () => {
    if (delay === 0) return '';
    if (delay <= 100) return 'transition-delay-100';
    if (delay <= 200) return 'transition-delay-200';
    if (delay <= 300) return 'transition-delay-300';
    if (delay <= 400) return 'transition-delay-400';
    return 'transition-delay-500';
  };

  return (
    <div
      ref={elementRef}
      className={`${getAnimationClass()} ${isVisible ? 'is-visible' : ''} ${getDelayClass()} ${className}`}
    >
      {children}
    </div>
  );
};
