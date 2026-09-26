/**
 * Notification System API Client.
 * Section 24 — Notification System.
 */
import { apiClient } from './api';
import {
  NotificationItem,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationPreferencesResponse,
  NotificationPreferenceItem,
  NotificationFilterParams
} from '../types';

export const notificationApi = {
  /**
   * Fetches paginated notifications for the authenticated user.
   */
  async fetchNotifications(params: NotificationFilterParams = {}): Promise<NotificationListResponse> {
    const query = new URLSearchParams();
    if (params.unread_only !== undefined) query.append('unread_only', String(params.unread_only));
    if (params.category) query.append('category', params.category);
    if (params.severity) query.append('severity', params.severity);
    if (params.priority) query.append('priority', params.priority);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.page_size) query.append('page_size', String(params.page_size));

    const response = await apiClient.get<NotificationListResponse>(`/notifications?${query.toString()}`);
    return response.data;
  },

  /**
   * Fast count of unread notifications for bell badge.
   */
  async fetchUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  /**
   * Fetches a single notification by ID.
   */
  async fetchNotification(notificationId: string): Promise<NotificationItem> {
    const response = await apiClient.get<NotificationItem>(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<NotificationItem> {
    const response = await apiClient.patch<NotificationItem>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Marks all unread notifications for the user as read.
   */
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    const response = await apiClient.post<{ message: string; count: number }>('/notifications/read-all');
    return response.data;
  },

  /**
   * Dismisses a notification from user view.
   */
  async dismissNotification(notificationId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.patch<{ message: string; id: string }>(`/notifications/${notificationId}/dismiss`);
    return response.data;
  },

  /**
   * Fetches user's channel preferences across all categories.
   */
  async fetchPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await apiClient.get<NotificationPreferencesResponse>('/notifications/preferences');
    return response.data;
  },

  /**
   * Updates user's notification preferences.
   */
  async updatePreferences(preferences: { category: string; channel: string; enabled: boolean }[]): Promise<NotificationPreferencesResponse> {
    const response = await apiClient.put<NotificationPreferencesResponse>('/notifications/preferences', { preferences });
    return response.data;
  }
};
