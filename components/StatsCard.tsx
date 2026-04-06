import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
  badge?: string;
}

const colorMap = {
  blue: 'border-blue-200 bg-blue-50',
  green: 'border-green-200 bg-green-50',
  purple: 'border-purple-200 bg-purple-50',
  orange: 'border-orange-200 bg-orange-50',
  gray: 'border-gray-200 bg-gray-50',
};

const titleColorMap = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  purple: 'text-purple-700',
  orange: 'text-orange-700',
  gray: 'text-gray-700',
};

const valueColorMap = {
  blue: 'text-blue-900',
  green: 'text-green-900',
  purple: 'text-purple-900',
  orange: 'text-orange-900',
  gray: 'text-gray-900',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  color = 'gray',
  badge,
}: StatsCardProps) {
  return (
    <div className={clsx('rounded-xl border p-5', colorMap[color])}>
      <div className="flex items-start justify-between mb-2">
        <p className={clsx('text-sm font-medium', titleColorMap[color])}>{title}</p>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
            {badge}
          </span>
        )}
      </div>
      <p className={clsx('text-2xl font-bold', valueColorMap[color])}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
