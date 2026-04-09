import React from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './status-badge';
import { Check, ArrowUpRight, Minus, Clock, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type OverviewCardProps = {
  type: 'checkin' | 'checkout' | 'break' | 'overtime';
  time?: string;
  secondaryText?: string;
  status?: 'on-time' | 'early' | 'slightly-late' | 'late' | 'absent' | 'leave' | 'na';
  message: string;
  tooltip?: string;
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
  time = '--',
  secondaryText,
  status,
  message,
  tooltip,
  icon,
  updateDate,
  className = ''
}) => {
  const displayIcon = icon || defaultIcons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl bg-muted/30 dark:bg-muted/20 p-3 flex flex-col h-full ${className}`}
    >
      {/* Icon at top */}
      <div className="mb-2">
        <div className="text-foreground flex-shrink-0 opacity-60">
          {displayIcon}
        </div>
      </div>

      {/* Main value */}
      <div className="mb-2 min-h-[1.75rem]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-foreground leading-none">{time}</span>
          {secondaryText && (
            <span className="text-[10px] text-muted-foreground font-normal leading-none">{secondaryText}</span>
          )}
          {status && status !== 'na' && (
            <div className="flex-shrink-0">
              <StatusBadge status={status} />
            </div>
          )}
        </div>
      </div>

      {/* Label + optional tooltip at bottom */}
      <div className="flex items-center gap-1 mt-auto">
        <p className="text-[10px] text-muted-foreground leading-tight">{message}</p>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/60 hover:text-foreground transition-colors">
                  <Info className="w-2.5 h-2.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs max-w-[180px]">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Update date for overtime card */}
      {updateDate && (
        <p className="text-[10px] text-muted-foreground mt-1">{updateDate}</p>
      )}
    </motion.div>
  );
};

export default OverviewCard;
