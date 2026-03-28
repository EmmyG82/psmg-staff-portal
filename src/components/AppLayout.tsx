import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "./AppHeader";
import MobileNav from "./MobileNav";
import { Loader2 } from "lucide-react";

const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
