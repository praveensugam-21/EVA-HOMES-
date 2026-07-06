import { useState } from "react";
import { FaHome, FaUser, FaBars, FaTimes } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { label: "Buy", href: "/listings?listing_type=buy" },
    { label: "Rent", href: "/listings?listing_type=rent" },
    { label: "Commercial", href: "/listings?listing_type=commercial" },
    { label: "All Properties", href: "/listings" },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <FaHome className="text-zinc-900 text-2xl" />
          <span className="text-xl font-bold tracking-tight text-zinc-900">
            EVA <span className="font-light text-zinc-500">HOMES</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-zinc-600">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="hover:text-zinc-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link to="/listings/create" className="text-xs font-semibold text-zinc-900 border border-zinc-900 px-3.5 py-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition">
                + List Property
              </Link>
              <div className="flex items-center gap-2 text-zinc-700 text-sm">
                <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200">
                  <FaUser className="text-zinc-600 text-xs" />
                </div>
                <span className="font-medium">{user?.full_name?.split(" ")[0]}</span>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="text-xs font-medium text-zinc-650 hover:text-zinc-900 border border-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-50 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/listings/create" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 py-2 transition-colors">
                List Property
              </Link>
              <Link to="/login" id="login-nav-btn" className="text-sm font-medium text-zinc-650 hover:text-zinc-900 transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/listings" className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                Browse Properties
              </Link>
            </>
          )}
        </div>

        <button
          className="lg:hidden text-zinc-700 text-xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-zinc-100 px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="block text-sm font-medium text-zinc-600 hover:text-zinc-900"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-zinc-100">
            {isLoggedIn ? (
              <div className="space-y-2">
                <Link
                  to="/listings/create"
                  className="block text-center border border-zinc-900 text-zinc-900 py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  + List Property
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full bg-zinc-950 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/listings/create"
                  className="block text-center border border-zinc-200 text-zinc-700 py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  List Property
                </Link>
                <Link
                  to="/login"
                  className="block text-center border border-zinc-200 text-zinc-700 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block text-center bg-zinc-900 text-white py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}