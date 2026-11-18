import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api.js";

export default function Register({ login = false, onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post(
        `/auth/${login ? "login" : "register"}`,
        form,
      );
      onAuth(data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <h1>{login ? "Welcome back" : "Create an account"}</h1>
      <form onSubmit={handleSubmit}>
        {!login && (
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={login ? "current-password" : "new-password"}
            minLength={login ? undefined : 8}
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        {!login && <small>Use at least 8 characters.</small>}
        <button disabled={loading}>
          {loading ? "Please wait…" : login ? "Log in" : "Register"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="auth-switch">
        {login ? "New here? " : "Already have an account? "}
        <Link to={login ? "/register" : "/login"}>
          {login ? "Register" : "Log in"}
        </Link>
      </p>
    </section>
  );
}
