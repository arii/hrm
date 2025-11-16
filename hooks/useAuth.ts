// File: hooks/useAuth.ts
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { getSession } from "next-auth/react";

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  encryptedRefreshToken?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (session) {
        setUser(session.user as User);
      }
      setLoading(false);
    };

    fetchSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
