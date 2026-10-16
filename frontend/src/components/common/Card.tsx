import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glow' | 'accent';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'glow':
        return 'border-shield-cyan/30 shadow-[0_0_20px_rgba(6,182,212,0.07)]';
      case 'accent':
        return 'border-shield-indigo/30 shadow-[0_0_20px_rgba(99,102,241,0.07)]';
      default:
        return 'border-shield-700/50 hover:border-shield-700/80';
    }
  };

  return (
    <div
      className={`bg-shield-850/80 backdrop-blur-sm rounded-xl border p-5 transition-all duration-200 ${getVariantStyles()} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-shield-750/60">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-4 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
