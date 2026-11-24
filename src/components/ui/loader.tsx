import React from 'react';
import { cn } from '@/lib/utils';
import { RippleLoader } from './RippleLoader';

type LoaderProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  fullScreen?: boolean;
  text?: string;
};

const sizeMap = {
  sm: 40,
  md: 60,
  lg: 80,
  xl: 100,
};

export function Loader({
  className,
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  text,
}: LoaderProps) {
  const containerClass = cn(
    'flex flex-col items-center justify-center transition-colors duration-300',
    fullScreen 
      ? 'fixed inset-0 z-50 w-screen h-screen bg-background/90 dark:bg-background/95 backdrop-blur-md' 
      : 'relative w-full h-full min-h-[140px]',
    className
  );

  return (
    <div 
      className={containerClass}
      role="status"
      aria-live="polite"
      aria-busy={true}
    >
      <div className="relative flex items-center justify-center">
        <RippleLoader 
          size={fullScreen ? sizeMap['xl'] : sizeMap[size]} 
          color={variant === 'default' ? 'currentColor' : `hsl(var(--${variant}))`}
          opacity={0.65}
        />
        {/* Central glowing indicator */}
        <div className="absolute w-5 h-5 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center animate-pulse">
          <div className="w-2 h-2 rounded-full bg-primary shadow-sm" />
        </div>
      </div>

      {text && (
        <p className="mt-4 text-xs sm:text-sm font-semibold tracking-wide text-foreground/80 font-mono animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

export function PageLoader() {
  return <Loader size="xl" fullScreen />;
}
