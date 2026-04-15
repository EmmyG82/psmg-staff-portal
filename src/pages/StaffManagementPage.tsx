import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, Shield, User, MoreVertical, Loader2, Copy, Check, Pencil, UserX, UserCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

type StaffMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  active: boolean;
  role: string;
};

const StaffManagementPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Create form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("staff");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<string>("staff");

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
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (res.error) throw new Error(res.data?.error || res.error.message);
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

  const updateStaffMutation = useMutation({
    mutationFn: async (data: { user_id: string; full_name?: string; phone?: string; role?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-staff", {
        body: { action: "update", ...data },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (res.error) throw new Error(res.data?.error || res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      setEditOpen(false);
      setEditingStaff(null);
      toast.success("Staff member updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update staff");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ user_id, active }: { user_id: string; active: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-staff", {
        body: { action: "toggle_active", user_id, active },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (res.error) throw new Error(res.data?.error || res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      toast.success(vars.active ? "Staff member activated" : "Staff member deactivated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update status");
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

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.full_name || "");
    setEditPhone(staff.phone || "");
    setEditRole(staff.role);
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editName.trim()) {
      toast.error("Name is required");
      return;
    }
    updateStaffMutation.mutate({
      user_id: editingStaff.user_id,
      full_name: editName.trim(),
      phone: editPhone.trim(),
      role: editRole,
    });
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

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingStaff(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Full Name *</Label>
              <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingStaff?.email || ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input id="editPhone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="0400 000 000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updateStaffMutation.isPending}>
              {updateStaffMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {staffList.map((staff) => (
            <Card key={staff.id} className={!staff.active ? "opacity-50" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  staff.role === "admin"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}>
                  {(staff.full_name || staff.email || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{staff.full_name || "Unnamed"}</p>
                    {!staff.active && (
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                        Inactive
                      </Badge>
                    )}
                  </div>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(staff)} className="gap-2">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleActiveMutation.mutate({ user_id: staff.user_id, active: !staff.active })}
                      className={`gap-2 ${staff.active ? "text-destructive" : ""}`}
                    >
                      {staff.active ? (
                        <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                      ) : (
                        <><UserCheck className="h-3.5 w-3.5" /> Activate</>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;
