import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCalendarCheck, FaClipboardList, FaHandshake, FaHeart, FaMoneyBillWave } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { savedPropertiesAPI, enquiriesAPI, visitsAPI, offersAPI } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";

function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Link to={to} className="bg-white border-2 border-ink rounded-xl p-5 hover:border-ink transition block">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center">
          <Icon className="text-ink-soft text-sm" />
        </div>
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
    </Link>
  );
}

export default function BuyerDashboardHome() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ saved: 0, enquiries: 0, visits: 0, offers: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [saved, enquiries, visits, offers] = await Promise.all([
          savedPropertiesAPI.list(),
          enquiriesAPI.mine(),
          visitsAPI.mine(),
          offersAPI.mine(),
        ]);
        setCounts({
          saved: saved.total,
          enquiries: enquiries.total,
          visits: visits.total,
          offers: offers.total,
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout mode="buyer" title={`Welcome, ${user?.full_name?.split(" ")[0] || "there"}`} subtitle="Your buyer dashboard">
      {!user?.has_seller_profile && (
        <div className="bg-white border-2 border-ink rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FaHandshake className="text-faint text-2xl" />
            <div>
              <p className="font-semibold text-ink">Want to list properties too?</p>
              <p className="text-sm text-muted">Activate a seller profile on this same account — no new registration needed.</p>
            </div>
          </div>
          <Link to="/dashboard/profile" className="bg-ink hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition whitespace-nowrap">
            Become a Seller
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FaHeart} label="Saved Properties" value={isLoading ? "—" : counts.saved} to="/dashboard/buyer/saved" />
        <StatCard icon={FaClipboardList} label="My Enquiries" value={isLoading ? "—" : counts.enquiries} to="/dashboard/buyer/enquiries" />
        <StatCard icon={FaCalendarCheck} label="My Visits" value={isLoading ? "—" : counts.visits} to="/dashboard/buyer/visits" />
        <StatCard icon={FaMoneyBillWave} label="My Offers" value={isLoading ? "—" : counts.offers} to="/dashboard/buyer/offers" />
      </div>
    </DashboardLayout>
  );
}
