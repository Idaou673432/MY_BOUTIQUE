import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  trend,
  onClick,
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50/70 text-indigo-700',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-600 text-white',
    },
    emerald: {
      bg: 'bg-emerald-50/70 text-emerald-700',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-600 text-white',
    },
    amber: {
      bg: 'bg-amber-50/70 text-amber-700',
      border: 'border-amber-100',
      iconBg: 'bg-amber-500 text-white',
    },
    rose: {
      bg: 'bg-rose-50/70 text-rose-700',
      border: 'border-rose-100',
      iconBg: 'bg-rose-600 text-white',
    },
    blue: {
      bg: 'bg-blue-50/70 text-blue-700',
      border: 'border-blue-100',
      iconBg: 'bg-blue-600 text-white',
    },
    purple: {
      bg: 'bg-purple-50/70 text-purple-700',
      border: 'border-purple-100',
      iconBg: 'bg-purple-600 text-white',
    },
    slate: {
      bg: 'bg-slate-50 text-slate-700',
      border: 'border-slate-200',
      iconBg: 'bg-slate-700 text-white',
    },
  };

  const currentTheme = colorMap[color];

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">
            {value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${currentTheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
