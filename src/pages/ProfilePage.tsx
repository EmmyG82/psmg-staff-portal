import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Phone, Mail, Lock } from "lucide-react";

const ProfilePage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState(false);

  // Load profile data once
  if (!loadedProfile && user) {
    setLoadedProfile(true);
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setPhone(data.phone || "");
        }
      });
  }

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Confirmation email sent", description: "Check your inbox to confirm the new email address." });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-6 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Account</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={handleUpdateProfile} disabled={savingProfile} className="w-full">
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" /> Change Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">A confirmation link will be sent to your new email.</p>
          <Button onClick={handleUpdateEmail} disabled={savingEmail || email === user?.email} className="w-full">
            {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} Update Email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword} className="w-full">
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />} Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
