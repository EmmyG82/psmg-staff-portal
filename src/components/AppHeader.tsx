import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

const AppHeader = () => {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/45 bg-white/55 text-foreground shadow-[0_8px_30px_rgba(31,35,51,0.06)] backdrop-blur-x0 supports-[backdrop-filter]:bg-white/45">
      <div className="relative flex items-center justify-between px-4 h-14 w-full">

        {/* 3 — LEFT: Notification Bell */}
        <div>
          <NotificationBell />
        </div>

        {/* 1 — CENTER: Logo (bigger + centered) */}
        <div className="absolute left-1/2 -translate-x-1/2 text-xl font-bold tracking-tight">
          <img src="/logo.svg" alt="Parkside Logo" className="h-20" />
        </div>

        {/* 2 — RIGHT: Logout */}
        <div>
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
