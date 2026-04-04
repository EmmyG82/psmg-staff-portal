import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "shift" | "message" | "roster";
  read: boolean;
  createdAt: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const isNotificationType = (
  type: string
): type is Notification["type"] => ["info", "success", "warning", "shift", "message", "roster"].includes(type);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load notifications", error);
        return;
      }

      const mapped = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: isNotificationType(row.type) ? row.type : "info",
        read: row.read,
        createdAt: new Date(row.created_at),
      }));
      setNotifications(mapped);
    };

    loadNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
            read: boolean;
            created_at: string;
          };

          setNotifications((prev) => {
            if (prev.some((item) => item.id === row.id)) return prev;
            return [
              {
                id: row.id,
                title: row.title,
                message: row.message,
                type: isNotificationType(row.type) ? row.type : "info",
                read: row.read,
                createdAt: new Date(row.created_at),
              },
              ...prev,
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; read: boolean };
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? { ...n, read: row.read } : n)));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "read" | "createdAt">) => {
      if (!user) return;

      const createdAt = new Date();
      const optimistic: Notification = {
        ...n,
        id: crypto.randomUUID(),
        read: false,
        createdAt,
      };

      setNotifications((prev) => [optimistic, ...prev]);

      void supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: false,
        })
        .then(({ error }) => {
          if (error) {
            console.error("Failed to persist notification", error);
            setNotifications((prev) => prev.filter((item) => item.id !== optimistic.id));
          }
        });
    },
    [user]
  );

  const markAsRead = useCallback((id: string) => {
    void supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    if (user) {
      void supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const clearAll = useCallback(() => {
    if (user) {
      void supabase.from("notifications").delete().eq("user_id", user.id);
    }
    setNotifications([]);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
