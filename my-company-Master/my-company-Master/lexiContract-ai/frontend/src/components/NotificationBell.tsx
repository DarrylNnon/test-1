'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Notification } from '@/types';
import { BellIcon } from '@heroicons/react/24/outline';

export default function NotificationBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!token) return;
    
    // Initial fetch of existing notifications
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data.sort((a: Notification, b: Notification) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    fetchNotifications();

    // Establish WebSocket connection for real-time updates
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).host : 'localhost:8000';
    const wsUrl = `${wsProtocol}//${wsHost}/api/v1/notifications/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('Notification WebSocket connected.');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_notification') {
        const newNotification: Notification = message.payload;
        // Add the new notification to the top of the list
        setNotifications(prev => [newNotification, ...prev]);
      }
    };

    ws.onclose = () => console.log('Notification WebSocket disconnected.');
    ws.onerror = (err) => console.error('Notification WebSocket error:', err);

    // Cleanup on component unmount
    return () => ws.close();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return;

    try {
      await api.patch(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 transform translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 text-sm font-semibold text-gray-900 border-b">Notifications</div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className={`block px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 ${!notification.is_read ? 'bg-blue-50' : ''}`}
                  >
                    <p className="font-medium">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">No notifications yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}