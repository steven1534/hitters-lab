import { useState, useEffect } from 'react';
import { Bell, Trash2, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/contexts/NotificationContext';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { addToast } = useNotification();

  const { data: unreadNotifications = [], isLoading, refetch } = trpc.notifications.getUnread.useQuery();
  const { data: allNotifications = [] } = trpc.notifications.getAll.useQuery();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetch();
      addToast({ type: 'success', title: 'Notification deleted' });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleDelete = (notificationId: number) => {
    deleteNotificationMutation.mutate({ notificationId });
  };

  const unreadCount = unreadNotifications.length;

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">{unreadCount} unread</p>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : allNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              allNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
                    notification.isRead === 0 ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {notification.isRead === 0 && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 text-[#DC143C] hover:bg-red-100 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {allNotifications.length > 0 && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Close on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
