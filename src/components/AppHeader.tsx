import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";

const AppHeader = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/45 bg-white/55 text-foreground shadow-[0_8px_30px_rgba(31,35,51,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/45">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Parkside</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
            {user?.role}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-9 gap-1.5 text-foreground hover:bg-white/50 hover:text-foreground"
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
