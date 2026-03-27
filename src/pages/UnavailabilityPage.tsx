import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockUnavailability } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  denied: "bg-destructive/10 text-destructive border-destructive/20",
};

const UnavailabilityPage = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const requests = isAdmin
    ? mockUnavailability
    : mockUnavailability.filter((u) => u.staffId === user.id);

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
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setOpen(false); }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date</Label>
                    <Input id="start" type="date" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date</Label>
                    <Input id="end" type="date" required className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Brief reason..." required className="min-h-[80px]" />
                </div>
                <Button type="submit" className="w-full h-11">Submit Request</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {requests.length === 0 ? (
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
                    {isAdmin && (
                      <p className="text-sm font-semibold text-foreground">{req.staffName}</p>
                    )}
                    <p className="text-sm text-foreground">
                      {format(parseISO(req.startDate), "EEE d MMM")}
                      {req.startDate !== req.endDate && ` – ${format(parseISO(req.endDate), "EEE d MMM")}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>
                  </div>
                  <Badge variant="outline" className={statusColors[req.status]}>
                    {req.status}
                  </Badge>
                </div>
                {isAdmin && req.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-9 text-success border-success/30 hover:bg-success/10">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-9 text-destructive border-destructive/30 hover:bg-destructive/10">
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
