import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MessageSquare, Users, CalendarOff, Shield, ChevronRight, Loader2, Clock, MapPin, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const StatCard = ({ icon: Icon, label, value, to, color, loading }: { icon: LucideIcon; label: string; value: string | number; to: string; color: string; loading?: boolean }) => (
  <Link to={to}>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground">{loading ? "–" : value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
);

const formatShiftDate = (dateStr: string) => format(parseISO(dateStr), "EEE d MMM");

type DashboardMessage = {
  id: string;
  author_id: string;
  authorName: string;
  content: string;
};

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data: staffCount = 0, isLoading: loadingStaff } = useQuery({
    queryKey: ["dashboard-staff-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("active", true);
      return count || 0;
    },
    enabled: isAdmin && !!user,
  });

  const { data: shiftsToday = 0, isLoading: loadingShifts } = useQuery({
    queryKey: ["dashboard-shifts-today", today],
    queryFn: async () => {
      const { count } = await supabase.from("shifts").select("*", { count: "exact", head: true }).eq("date", today);
      return count || 0;
    },
    enabled: isAdmin && !!user,
  });

  const { data: pendingLeave = 0, isLoading: loadingLeave } = useQuery({
    queryKey: ["dashboard-pending-leave"],
    queryFn: async () => {
      const { count } = await supabase.from("unavailability").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
    enabled: isAdmin && !!user,
  });

  const { data: messageCount = 0, isLoading: loadingMsgCount } = useQuery({
    queryKey: ["dashboard-message-count"],
    queryFn: async () => {
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled:  !!user,
  });

  const { data: recentMessages = [] } = useQuery<DashboardMessage[]>({
    queryKey: ["dashboard-recent-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      const authorIds = [...new Set(data.map((m) => m.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      return data.map((m) => ({ ...m, authorName: nameMap[m.author_id] || "The Invisible One" }));
    },
    enabled: isAdmin && !!user,
  });

  const { data: myShifts = [] } = useQuery({
    queryKey: ["dashboard-my-shifts", user?.id],
    queryFn: async () => {
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(currentWeekStart, 6);
      const { data, error } = await supabase.from("shifts").select("*").eq("staff_id", user!.id).gte("date", format(CurrentWeekStart, "yyyy-MM-dd")).lte("date", format(weekEnd, "yyyy-MM-dd")).order("date", { ascending: true }).order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !isAdmin && !!user,
  });

  if (!user) return null;

  if (isAdmin) {
    return (
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">G'day, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Staff Members" value={staffCount} to="/staff" color="bg-primary/10 text-primary" loading={loadingStaff} />
          <StatCard icon={CalendarDays} label="Shifts Today" value={shiftsToday} to="/roster" color="bg-secondary/10 text-secondary" loading={loadingShifts} />
          <StatCard icon={CalendarOff} label="Pending Leave" value={pendingLeave} to="/unavailability" color="bg-warning/10 text-warning" loading={loadingLeave} />
          <StatCard icon={MessageSquare} label="Messages" value={messageCount} to="/messages" color="bg-success/10 text-success" loading={loadingMsgCount} />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No messages yet</p>
            ) : recentMessages.map((m) => (
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

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 14 }, (_, i) => addDays(twoWeeksStart, i));

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Hey, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Your roster</p>
      </div>

      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayShifts = myShifts.filter((s) => isSameDay(parseISO(s.date), day));
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {format(day, "EEEE d MMM")}
                {isToday && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Today</span>}
              </p>
              {dayShifts.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-3 text-center text-sm text-muted-foreground">
                    No shifts
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map((shift) => {
                    const isCancelled = ["cancelled", "staff_cancelled", "admin_cancelled"].includes(shift.status);
                    const statusBg = isCancelled
                      ? "bg-red-600 text-white border-red-600"
                      : shift.status === "day_off"
                      ? "bg-black text-white border-black"
                      : shift.status === "message_required"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-green-600 text-white border-green-600";
                    const formatTime = (t: string) => {
                      const [h, m] = t.split(":").map(Number);
                      const period = h >= 12 ? "pm" : "am";
                      const hour = h % 12 || 12;
                      return `${hour}:${String(m).padStart(2, "0")}${period}`;
                    };
                    return (
                    <Card key={shift.id} className={statusBg}>
  <CardContent className="p-3">
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {formatTime(shift.start_time)} – Until Required
      </span>
    </div>

    {shift.notes && (
      <p className="text-xs mt-1 opacity-90">{shift.notes}</p>
    )}
  </CardContent>
</Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Duplicate CTA grid removed; bottom nav already provides Leave and Messages access */}
    </div>
  );
};

export default DashboardPage;
