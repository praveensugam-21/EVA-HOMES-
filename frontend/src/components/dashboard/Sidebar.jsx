import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBoxOpen,
  FaChartBar,
  FaCog,
  FaFileAlt,
  FaHeart,
  FaHome,
  FaLock,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaUser,
  FaCalendarCheck,
  FaClipboardList,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const BUYER_LINKS = [
  { label: "Dashboard", to: "/dashboard/buyer", icon: FaHome, end: true },
  { label: "Search Properties", to: "/listings", icon: FaSearch },
  { label: "Saved Properties", to: "/dashboard/buyer/saved", icon: FaHeart },
  { label: "My Enquiries", to: "/dashboard/buyer/enquiries", icon: FaClipboardList },
  { label: "My Visits", to: "/dashboard/buyer/visits", icon: FaCalendarCheck },
  { label: "My Offers", to: "/dashboard/buyer/offers", icon: FaMoneyBillWave },
  { label: "My Unlocks", to: "/dashboard/buyer/unlocks", icon: FaLock },
];

const SELLER_LINKS = [
  { label: "Dashboard", to: "/dashboard/seller", icon: FaHome, end: true },
  { label: "My Listings", to: "/dashboard/seller/listings", icon: FaBoxOpen },
  { label: "Add Property", to: "/listings/create", icon: FaPlus },
  { label: "Listing Analytics", to: "/dashboard/seller/analytics", icon: FaChartBar },
  { label: "Enquiries", to: "/dashboard/seller/enquiries", icon: FaClipboardList },
  { label: "Offers", to: "/dashboard/seller/offers", icon: FaMoneyBillWave },
  { label: "Documents", to: "/dashboard/seller/documents", icon: FaFileAlt },
  { label: "Verification", to: "/dashboard/seller/verification", icon: FaShieldAlt },
];

const SHARED_LINKS = [
  { label: "Notifications", to: "/dashboard/notifications", icon: FaBell },
  { label: "Profile", to: "/dashboard/profile", icon: FaUser },
  { label: "Settings", to: "/dashboard/settings", icon: FaCog },
];

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
          isActive
            ? "bg-ink text-white"
            : "text-ink-soft hover:bg-surface hover:text-ink"
        }`
      }
    >
      <Icon className="text-sm shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ mode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasSellerProfile = !!user?.has_seller_profile;

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-line min-h-[calc(100vh-64px)] px-4 py-6 space-y-6">
      <div className="grid grid-cols-2 gap-2 bg-surface rounded-lg p-1">
        <button
          type="button"
          onClick={() => navigate("/dashboard/buyer")}
          className={`py-2 rounded-md text-xs font-semibold transition ${
            mode === "buyer" ? "bg-white shadow-sm text-ink" : "text-muted hover:text-ink"
          }`}
        >
          Buyer
        </button>
        <button
          type="button"
          onClick={() => navigate(hasSellerProfile ? "/dashboard/seller" : "/dashboard/profile")}
          className={`py-2 rounded-md text-xs font-semibold transition ${
            mode === "seller" ? "bg-white shadow-sm text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {hasSellerProfile ? "Seller" : "Become Seller"}
        </button>
      </div>

      <nav className="space-y-1">
        {(mode === "seller" ? SELLER_LINKS : BUYER_LINKS).map((link) => (
          <NavItem key={link.to} {...link} />
        ))}
      </nav>

      <div className="pt-4 border-t border-line space-y-1">
        {SHARED_LINKS.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}
      </div>
    </aside>
  );
}
