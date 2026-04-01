import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  denied: "bg-destructive/10 text-destructive border-destructive/20",
};

const UnavailabilityPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["unavailability", isAdmin, user?.id],
    queryFn: async () => {
      let query = supabase.from("unavailability").select("*");
      if (!isAdmin) {
        query = query.eq("staff_id", user!.id);
      }
      const { data, error } = await query.order("start_date", { ascending: false });
      if (error) throw error;

      if (isAdmin) {
        const staffIds = [...new Set(data.map((r) => r.staff_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds);
        const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
        return data.map((r) => ({ ...r, staffName: nameMap[r.staff_id] || "Unknown" }));
      }
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("unavailability").insert({
        staff_id: user!.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unavailability"] });
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      toast.success("Request submitted");
    },
    onError: () => toast.error("Failed to submit request"),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("unavailability")
        .update({ status, reviewed_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unavailability"] });
      toast.success("Request updated");
    },
    onError: () => toast.error("Failed to update request"),
  });

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {isAdmin ? "Leave Requests" : "My Unavailability"}
        </h1>
        {!isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Submit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Unavailability</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date</Label>
                    <Input id="start" type="date" required className="h-11" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date</Label>
                    <Input id="end" type="date" required className="h-11" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Brief reason..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[80px]" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No unavailability submitted yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
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
                    {req.reason && <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>}
                  </div>
                  <Badge variant="outline" className={statusColors[req.status]}>
                    {req.status}
                  </Badge>
                </div>
                {isAdmin && req.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-9 text-success border-success/30 hover:bg-success/10"
                      onClick={() => reviewMutation.mutate({ id: req.id, status: "approved" })}
                      disabled={reviewMutation.isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => reviewMutation.mutate({ id: req.id, status: "denied" })}
                      disabled={reviewMutation.isPending}>
                      Deny
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
