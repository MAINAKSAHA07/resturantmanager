import React from 'react';
import { Card } from './Card';

export interface KPIStatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

export function KPIStat({
  label,
  value,
  icon,
  trend,
  accentColor = 'blue',
  className = '',
}: KPIStatProps) {
  const accentColors = {
    blue: 'border-l-accent-500',
    green: 'border-l-status-success-500',
    purple: 'border-l-accent-purple',
    orange: 'border-l-accent-orange',
  };
  
  return (
    <Card variant="default" padding="md" className={`${accentColors[accentColor]} border-l-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-brand-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-brand-900">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-status-success-600' : 'text-status-danger-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-sm text-brand-500">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

