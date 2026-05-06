export type NotificationChannel = 'APP' | 'IN_APP' | 'EMAIL';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ';

export type Notification = {
  id: string;
  title: string | null;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  type: string;
  eventId: string | null;
  reminderOffsetDays: number | null;
  createdAt: string;
  readAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
};

export type NotificationFilters = {
  unreadOnly?: boolean;
  limit?: number;
  channel?: NotificationChannel;
};

export type UnreadCountResponse = {
  count: number;
};

export type RunRemindersResponse = {
  checkedEvents: number;
  createdInAppNotifications: number;
  sentEmails: number;
  failedEmails: number;
  skippedDuplicates: number;
};
