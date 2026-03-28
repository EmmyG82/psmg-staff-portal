import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, User, MoreVertical, Loader2, Copy, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

const StaffManagementPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("staff");

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.user_id)?.role || "staff",
      }));
    },
    enabled: isAdmin,
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: { email: string; full_name: string; phone: string; role: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-staff", {
        body: data,
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      setShowCredentials({ email, password: data.temp_password });
      resetForm();
      toast.success("Staff account created successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create staff account");
    },
  });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("staff");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) {
      toast.error("Name and email are required");
      return;
    }
    createStaffMutation.mutate({ email: email.trim(), full_name: fullName.trim(), phone: phone.trim(), role });
  };

  const handleCopy = () => {
    if (!showCredentials) return;
    navigator.clipboard.writeText(
      `Email: ${showCredentials.email}\nTemporary Password: ${showCredentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowCredentials(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <UserPlus className="h-4 w-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            {showCredentials ? (
              <>
                <DialogHeader>
                  <DialogTitle>Account Created ✓</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Share these credentials with the staff member. They should change their password after first login.
                  </p>
                  <div className="bg-muted rounded-lg p-3 space-y-1 text-sm font-mono">
                    <p><span className="text-muted-foreground">Email:</span> {showCredentials.email}</p>
                    <p><span className="text-muted-foreground">Password:</span> {showCredentials.password}</p>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy Credentials"}
                  </Button>
                  <Button className="w-full" onClick={() => { setOpen(false); setShowCredentials(null); }}>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Add New Staff Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0400 000 000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createStaffMutation.isPending}>
                    {createStaffMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Account
                  </Button>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {staffList.map((staff) => (
            <Card key={staff.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  staff.role === "admin"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}>
                  {(staff.full_name || staff.email || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{staff.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{staff.email}</p>
                </div>
                <Badge variant="outline" className={`gap-1 text-[10px] ${
                  staff.role === "admin"
                    ? "bg-primary/5 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {staff.role === "admin" ? <Shield className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                  {staff.role}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;
