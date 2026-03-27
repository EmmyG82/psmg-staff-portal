import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "staff";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: MockUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
}

const MOCK_USERS: MockUser[] = [
  { id: "1", name: "Corey Mitchell", email: "corey@parkside.com", role: "admin" },
  { id: "2", name: "Sarah Admin", email: "sarah@parkside.com", role: "admin" },
  { id: "3", name: "Maria Lopez", email: "maria@parkside.com", role: "staff" },
  { id: "4", name: "James Chen", email: "james@parkside.com", role: "staff" },
  { id: "5", name: "Priya Sharma", email: "priya@parkside.com", role: "staff" },
];

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);

  const login = (email: string, _password: string) => {
    const found = MOCK_USERS.find((u) => u.email === email);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export { MOCK_USERS };
