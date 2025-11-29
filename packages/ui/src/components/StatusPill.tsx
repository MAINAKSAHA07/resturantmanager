import React from 'react';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusPillProps {
  status: StatusType;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusPill({
  status,
  children,
  size = 'md',
  className = '',
}: StatusPillProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const statusStyles = {
    success: 'bg-status-success-100 text-status-success-700 border border-status-success-300',
    warning: 'bg-status-warning-100 text-status-warning-700 border border-status-warning-300',
    danger: 'bg-status-danger-100 text-status-danger-700 border border-status-danger-300',
    info: 'bg-status-info-100 text-status-info-700 border border-status-info-300',
    neutral: 'bg-brand-100 text-brand-700 border border-brand-300',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  return (
    <span className={`${baseStyles} ${statusStyles[status]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}

