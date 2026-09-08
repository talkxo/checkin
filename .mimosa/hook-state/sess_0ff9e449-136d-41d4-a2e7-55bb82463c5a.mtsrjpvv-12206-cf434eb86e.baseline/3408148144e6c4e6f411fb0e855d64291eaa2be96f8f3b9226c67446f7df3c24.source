import React from 'react';

export type StatusBadgeStatus = 'on-time' | 'early' | 'slightly-late' | 'late' | 'absent' | 'leave' | 'na';

type StatusBadgeProps = {
  status: StatusBadgeStatus;
  className?: string;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'on-time':
        return {
          text: 'On time',
          bgColor: 'bg-orange-500 dark:bg-orange-500',
          textColor: 'text-white'
        };
      case 'early':
        return {
          text: 'Early',
          bgColor: 'bg-blue-500 dark:bg-blue-500',
          textColor: 'text-white'
        };
      case 'slightly-late':
        return {
          text: 'Slightly Late',
          bgColor: 'bg-yellow-500 dark:bg-yellow-500',
          textColor: 'text-white'
        };
      case 'late':
        return {
          text: 'Late',
          bgColor: 'bg-red-500 dark:bg-red-500',
          textColor: 'text-white'
        };
      case 'absent':
        return {
          text: 'Absent',
          bgColor: 'bg-gray-500 dark:bg-gray-500',
          textColor: 'text-white'
        };
      case 'leave':
        return {
          text: 'Leave',
          bgColor: 'bg-gray-500 dark:bg-gray-500',
          textColor: 'text-white'
        };
      case 'na':
        return {
          text: 'n/a',
          bgColor: 'bg-gray-400 dark:bg-gray-600',
          textColor: 'text-white dark:text-gray-300'
        };
      default:
        return {
          text: 'n/a',
          bgColor: 'bg-gray-400 dark:bg-gray-600',
          textColor: 'text-white dark:text-gray-300'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.text}
    </span>
  );
};

export default StatusBadge;
