import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Trash2, Check, CheckCheck, Inbox, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatRelative(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

type FilterTab = "all" | "unread";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const utils = trpc.useUtils();

  const {
    data: allNotifications = [],
    isLoading,
  } = trpc.notifications.getAll.useQuery(undefined, {
    // Poll every 60s while the bell is mounted so the badge stays fresh
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    utils.notifications.getAll.invalidate();
    utils.notifications.getUnread.invalidate();
    utils.notifications.getUnreadCount.invalidate();
  };

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: invalidate,
    onError: (err) => toast.error("Couldn't mark as read", { description: err.message }),
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: (err) => toast.error("Couldn't mark all as read", { description: err.message }),
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("Notification deleted");
    },
    onError: (err) => toast.error("Couldn't delete notification", { description: err.message }),
  });

  const unreadCount = useMemo(
    () => allNotifications.filter((n: any) => n.isRead === 0).length,
    [allNotifications]
  );

  const visibleNotifications = useMemo(
    () => (filter === "unread" ? allNotifications.filter((n: any) => n.isRead === 0) : allNotifications),
    [allNotifications, filter]
  );

  // Close on Escape + restore focus
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[32rem] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-4 pt-3">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#DC143C] hover:text-[#B91030] disabled:opacity-50"
                >
                  {markAllAsReadMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Mark all read
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-2 pb-2">
              {([
                { key: "all", label: "All", count: allNotifications.length },
                { key: "unread", label: "Unread", count: unreadCount },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === t.key
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                  <span
                    className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-[10px] font-semibold ${
                      filter === t.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">
                  {filter === "unread" ? "No unread notifications" : "No notifications"}
                </p>
                <p className="text-xs mt-1 text-gray-400">
                  {filter === "unread"
                    ? "You're all caught up."
                    : "You'll see updates here when coaches leave feedback or assign new drills."}
                </p>
                {filter === "unread" && allNotifications.length > 0 && (
                  <button
                    onClick={() => setFilter("all")}
                    className="mt-3 text-xs text-[#DC143C] font-medium hover:underline"
                  >
                    View all notifications
                  </button>
                )}
              </div>
            ) : (
              visibleNotifications.map((notification: any) => {
                const isDeleting = deleteNotificationMutation.isPending &&
                  deleteNotificationMutation.variables?.notificationId === notification.id;
                return (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
                      notification.isRead === 0 ? "bg-red-50/60" : ""
                    } ${isDeleting ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {notification.isRead === 0 && (
                            <span
                              className="h-2 w-2 rounded-full bg-[#DC143C] shrink-0"
                              aria-label="Unread"
                            />
                          )}
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p
                          className="text-xs text-gray-500 mt-2"
                          title={new Date(notification.createdAt).toLocaleString()}
                        >
                          {formatRelative(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        {notification.isRead === 0 && (
                          <button
                            onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                            disabled={markAsReadMutation.isPending}
                            className="p-1.5 text-[#DC143C] hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotificationMutation.mutate({ notificationId: notification.id })}
                          disabled={deleteNotificationMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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
          aria-hidden="true"
        />
      )}
    </div>
  );
}
