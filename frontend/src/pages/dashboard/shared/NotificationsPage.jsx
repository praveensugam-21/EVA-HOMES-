import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell, FaCheckDouble, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { notificationsAPI, getErrorMessage } from "../../../api/api";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsAPI.list();
      setItems(data.items);
      setUnreadCount(data.unread_count);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load notifications."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to mark as read."));
    }
  };

  const handleMarkAll = async () => {
    setIsMarkingAll(true);
    try {
      await notificationsAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to mark all as read."));
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
      actions={
        unreadCount > 0 && (
          <button
            type="button"
            disabled={isMarkingAll}
            onClick={handleMarkAll}
            className="inline-flex items-center gap-2 border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-50"
          >
            <FaCheckDouble className="text-xs" /> Mark all read
          </button>
        )
      }
    >
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-zinc-400"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
          <FaBell className="mx-auto text-3xl text-zinc-300 mb-3" />
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Wrapper = n.link ? Link : "div";
            return (
              <Wrapper
                key={n.id}
                to={n.link}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={`block bg-white border rounded-xl shadow-sm p-4 transition ${
                  n.is_read ? "border-zinc-200" : "border-zinc-900"
                } ${n.link ? "hover:border-zinc-400 cursor-pointer" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-semibold ${n.is_read ? "text-zinc-700" : "text-zinc-950"}`}>{n.title}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-zinc-400 mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-zinc-900 mt-1.5 shrink-0" />}
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
