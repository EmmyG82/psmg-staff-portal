import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarDays, MessageSquare, FileText, CalendarOff, Shield, ChevronRight } from "lucide-react";

const adminLinks = [
  { to: "/staff", icon: Users, label: "Staff Management", desc: "Add, deactivate, manage roles" },
  { to: "/roster", icon: CalendarDays, label: "Roster", desc: "Create and manage shifts" },
  { to: "/unavailability", icon: CalendarOff, label: "Leave Requests", desc: "View and approve requests" },
  { to: "/messages", icon: MessageSquare, label: "Messages", desc: "Post announcements, manage messages" },
  { to: "/files", icon: FileText, label: "Staff Files", desc: "Upload and manage documents" },
];

const AdminPage = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Admin Controls</h1>
      </div>

      <div className="space-y-2">
        {adminLinks.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-shadow mb-2">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
