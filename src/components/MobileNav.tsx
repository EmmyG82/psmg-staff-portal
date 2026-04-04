import { Link, useLocation } from "react-router-dom";
import { CalendarDays, MessageSquare, Home, CalendarOff, Users, Settings, Triangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MobileNav = () => {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  const staffLinks = [
    { to: "/dashboard", icon: Home, label: "Home" },
    { to: "/roster", icon: CalendarDays, label: "Roster" },
    { to: "/unavailability", icon: CalendarOff, label: "Leave" },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
    { to: "/profile", icon: Settings, label: "Profile" },
  ];

  const adminLinks = [
    { to: "/dashboard", icon: Home, label: "Home" },
    { to: "/roster", icon: CalendarDays, label: "Roster" },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
    { to: "/staff", icon: Users, label: "Staff" },
    { to: "/admin", icon: Triangle, label: "Admin" },
    { to: "/profile", icon: Settings, label: "Profile" },
  ];

  const links = isAdmin ? adminLinks : staffLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-1">
        {links.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors min-w-0 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
