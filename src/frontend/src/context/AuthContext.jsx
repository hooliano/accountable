import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, ask the backend whether the cookie is still valid
  useEffect(() => {
    axios.get("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await axios.post("/api/auth/login", { email, password });
    setUser(res.data.user);
  }

  async function register(form) {
    const res = await axios.post("/api/auth/register", form);
    setUser(res.data.user);
  }

  async function logout() {
    await axios.post("/api/auth/logout");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}