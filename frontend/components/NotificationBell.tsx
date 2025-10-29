import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const { toast } = useToast();

  const { data, refetch } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      try {
        return await backend.notification.list({ userId });
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast({
          title: "Error",
          description: "Failed to fetch notifications",
          variant: "destructive",
        });
        throw error;
      }
    },
    refetchInterval: 30000,
  });

  const unreadCount = data?.notifications.filter(n => !n.isRead).length || 0;

  const handleMarkRead = async (id: string) => {
    try {
      await backend.notification.markRead({ id, userId });
      refetch();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h3 className="font-medium">Notifications</h3>
          <ScrollArea className="h-96">
            {data?.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                No notifications
              </p>
            ) : (
              <div className="space-y-2">
                {data?.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.isRead
                        ? "bg-background"
                        : "bg-accent"
                    }`}
                    onClick={() => handleMarkRead(notification.id)}
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
