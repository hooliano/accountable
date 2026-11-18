import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();
  return (
    <section className="auth-card">
      <h2>{user.username}</h2>
      <p>{user.email}</p>
      <p>Role: {user.role === "ADMIN" ? "Administrator" : "Member"}</p>
      <p>Member since {new Date(user.createdAt).toLocaleDateString()}</p>
    </section>
  );
}