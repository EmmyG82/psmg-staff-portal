import { Bell, CalendarDays, MessageSquare, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const typeIcon = (type: Notification["type"]) => {
  switch (type) {
    case "shift": return <CalendarDays className="h-4 w-4 text-primary" />;
    case "roster": return <CalendarDays className="h-4 w-4 text-primary" />;
    case "message": return <MessageSquare className="h-4 w-4 text-primary" />;
    case "success": return <CheckCircle className="h-4 w-4 text-success" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-warning" />;
    default: return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationTarget = (type: Notification["type"]) => {
  switch (type) {
    case "message":
      return "/messages";
    case "shift":
    case "roster":
      return "/roster";
    case "warning":
      return "/unavailability";
    default:
      return "/dashboard";
  }
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    navigate(getNotificationTarget(notification.type));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 text-foreground hover:bg-white/50 hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2 text-primary"
              onClick={() => {
                void markAllAsRead();
              }}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  void handleNotificationClick(n);
                }}
                className={`w-full text-left flex gap-3 p-3 border-b border-border last:border-0 transition-colors hover:bg-muted/50 ${
                  !n.read ? "bg-accent/50" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
