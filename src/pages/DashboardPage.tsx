import { useAuth } from "@/contexts/AuthContext";
import { mockShifts, mockMessages, mockUnavailability } from "@/data/mockData";
import { MOCK_USERS } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MessageSquare, Users, CalendarOff, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

const StatCard = ({ icon: Icon, label, value, to, color }: { icon: any; label: string; value: string | number; to: string; color: string }) => (
  <Link to={to}>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
);

const formatShiftDate = (dateStr: string) => format(parseISO(dateStr), "EEE d MMM");
const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m}${ampm}`;
};

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const staffUsers = MOCK_USERS.filter((u) => u.role === "staff");

  if (isAdmin) {
    const pendingLeave = mockUnavailability.filter((u) => u.status === "pending").length;
    return (
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">G'day, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Staff Members" value={staffUsers.length} to="/staff" color="bg-primary/10 text-primary" />
          <StatCard icon={CalendarDays} label="Shifts Today" value={mockShifts.filter((s) => s.date === today).length} to="/roster" color="bg-secondary/10 text-secondary" />
          <StatCard icon={CalendarOff} label="Pending Leave" value={pendingLeave} to="/unavailability" color="bg-warning/10 text-warning" />
          <StatCard icon={MessageSquare} label="Messages" value={mockMessages.length} to="/messages" color="bg-success/10 text-success" />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockMessages.slice(0, 3).map((m) => (
              <div key={m.id} className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {m.authorName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.authorName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{m.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Staff dashboard
  const myShifts = mockShifts.filter((s) => s.staffId === user.id).sort((a, b) => a.date.localeCompare(b.date));
  const nextShift = myShifts.find((s) => s.date >= today);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Hey, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Here's what's coming up</p>
      </div>

      {nextShift ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Next Shift</p>
            <p className="text-lg font-bold text-foreground">{formatShiftDate(nextShift.date)}</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(nextShift.startTime)} – {formatTime(nextShift.endTime)}
            </p>
            <p className="text-sm text-muted-foreground">{nextShift.area}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground text-sm">
            No upcoming shifts scheduled.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CalendarDays} label="My Shifts" value={myShifts.length} to="/roster" color="bg-primary/10 text-primary" />
        <StatCard icon={MessageSquare} label="Messages" value={mockMessages.length} to="/messages" color="bg-secondary/10 text-secondary" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/unavailability">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <CalendarOff className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Submit Leave</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/files">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <svg className="h-6 w-6 mx-auto mb-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-medium text-muted-foreground">My Files</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
