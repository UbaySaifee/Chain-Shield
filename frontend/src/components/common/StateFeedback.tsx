import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Scanning blockchain entity...",
  subtext = "Querying local EVM nodes and evaluating risk heuristics"
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-shield-cyan/20 border-t-shield-cyan animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-shield-cyan animate-pulse" />
        </div>
      </div>
      <h4 className="text-sm font-semibold text-slate-200">{message}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{subtext}</p>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-shield-750/80 rounded-xl bg-shield-900/40">
      <div className="w-12 h-12 rounded-full bg-shield-800/80 border border-shield-700/60 flex items-center justify-center text-slate-400 mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-md">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-shield-indigo hover:bg-shield-indigo/90 text-white transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Analysis Error",
  message,
  onRetry
}) => {
  return (
    <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
        <p className="text-xs text-rose-300/90 mt-0.5">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-medium text-rose-200 underline hover:text-white"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export interface StateFeedbackProps {
  state: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  subtext?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const StateFeedback: React.FC<StateFeedbackProps> = ({
  state,
  title,
  message,
  subtext,
  actionLabel,
  onAction,
  icon
}) => {
  if (state === 'loading') {
    return <LoadingState message={title || message} subtext={subtext || message} />;
  }
  if (state === 'error') {
    return <ErrorState title={title} message={message || 'An error occurred'} onRetry={onAction} />;
  }
  return <EmptyState title={title || 'No data'} description={message || ''} actionText={actionLabel} onAction={onAction} icon={icon} />;
};
