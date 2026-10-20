import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">Accountable</Link>
      <Link to="/register" className="nav-button">Register / Login</Link>
    </nav>
  );
}