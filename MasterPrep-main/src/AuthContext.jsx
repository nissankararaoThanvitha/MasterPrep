import { useEffect, useState } from "react";
import { apiFetch, getToken, setToken, clearToken } from "./api";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only wait on /auth/me if there is a saved token to check
  const [loading, setLoading] = useState(() => !!getToken());

  /* 🔐 Restore session from a saved token */
  useEffect(() => {
    if (!getToken()) return;

    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => clearToken()) // expired or invalid token
      .finally(() => setLoading(false));
  }, []);

  const saveSession = (data) => {
    setToken(data.access_token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    saveSession(
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    );
  };

  const register = async (name, email, password) => {
    saveSession(
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      })
    );
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
