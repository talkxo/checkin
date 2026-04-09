"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './status-badge';

type Activity = {
  date: string;
  dateKey?: string;
  status: 'on-time' | 'slightly-late' | 'late' | string;
  time?: string;
  checkinTime?: string;
  mode?: string;
  isOpen?: boolean;
};

type RecentActivityProps = {
  activities?: Activity[];
  onSeeAll?: () => void;
  userSlug?: string;
  hideHeading?: boolean;
};

const RecentActivity: React.FC<RecentActivityProps> = ({
  activities: propActivities,
  onSeeAll,
  userSlug,
  hideHeading = false,
}) => {
  const [activities, setActivities] = useState<Activity[]>(propActivities || []);
  const [isLoading, setIsLoading] = useState(!propActivities);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propActivities) {
      setActivities(propActivities);
      setIsLoading(false);
      return;
    }

    const fetchRecentActivity = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const query = userSlug
          ? `/api/admin/recent-activity?range=week&slug=${encodeURIComponent(userSlug)}`
          : '/api/admin/recent-activity?range=week';
        const response = await fetch(query);
        if (!response.ok) {
          throw new Error('Failed to fetch recent activity');
        }

        const data = await response.json();

        let filteredActivities = data.recentActivity || [];
        if (userSlug) {
          filteredActivities = filteredActivities.filter(
            (activity: any) => activity.employeeSlug === userSlug
          );
        }

        const formattedActivities: Activity[] = filteredActivities.map((activity: any) => {
          const date = new Date(activity.checkinTime);

          const checkinTime = new Date(activity.checkinTime);
          const istTime = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const checkinHour = istTime.getHours();
          const checkinMinute = istTime.getMinutes();
          const checkinTimeMinutes = checkinHour * 60 + checkinMinute;

          let status: 'on-time' | 'slightly-late' | 'late' = 'on-time';
          if (checkinTimeMinutes < 615) {
            status = 'on-time';
          } else if (checkinTimeMinutes < 645) {
            status = 'slightly-late';
          } else {
            status = 'late';
          }

          const istDate = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const dateKey = istDate.toISOString().split('T')[0];

          return {
            date: date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'Asia/Kolkata'
            }),
            dateKey: dateKey,
            status: status,
            time: activity.checkinTimeIST,
            checkinTime: activity.checkinTime,
            mode: activity.mode,
            isOpen: activity.isOpen
          };
        });

        const sortedActivities = formattedActivities
          .sort((a, b) => {
            const dateA = new Date(a.checkinTime || a.date);
            const dateB = new Date(b.checkinTime || b.date);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        setActivities(sortedActivities);
      } catch (err) {
        console.error('Error fetching recent activity:', err);
        setError('Failed to load recent activity');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivity();
  }, [propActivities, userSlug]);

  const formatDate = (dateString: string) => {
    try {
      if (dateString.includes(',')) return dateString;
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (activity: Activity) => {
    if (activity.status === 'on-time' || activity.status === 'slightly-late' || activity.status === 'late') {
      return <StatusBadge status={activity.status} />;
    }
    return <StatusBadge status="on-time" />;
  };

  return (
    <div className="w-full">
      {/* Section Header — only shown when hideHeading is false */}
      {!hideHeading && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Sessions</h3>
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              See All
            </button>
          )}
        </div>
      )}

      {/* Activity List */}
      {isLoading ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border/50 p-3 shadow-sm dark:shadow-none"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {formatDate(activity.date)}
                  </span>
                  {activity.time && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  )}
                  {activity.mode && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.mode === 'office' ? '🏢' : '🏠'}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(activity)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
