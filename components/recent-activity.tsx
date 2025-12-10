"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './status-badge';
import { Calendar } from 'lucide-react';

type Activity = {
  date: string;
  dateKey?: string; // YYYY-MM-DD format for grouping
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
};

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  activities: propActivities, 
  onSeeAll,
  userSlug 
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

    // Fetch recent activity if not provided
    const fetchRecentActivity = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/admin/recent-activity?range=week');
        if (!response.ok) {
          throw new Error('Failed to fetch recent activity');
        }
        
        const data = await response.json();
        
        // Filter by userSlug if provided, otherwise show all
        let filteredActivities = data.recentActivity || [];
        if (userSlug) {
          filteredActivities = filteredActivities.filter(
            (activity: any) => activity.employeeSlug === userSlug
          );
        }
        
        // Transform to Activity format
        const formattedActivities: Activity[] = filteredActivities.map((activity: any) => {
          const date = new Date(activity.checkinTime);
          
          // Calculate status based on check-in time (same logic as Overview card)
          const checkinTime = new Date(activity.checkinTime);
          const istTime = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const checkinHour = istTime.getHours();
          const checkinMinute = istTime.getMinutes();
          const checkinTimeMinutes = checkinHour * 60 + checkinMinute;
          
          let status: 'on-time' | 'slightly-late' | 'late' = 'on-time';
          if (checkinTimeMinutes < 615) {
            status = 'on-time'; // Before 10:15 (early up to 9:45 counts on-time here)
          } else if (checkinTimeMinutes < 645) {
            status = 'slightly-late'; // 10:15-10:45
          } else {
            status = 'late'; // 10:45 and after
          }
          
          // Get date string in IST for grouping
          const istDate = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const dateKey = istDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          return {
            date: date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'Asia/Kolkata'
            }),
            dateKey: dateKey, // For grouping by day
            status: status,
            time: activity.checkinTimeIST,
            checkinTime: activity.checkinTime,
            mode: activity.mode,
            isOpen: activity.isOpen
          };
        });
        
        // Sort by date (newest first) and take last 5 activities
        const sortedActivities = formattedActivities
          .sort((a, b) => {
            const dateA = new Date(a.checkinTime || a.date);
            const dateB = new Date(b.checkinTime || b.date);
            return dateB.getTime() - dateA.getTime(); // Newest first
          })
          .slice(0, 5); // Last 5 activities
        
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
      // If dateString is already formatted, return as is
      if (dateString.includes(',')) {
        return dateString;
      }
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (activity: Activity) => {
    // Use the calculated status from the activity
    if (activity.status === 'on-time' || activity.status === 'slightly-late' || activity.status === 'late') {
      return <StatusBadge status={activity.status} />;
    }
    // Default to on-time if status is not recognized
    return <StatusBadge status="on-time" />;
  };

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Recent Activity</h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm font-medium text-orange-500 dark:text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            See All
          </button>
        )}
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">Loading activity...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-destructive dark:text-destructive">{error}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-4 elevation-md card-hover relative overflow-hidden"
            >
              {/* Map background overlay effect */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400"></div>
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px'
                }}></div>
              </div>
              
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground dark:text-foreground whitespace-nowrap">
                    {formatDate(activity.date)}
                  </span>
                  {activity.time && (
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  )}
                  {activity.mode && (
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                      {activity.mode === 'office' ? '🏢 Office' : '🏠 Remote'}
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

