'use client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface WeekStripProps {
  wfhDays: string[];
  size?: 'full' | 'compact';
  onToggle?: (day: string) => void;
}

export default function WeekStrip({ wfhDays, size = 'full', onToggle }: WeekStripProps) {
  const today = new Date();
  const todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()];

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {DAYS.map(day => {
          const isWFH = wfhDays.includes(day);
          const isToday = day === todayName;
          return (
            <div key={day} className="flex flex-col items-center gap-0.5">
              <span className={`w-2 h-2 rounded-full ${isWFH ? 'bg-primary' : 'bg-muted-foreground/30'} ${
                isToday ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''
              }`} />
              <span className={`text-[9px] font-medium ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                {day[0]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {DAYS.map(day => {
        const isWFH = wfhDays.includes(day);
        const isToday = day === todayName;
        const Tag = onToggle ? 'button' : 'div';
        return (
          <Tag
            key={day}
            onClick={onToggle ? () => onToggle(day) : undefined}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all text-center
              ${isWFH ? 'bg-gradient-brand text-primary-foreground border-transparent' : 'bg-muted text-muted-foreground border-transparent hover:border-border'}
              ${isToday ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background' : ''}
              ${onToggle ? 'cursor-pointer active:scale-95' : 'cursor-default'}
            `}
          >
            <span className="block">{day}</span>
            {isWFH && <span className="block text-[9px] opacity-70 mt-0.5">Remote</span>}
          </Tag>
        );
      })}
    </div>
  );
}
