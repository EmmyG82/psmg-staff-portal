import { useAuth, MOCK_USERS } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, User, MoreVertical } from "lucide-react";

const StaffManagementPage = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
        <Button size="sm" className="gap-1">
          <UserPlus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      <div className="space-y-2">
        {MOCK_USERS.map((staff) => (
          <Card key={staff.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                staff.role === "admin"
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary/10 text-secondary"
              }`}>
                {staff.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{staff.name}</p>
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
    </div>
  );
};

export default StaffManagementPage;
