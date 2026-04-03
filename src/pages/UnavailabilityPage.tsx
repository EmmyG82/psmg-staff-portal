import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Loader2 } from "lucide-react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { toast } from "sonner";

type UnavailabilityRequest = {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  status: string;
  staffName?: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  denied: "bg-destructive/10 text-destructive border-destructive/20",
};

const UnavailabilityPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<UnavailabilityRequest | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const { data: rosterDraft = false } = useQuery<boolean>({
    queryKey: ["roster-draft", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .eq("published", false)
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    enabled: !!user,
  });

  const canManage = isAdmin || !rosterDraft;

  const { data: requests = [], isLoading } = useQuery<UnavailabilityRequest[]>({
    queryKey: ["unavailability", isAdmin, user?.id],
    queryFn: async () => {
      let query = supabase.from("unavailability").select("*").order("start_date", { ascending: false });
      if (!isAdmin) {
        query = query.eq("staff_id", user!.id);
      }
      const { data, error } = await query;
      if (error) throw error;

      if (isAdmin) {
        const rows = (data ?? []) as UnavailabilityRequest[];
        const staffIds = [...new Set(rows.map((r) => r.staff_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds);
        const profilesData = (profiles ?? []) as { user_id: string; full_name: string }[];
        const nameMap = Object.fromEntries(profilesData.map((p) => [p.user_id, p.full_name]));
        return rows.map((r) => ({ ...r, staffName: nameMap[r.staff_id] || "Unknown" }));
      }
      return (data ?? []) as UnavailabilityRequest[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (form: { id?: string; start_date: string; end_date: string }) => {
      if (form.id) {
        const { error } = await supabase.from("unavailability").update({
          start_date: form.start_date,
          end_date: form.end_date,
          status: "approved",
        }).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("unavailability").insert({
          staff_id: user!.id,
          start_date: form.start_date,
          end_date: form.end_date,
          status: "approved",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unavailability"] });
      setOpen(false);
      setEditingRequest(null);
      setStartDate("");
      setEndDate("");
      toast.success(editingRequest ? "Request updated" : "Request submitted");
    },
    onError: () => toast.error("Failed to save request"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unavailability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unavailability"] });
      toast.success("Request removed");
    },
    onError: () => toast.error("Failed to remove request"),
  });

  if (!user) return null;

  const openCreate = () => {
    setEditingRequest(null);
    setStartDate("");
    setEndDate("");
    setOpen(true);
  };

  const openEdit = (req: UnavailabilityRequest) => {
    setEditingRequest(req);
    setStartDate(req.start_date);
    setEndDate(req.end_date);
    setOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{isAdmin ? "Leave Requests" : "My Unavailability"}</h1>
        {!isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" disabled={!canManage}>
                <Plus className="h-4 w-4" /> {editingRequest ? "Edit" : "Submit"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRequest ? "Edit Unavailability" : "Submit Unavailability"}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate({
                    id: editingRequest?.id,
                    start_date: startDate,
                    end_date: endDate,
                  });
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date</Label>
                    <Input
                      id="start"
                      type="date"
                      required
                      className="h-11"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date</Label>
                    <Input
                      id="end"
                      type="date"
                      required
                      className="h-11"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={saveMutation.isPending || !canManage}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRequest ? "Save" : "Submit Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canManage && !isAdmin && (
        <div className="rounded-lg border border-warning p-3 text-sm text-warning">A roster is currently in draft mode. Unavailability entries cannot be added, edited, or removed until the roster is published.</div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No unavailability submitted yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isAdmin && req.staffName && (
                      <p className="text-sm font-semibold text-foreground">{req.staffName}</p>
                    )}
                    <p className="text-sm text-foreground">
                      {format(parseISO(req.start_date), "EEE d MMM")}
                      {req.start_date !== req.end_date && ` – ${format(parseISO(req.end_date), "EEE d MMM")}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors[req.status] ?? "bg-secondary/10 text-secondary border-secondary/20"}>
                    {req.status ?? "approved"}
                  </Badge>
                </div>

                {!isAdmin && req.staff_id === user.id && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9"
                      onClick={() => openEdit(req)}
                      disabled={!canManage}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-9"
                      onClick={() => deleteMutation.mutate(req.id)}
                      disabled={!canManage || deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnavailabilityPage;
