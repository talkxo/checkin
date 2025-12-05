import React from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './status-badge';
import { Check, ArrowUpRight, Minus, Clock } from 'lucide-react';

type OverviewCardProps = {
  type: 'checkin' | 'checkout' | 'break' | 'overtime';
  time?: string;
  secondaryText?: string;
  status?: 'on-time' | 'early' | 'slightly-late' | 'late' | 'absent' | 'leave' | 'na';
  message: string;
  icon?: React.ReactNode;
  updateDate?: string;
  className?: string;
};

const defaultIcons = {
  checkin: <Check className="w-3 h-3" />,
  checkout: <ArrowUpRight className="w-3 h-3" />,
  break: <Minus className="w-3 h-3" />,
  overtime: <Clock className="w-3 h-3" />,
};

const OverviewCard: React.FC<OverviewCardProps> = ({
  type,
  time = '--:--',
  secondaryText,
  status,
  message,
  icon,
  updateDate,
  className = ''
}) => {
  const displayIcon = icon || defaultIcons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-3 elevation-md card-hover flex flex-col h-full transition-all duration-300 ${className}`}
    >
      {/* Icon at top */}
      <div className="mb-2">
        <div className="text-foreground dark:text-foreground flex-shrink-0 opacity-80">
          {displayIcon}
        </div>
      </div>

      {/* Main value */}
      <div className="mb-2 min-h-[1.75rem]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-foreground dark:text-foreground leading-none">{time}</span>
          {secondaryText && (
            <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-normal leading-none">{secondaryText}</span>
          )}
          {status && status !== 'na' && (
            <div className="flex-shrink-0">
              <StatusBadge status={status} />
            </div>
          )}
        </div>
      </div>

      {/* Label/Message text at bottom */}
      <p className="text-[10px] text-muted-foreground dark:text-muted-foreground leading-tight mt-auto">{message}</p>

      {/* Update date for overtime card */}
      {updateDate && (
        <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-1">{updateDate}</p>
      )}
    </motion.div>
  );
};

export default OverviewCard;
