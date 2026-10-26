import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">Accountable</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/profile" className="nav-link">{user.username}</Link>
            <button onClick={handleLogout} className="nav-button">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Log in</Link>
            <Link to="/register" className="nav-button">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}