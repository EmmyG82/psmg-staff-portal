import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Clock, Plus, MoreVertical, Pencil, Trash2, Send } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";

interface ShiftRow {
  id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  area: string;
  notes: string | null;
  published: boolean;
}

interface UnavailabilityRow {
  staff_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

const RosterPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", weekStart.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select("id, staff_id, date, start_time, end_time, area, notes, published")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date")
        .order("start_time");

      if (!isAdmin) {
        query = query.eq("staff_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ShiftRow[];
    },
    enabled: !!user,
  });

  const staffIds = useMemo(() => [...new Set(shifts.map((s) => s.staff_id))], [shifts]);
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["staff-profiles", staffIds],
    queryFn: async () => {
      if (staffIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", staffIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: staffIds.length > 0,
  });

  const staffNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    staffProfiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [staffProfiles]);

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  // Fetch unavailability for the visible week
  const { data: unavailability = [] } = useQuery({
    queryKey: ["unavailability-week", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unavailability")
        .select("staff_id, start_date, end_date, status")
        .in("status", ["pending", "approved"])
        .lte("start_date", format(weekEnd, "yyyy-MM-dd"))
        .gte("end_date", format(weekStart, "yyyy-MM-dd"));
      if (error) throw error;
      return (data ?? []) as UnavailabilityRow[];
    },
    enabled: isAdmin,
  });

  // Build a set of staff_ids unavailable for the selected date
  const unavailableStaffForDate = useMemo(() => {
    const set = new Set<string>();
    const d = selectedDate;
    unavailability.forEach((u) => {
      if (d >= u.start_date && d <= u.end_date) {
        set.add(u.staff_id);
      }
    });
    return set;
  }, [unavailability, selectedDate]);

  const hasUnpublished = isAdmin && shifts.some((s) => !s.published);
  const hasPublished = shifts.some((s) => s.published);
  const publishLabel = hasPublished ? "Republish Roster" : "Publish Roster";
  const saveMutation = useMutation({
    mutationFn: async (form: { id?: string; staff_id: string; date: string; start_time: string; end_time: string; area: string; notes: string }) => {
      if (form.id) {
        const { error } = await supabase.from("shifts").update({
          staff_id: form.staff_id,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          area: form.area,
          notes: form.notes || null,
          published: false,
        }).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shifts").insert({
          staff_id: form.staff_id,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          area: form.area,
          notes: form.notes || null,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setDialogOpen(false);
      setEditingShift(null);
      toast.success(editingShift ? "Shift updated" : "Shift created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const unpublished = shifts.filter((s) => !s.published);
      if (unpublished.length === 0) return;
      const unpublishedIds = unpublished.map((s) => s.id);
      const { error } = await supabase
        .from("shifts")
        .update({ published: true })
        .in("id", unpublishedIds);
      if (error) throw error;

      // Notify only affected staff
      const affectedStaffIds = [...new Set(unpublished.map((s) => s.staff_id))];
      const notifications = affectedStaffIds.map((staffId) => ({
        user_id: staffId,
        title: "Roster Updated",
        message: `Your roster for ${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")} has been updated.`,
        type: "roster",
      }));
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Roster published to affected staff");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      id: editingShift?.id,
      staff_id: fd.get("staff_id") as string,
      date: fd.get("date") as string,
      start_time: "10:00",
      end_time: "23:59",
      area: "General",
      notes: fd.get("notes") as string,
    });
  };

  const openEdit = (shift: ShiftRow) => {
    setEditingShift(shift);
    setSelectedDate(shift.date);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingShift(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">
          {isAdmin ? "Full Roster" : "My Roster"}
        </h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {hasUnpublished && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="text-primary border-primary"
              >
                <Send className="h-4 w-4 mr-1" />
                {publishMutation.isPending ? "Publishing..." : "Publish Roster"}
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingShift(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingShift ? "Edit Shift" : "Add Shift"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      name="date"
                      type="date"
                      defaultValue={editingShift?.date ?? format(new Date(), "yyyy-MM-dd")}
                      required
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff_id">Staff Member</Label>
                    <Select name="staff_id" defaultValue={editingShift?.staff_id ?? ""} required>
                      <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {staffList.map((s) => {
                          const isUnavailable = unavailableStaffForDate.has(s.user_id);
                          return (
                            <SelectItem
                              key={s.user_id}
                              value={s.user_id}
                              disabled={isUnavailable}
                              className={isUnavailable ? "opacity-50" : ""}
                            >
                              {s.full_name}{isUnavailable ? " (Unavailable)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Shift Time</Label>
                    <p className="text-sm text-muted-foreground mt-1">10:00am – Until Required</p>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input name="notes" defaultValue={editingShift?.notes ?? ""} placeholder="Any notes" />
                  </div>
                  <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : editingShift ? "Update Shift" : "Create Shift"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-2">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading shifts...</p>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.date), day));
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
                      <Card key={shift.id} className={`${isToday ? "border-primary/30 bg-primary/5" : ""} ${isAdmin && !shift.published ? "border-dashed border-muted-foreground/40" : ""}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {isAdmin && (
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-foreground">
                                    {staffNameMap[shift.staff_id] ?? "Unknown"}
                                  </p>
                                  {!shift.published && (
                                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Draft</span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  10:00am – Until Required
                                </span>
                              </div>
                              {shift.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                              )}
                            </div>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(shift)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(shift.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RosterPage;
