import { useEffect, useState } from "react";
import { FaHome, FaUser, FaBars, FaTimes, FaBell } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI, notificationsAPI, unlocksAPI } from "../api/api";

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingUnlockCount, setPendingUnlockCount] = useState(0);
  const [pendingSellerCount, setPendingSellerCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (!user?.is_admin) return;
    unlocksAPI.list({ status: "pending" })
      .then((data) => setPendingUnlockCount(data.pending_count ?? 0))
      .catch(() => {});
    authAPI.listSellers({ status: "pending" })
      .then((data) => setPendingSellerCount(data.total ?? 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!isLoggedIn) return;
    notificationsAPI.list()
      .then((data) => setUnreadNotifCount(data.unread_count ?? 0))
      .catch(() => {});
  }, [isLoggedIn]);

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
    <header className="fixed top-0 left-0 w-full z-50 bg-steel/95 backdrop-blur-md border-b border-steel-dark shadow-[0_2px_16px_-4px_rgba(44,68,87,0.35)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center">
            <FaHome className="text-steel-dark text-sm" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            EVA <span className="font-normal text-white/75">Homes</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-white">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="hover:text-accent-bright transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              {user?.is_admin && (
                <>
                  <Link to="/admin/users" className="text-xs font-semibold text-white hover:text-accent-bright transition">
                    Users
                  </Link>
                  <Link to="/admin/seller-verifications" className="relative text-xs font-semibold text-white hover:text-accent-bright transition">
                    Sellers
                    {pendingSellerCount > 0 && (
                      <span className="absolute -top-2 -right-3.5 bg-red-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                        {pendingSellerCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/admin/listings" className="text-xs font-semibold text-white hover:text-accent-bright transition">
                    Listings
                  </Link>
                  <Link to="/admin/enquiries" className="text-xs font-semibold text-white hover:text-accent-bright transition">
                    Enquiries
                  </Link>
                  <Link to="/admin/payment-verifications" className="relative text-xs font-semibold text-white hover:text-accent-bright transition">
                    Payments
                    {pendingUnlockCount > 0 && (
                      <span className="absolute -top-2 -right-3.5 bg-red-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                        {pendingUnlockCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/admin/settings/broker-contact" className="text-xs font-semibold text-white hover:text-accent-bright transition">
                    Agent Settings
                  </Link>
                </>
              )}
              {user?.has_seller_profile && (
                <Link to="/listings/create" className="text-xs font-semibold text-white border border-white/60 px-3.5 py-1.5 rounded-lg hover:bg-accent-bright hover:text-steel-dark hover:border-accent-bright transition">
                  + List Property
                </Link>
              )}
              <Link to="/dashboard/buyer" className="text-xs font-semibold text-white hover:text-accent-bright transition">
                Dashboard
              </Link>
              <Link to="/dashboard/notifications" className="relative text-white hover:text-accent-bright transition" aria-label="Notifications">
                <FaBell className="text-base" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-red-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </Link>
              <Link to="/dashboard/profile" className="flex items-center gap-2 text-white text-sm hover:text-accent-bright transition">
                <div className="w-8 h-8 bg-steel-light/40 rounded-full flex items-center justify-center border border-white/40">
                  <FaUser className="text-cream text-xs" />
                </div>
                <span className="font-medium">{user?.full_name?.split(" ")[0]}</span>
              </Link>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="text-xs font-medium text-white hover:text-accent-bright border border-white/40 px-4 py-2 rounded-lg hover:bg-steel-light/30 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/listings/create" className="text-sm font-medium text-white hover:text-accent-bright px-3 py-2 transition-colors">
                List Property
              </Link>
              <Link to="/login" id="login-nav-btn" className="text-sm font-medium text-white hover:text-accent-bright transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/listings" className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                Browse Properties
              </Link>
            </>
          )}
        </div>

        <button
          className="lg:hidden text-white text-xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-line-soft px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="block text-sm font-medium text-ink-soft hover:text-accent"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-line-soft">
            {isLoggedIn ? (
              <div className="space-y-2">
                {user?.is_admin && (
                  <>
                    <Link
                      to="/admin/users"
                      className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Users
                    </Link>
                    <Link
                      to="/admin/seller-verifications"
                      className="relative block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sellers
                      {pendingSellerCount > 0 && (
                        <span className="absolute top-1 right-3 bg-red-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                          {pendingSellerCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/admin/listings"
                      className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Listings
                    </Link>
                    <Link
                      to="/admin/enquiries"
                      className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Enquiries
                    </Link>
                    <Link
                      to="/admin/payment-verifications"
                      className="relative block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Payments
                      {pendingUnlockCount > 0 && (
                        <span className="absolute top-1 right-3 bg-red-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                          {pendingUnlockCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/admin/settings/broker-contact"
                      className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Agent Settings
                    </Link>
                  </>
                )}
                {user?.has_seller_profile && (
                  <Link
                    to="/listings/create"
                    className="block text-center border border-accent text-accent py-2.5 rounded-lg text-sm font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    + List Property
                  </Link>
                )}
                <Link
                  to="/dashboard/buyer"
                  className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/notifications"
                  className="relative block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Notifications
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1 right-3 bg-red-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                      {unreadNotifCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/dashboard/profile"
                  className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full bg-ink text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/listings/create"
                  className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  List Property
                </Link>
                <Link
                  to="/login"
                  className="block text-center border border-line text-ink-soft py-2.5 rounded-lg text-sm font-medium hover:bg-surface"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block text-center bg-accent text-white py-2.5 rounded-lg text-sm font-medium"
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
