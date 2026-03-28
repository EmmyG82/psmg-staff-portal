import { useState } from "react";
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
import { ChevronLeft, ChevronRight, MapPin, Clock, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";

const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m}${ampm}`;
};

interface ShiftRow {
  id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  area: string;
  notes: string | null;
  profiles: { full_name: string } | null;
}

const RosterPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch shifts for the visible week
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", weekStart.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select("id, staff_id, date, start_time, end_time, area, notes, profiles!staff_id(full_name)")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date")
        .order("start_time");

      if (!isAdmin) {
        query = query.eq("staff_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as ShiftRow[]) ?? [];
    },
    enabled: !!user,
  });

  // Fetch staff list for admin shift creation
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

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      id: editingShift?.id,
      staff_id: fd.get("staff_id") as string,
      date: fd.get("date") as string,
      start_time: fd.get("start_time") as string,
      end_time: fd.get("end_time") as string,
      area: fd.get("area") as string,
      notes: fd.get("notes") as string,
    });
  };

  const openEdit = (shift: ShiftRow) => {
    setEditingShift(shift);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingShift(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {isAdmin ? "Full Roster" : "My Roster"}
        </h1>
        {isAdmin && (
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
                  <Label htmlFor="staff_id">Staff Member</Label>
                  <Select name="staff_id" defaultValue={editingShift?.staff_id ?? ""} required>
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input name="date" type="date" defaultValue={editingShift?.date ?? format(new Date(), "yyyy-MM-dd")} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start_time">Start</Label>
                    <Input name="start_time" type="time" defaultValue={editingShift?.start_time?.slice(0, 5) ?? "09:00"} required />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End</Label>
                    <Input name="end_time" type="time" defaultValue={editingShift?.end_time?.slice(0, 5) ?? "14:00"} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input name="area" defaultValue={editingShift?.area ?? ""} placeholder="e.g. Rooms 1–10" required />
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
                      <Card key={shift.id} className={isToday ? "border-primary/30 bg-primary/5" : ""}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {isAdmin && (
                                <p className="text-sm font-semibold text-foreground mb-1">
                                  {shift.profiles?.full_name ?? "Unknown"}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {shift.area}
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
