import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";

export interface Notification {
  id: string;
  action?: { label: string; onClick: () => void };
  type: "info" | "success" | "warning" | "error" | "event" | "message";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const { socket, currentUser } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50

      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: any) => {
      if (data.userId !== currentUser?.userId) {
        addNotification({
          type: "info",
          title: "User Joined",
          message: `${data.username} joined the room`,
        });
      }
    };

    const handleUserLeft = (data: any) => {
      addNotification({
        type: "info",
        title: "User Left",
        message: `${data.username} left the room`,
      });
    };

    const handleEventCreated = (data: any) => {
      addNotification({
        type: "event",
        title: "New Event",
        message: `${data.title} - ${new Date(data.startTime).toLocaleString()}`,
        actionUrl: `/events/${data.eventId}`,
      });
    };

    // Listen for new messages in channels user is not viewing
    const handleChatMessageForChannel = (data: any) => {
      // Only notify if it's not from current user and not in current channel
      if (data.userId !== currentUser?.userId) {
        const currentChannel = localStorage.getItem("currentChannel");
        if (data.channelId && data.channelId !== currentChannel) {
          addNotification({
            type: "message",
            title: `New message in #${data.channelId}`,
            message: `${data.username}: ${data.message?.substring(0, 50)}${data.message?.length > 50 ? "..." : ""}`,
            actionUrl: `/app/chat?channel=${data.channelId}`,
          });
        }
      }
    };

    // Listen for mentions
    const handleChatMessageForMention = (data: any) => {
      if (data.userId !== currentUser?.userId && data.message) {
        const mentionRegex = new RegExp(`@${currentUser?.username}`, "i");
        if (mentionRegex.test(data.message)) {
          addNotification({
            type: "message",
            title: "You were mentioned",
            message: `${data.username} mentioned you: ${data.message.substring(0, 50)}`,
            actionUrl: `/app/chat?channel=${data.channelId || "general"}`,
          });
        }
      }
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("event-created", handleEventCreated);
    socket.on("chat-message", handleChatMessageForChannel);
    socket.on("chat-message", handleChatMessageForMention);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("event-created", handleEventCreated);
      socket.off("chat-message", handleChatMessageForChannel);
      socket.off("chat-message", handleChatMessageForMention);
    };
  }, [socket, currentUser, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
