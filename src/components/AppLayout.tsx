import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "./AppHeader";
import MobileNav from "./MobileNav";

const AppLayout = () => {
  const { user } = useAuth();

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
