import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

const AppHeader = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Parkside</span>
          <span className="text-xs bg-primary-foreground/15 rounded-full px-2 py-0.5 font-medium capitalize">
            {user?.role}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-primary-foreground hover:bg-primary-foreground/10 h-9 gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
