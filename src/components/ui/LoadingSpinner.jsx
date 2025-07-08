import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LoadingSpinner = ({ 
  size = 'default', 
  className = '', 
  text = '',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const spinner = (
    <div className={cn(
      'flex items-center justify-center',
      fullScreen && 'min-h-screen',
      className
    )}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn(
          'animate-spin text-blue-500',
          sizeClasses[size]
        )} />
        {text && (
          <p className="text-sm text-slate-400">{text}</p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;