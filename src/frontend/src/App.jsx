import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Project from "./pages/Project.jsx";
import { api, errorMessage } from "./api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (active) {
          setUser(data.user);
        }
      })
      .catch((err) => {
        if (active && err.response?.status !== 401) {
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    try {
      await api.post("/auth/logout");
      setUser(null);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <Navbar user={user} onLogout={logout} />
      <main className="page">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Loading your account…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Register key="register" onAuth={setUser} />
                )
              }
            />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Register key="login" login onAuth={setUser} />
                )
              }
            />
            <Route
              path="/projects/:projectId"
              element={user ? <Project /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </>
  );
}
