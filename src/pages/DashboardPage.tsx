import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MessageSquare, Users, CalendarOff, ChevronRight, Loader2, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const StatCard = ({ icon: Icon, label, value, to, color, loading }: { icon: any; label: string; value: string | number; to: string; color: string; loading?: boolean }) => (
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
    enabled: !!user,
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ["dashboard-recent-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      const authorIds = [...new Set(data.map((m) => m.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      return data.map((m) => ({ ...m, authorName: nameMap[m.author_id] || "Unknown" }));
    },
    enabled: isAdmin && !!user,
  });

  // Staff-specific queries
  const { data: myShifts = [] } = useQuery({
    queryKey: ["dashboard-my-shifts", user?.id],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const { data, error } = await supabase.from("shifts").select("*").eq("staff_id", user!.id).gte("date", format(weekStart, "yyyy-MM-dd")).lte("date", format(weekEnd, "yyyy-MM-dd")).order("date", { ascending: true }).order("start_time", { ascending: true });
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
            ) : recentMessages.map((m: any) => (
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
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Hey, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Your weekly roster</p>
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
                  {dayShifts.map((shift) => (
                    <Card key={shift.id} className={isToday ? "border-primary/30 bg-primary/5" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            10:00am – Until Required
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {shift.area}
                          </span>
                        </div>
                        {shift.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
        <Link to="/messages">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Messages</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
