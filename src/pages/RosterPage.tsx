import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  status: string;
}

interface UnavailabilityRow {
  staff_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface DateShiftAllocation {
  id: string;
  staff_id: string;
  date: string;
}

const RosterPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; staffId: string; date: string } | null>(null);
  const [cancelNote, setCancelNote] = useState("");

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", weekStart.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select("id, staff_id, date, start_time, end_time, area, notes, published, status")
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

  const { data: dateAllocations = [] } = useQuery<DateShiftAllocation[]>({
    queryKey: ["date-allocations", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, staff_id, date")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return (data ?? []) as DateShiftAllocation[];
    },
    enabled: isAdmin,
  });

  const unavailableStaffByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      map[dayKey] = new Set<string>();
    });

    unavailability.forEach((u) => {
      weekDays.forEach((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        if (dayKey >= u.start_date && dayKey <= u.end_date) {
          map[dayKey].add(u.staff_id);
        }
      });
    });

    return map;
  }, [unavailability, weekDays]);

  const alreadyAllocatedStaffByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    weekDays.forEach((day) => {
      map[format(day, "yyyy-MM-dd")] = new Set<string>();
    });

    dateAllocations.forEach((allocation) => {
      if (!map[allocation.date]) {
        map[allocation.date] = new Set<string>();
      }
      map[allocation.date].add(allocation.staff_id);
    });

    return map;
  }, [dateAllocations, weekDays]);

  const unavailableStaffForDate = useMemo(() => {
    return unavailableStaffByDate[selectedDate] ?? new Set<string>();
  }, [unavailableStaffByDate, selectedDate]);

  const alreadyAllocatedStaffForDate = useMemo(() => {
    const allocated = new Set(alreadyAllocatedStaffByDate[selectedDate] ?? []);
    if (editingShift?.id) {
      allocated.delete(editingShift.staff_id);
    }
    return allocated;
  }, [alreadyAllocatedStaffByDate, editingShift?.id, editingShift?.staff_id, selectedDate]);

  const createShiftForDay = (staffId: string, date: string) => {
    setEditingShift(null);
    setSelectedDate(date);
    saveMutation.mutate({
      staff_id: staffId,
      date,
      start_time: "10:00",
      end_time: "23:59",
      area: "General",
      notes: "",
    });
  };

  const hasUnpublished = isAdmin && shifts.some((s) => !s.published);
  const hasPublished = shifts.some((s) => s.published);
  const publishLabel = hasPublished ? "Republish Roster" : "Publish Roster";

  const notifyAffectedStaff = async (staffIds: string[], title: string, message: string, type: "shift" | "roster") => {
    const uniqueIds = [...new Set(staffIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    const { error } = await supabase.rpc("notify_users", {
      _recipient_ids: uniqueIds,
      _title: title,
      _message: message,
      _type: type,
    });

    if (error) {
      console.error("Failed to create roster notifications", error);
    }
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, staffId, date, notes }: { id: string; status: string; staffId: string; date: string; notes?: string }) => {
      const updateData: { status: string; published: boolean; notes?: string } = { status, published: false };
      if (notes !== undefined) updateData.notes = notes;
      const { error } = await supabase.from("shifts").update(updateData).eq("id", id);
      if (error) throw error;

      await notifyAffectedStaff(
        [staffId],
        "Roster Change",
        `Your shift on ${format(parseISO(date), "EEE d MMM")} was updated to ${status.replace(/_/g, " ")}.`,
        "shift"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (form: { id?: string; staff_id: string; date: string; start_time: string; end_time: string; area: string; notes: string }) => {
      const previousStaffId = editingShift?.staff_id;

      let duplicateShiftQuery = supabase
        .from("shifts")
        .select("id")
        .eq("staff_id", form.staff_id)
        .eq("date", form.date)
        .limit(1);

      if (form.id) {
        duplicateShiftQuery = duplicateShiftQuery.neq("id", form.id);
      }

      const { data: existingShift, error: duplicateCheckError } = await duplicateShiftQuery;
      if (duplicateCheckError) throw duplicateCheckError;
      if ((existingShift ?? []).length > 0) {
        throw new Error("This staff member already has a shift on that date.");
      }

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

        const affectedStaffIds = previousStaffId && previousStaffId !== form.staff_id
          ? [previousStaffId, form.staff_id]
          : [form.staff_id];

        await notifyAffectedStaff(
          affectedStaffIds,
          "Roster Change",
          `Your shift on ${format(parseISO(form.date), "EEE d MMM")} was updated.`,
          "shift"
        );
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

        await notifyAffectedStaff(
          [form.staff_id],
          "New Shift Assigned",
          `A shift was added to your roster for ${format(parseISO(form.date), "EEE d MMM")}.`,
          "shift"
        );
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
    mutationFn: async ({ id, staffId, date }: { id: string; staffId: string; date: string }) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;

      await notifyAffectedStaff(
        [staffId],
        "Shift Removed",
        `Your shift on ${format(parseISO(date), "EEE d MMM")} was removed from the roster.`,
        "shift"
      );
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
      await notifyAffectedStaff(
        affectedStaffIds,
        "Roster Published",
        `Your roster for ${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")} has been published or updated.`,
        "roster"
      );
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
                {publishMutation.isPending ? "Publishing..." : publishLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {isAdmin && cancelTarget && (
        <Dialog open={cancelDialogOpen} onOpenChange={(open) => { setCancelDialogOpen(open); if (!open) { setCancelTarget(null); setCancelNote(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cancel-note">Cancellation Note (optional)</Label>
                <Input
                  id="cancel-note"
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Reason for cancellation"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    statusMutation.mutate({
                      id: cancelTarget.id,
                      status: "cancelled",
                      staffId: cancelTarget.staffId,
                      date: cancelTarget.date,
                      notes: cancelNote || undefined,
                    });
                    setCancelDialogOpen(false);
                    setCancelTarget(null);
                    setCancelNote("");
                  }}
                >
                  {statusMutation.isPending ? "Saving..." : "Confirm Cancellation"}
                </Button>
                <Button variant="outline" onClick={() => { setCancelDialogOpen(false); setCancelTarget(null); setCancelNote(""); }}>
                  Back
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingShift(null); }}>
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
                      const isAllocated = alreadyAllocatedStaffForDate.has(s.user_id);
                      return (
                        <SelectItem
                          key={s.user_id}
                          value={s.user_id}
                          disabled={isUnavailable || isAllocated}
                          className={isUnavailable || isAllocated ? "opacity-50" : ""}
                        >
                          {s.full_name}
                          {isUnavailable ? " (Unavailable)" : isAllocated ? " (Already allocated)" : ""}
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
      )}

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

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600 shrink-0" />Scheduled</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-black shrink-0" />Day Off / Unavailable</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />Cancelled</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />Message Required</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading shifts...</p>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.date), day));
            const isToday = isSameDay(day, new Date());
            const dayDate = format(day, "yyyy-MM-dd");
            const unavailableStaffForDay = unavailableStaffByDate[dayDate] ?? new Set<string>();
            const alreadyAllocatedStaffForDay = alreadyAllocatedStaffByDate[dayDate] ?? new Set<string>();

            return (
              <div key={day.toISOString()}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEEE d MMM")}
                    {isToday && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Today</span>}
                  </p>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={saveMutation.isPending}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Shift
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                        {staffList.map((staff) => {
                          const isUnavailable = unavailableStaffForDay.has(staff.user_id);
                          const isAllocated = alreadyAllocatedStaffForDay.has(staff.user_id);
                          return (
                            <DropdownMenuItem
                              key={`${dayDate}-${staff.user_id}`}
                              disabled={isUnavailable || isAllocated || saveMutation.isPending}
                              className={isUnavailable || isAllocated ? "opacity-50" : ""}
                              onClick={() => createShiftForDay(staff.user_id, dayDate)}
                            >
                              {staff.full_name}
                              {isUnavailable ? " (Unavailable)" : isAllocated ? " (Already allocated)" : ""}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {dayShifts.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-3 text-center text-sm text-muted-foreground">
                      No shifts
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {dayShifts.map((shift) => {
                      const statusBg = shift.status === "cancelled"
                        ? "bg-red-600 text-white border-red-600"
                        : shift.status === "staff_cancelled"
                        ? "bg-red-600 text-white border-red-600"
                        : shift.status === "admin_cancelled"
                        ? "bg-black text-white border-black"
                        : shift.status === "day_off"
                        ? "bg-black text-white border-black"
                        : shift.status === "message_required"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-green-600 text-white border-green-600";
                      const isNotScheduled = shift.status === "cancelled" || shift.status === "staff_cancelled" || shift.status === "admin_cancelled" || shift.status === "day_off";
                      const statusLabel = shift.status === "cancelled" || shift.status === "staff_cancelled"
                        ? "Cancelled"
                        : shift.status === "admin_cancelled" || shift.status === "day_off"
                        ? "Day Off / Unavailable"
                        : shift.status === "message_required"
                        ? "Message Required"
                        : "10:00am – Until Required";

                      return (
                        <Card key={shift.id} className={`${statusBg} ${isAdmin && !shift.published ? "border-dashed opacity-90" : ""}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {isAdmin && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold">
                                      {staffNameMap[shift.staff_id] ?? "Unknown"}
                                    </p>
                                    {!shift.published && (
                                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">Draft</span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {statusLabel}
                                  </span>
                                </div>
                                {shift.notes && (
                                  <p className="text-xs mt-1 opacity-80">{shift.notes}</p>
                                )}
                              </div>
                              {isAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-inherit hover:bg-white/20">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {shift.status === "scheduled" && (
                                      <>
                                        <DropdownMenuItem onClick={() => {
                                          setCancelTarget({ id: shift.id, staffId: shift.staff_id, date: shift.date });
                                          setCancelNote(shift.notes ?? "");
                                          setCancelDialogOpen(true);
                                        }}>
                                          <span className="h-3 w-3 rounded-full bg-red-600 mr-2 shrink-0" /> Cancel Shift
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: shift.id, status: "day_off", staffId: shift.staff_id, date: shift.date })}>
                                          <span className="h-3 w-3 rounded-full bg-black border border-gray-400 mr-2 shrink-0" /> Day Off / Unavailable
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => statusMutation.mutate({ id: shift.id, status: "message_required", staffId: shift.staff_id, date: shift.date })}>
                                          <span className="h-3 w-3 rounded-full bg-blue-600 mr-2 shrink-0" /> Message Required
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {(isNotScheduled || shift.status === "message_required") && (
                                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: shift.id, status: "scheduled", staffId: shift.staff_id, date: shift.date })}>
                                        <Clock className="h-4 w-4 mr-2" /> Restore Shift
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => openEdit(shift)}>
                                      <Pencil className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate({ id: shift.id, staffId: shift.staff_id, date: shift.date })}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
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
      )}
    </div>
  );
};

export default RosterPage;
