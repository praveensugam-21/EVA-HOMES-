import { useEffect, useState } from "react";
import { FaBoxOpen, FaChartBar, FaClipboardList, FaMoneyBillWave } from "react-icons/fa";
import { Link } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { propertiesAPI, getErrorMessage } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";

function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Link to={to} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:border-zinc-400 transition block">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Icon className="text-zinc-600 text-sm" />
        </div>
        <span className="text-sm font-medium text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-950">{value}</p>
    </Link>
  );
}

export default function SellerDashboardHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await propertiesAPI.getMyAnalytics();
        setSummary(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load dashboard stats."));
      }
    })();
  }, []);

  const status = user?.seller_profile?.seller_status || "unverified";

  return (
    <DashboardLayout mode="seller" title={`Welcome, ${user?.full_name?.split(" ")[0] || "there"}`} subtitle="Your seller dashboard">
      {status !== "verified" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Your seller profile is <strong>{status}</strong>. Verified sellers get a trust badge on their listings —{" "}
          <Link to="/dashboard/seller/verification" className="underline font-semibold">upload verification documents</Link>.
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FaBoxOpen} label="My Listings" value={summary ? summary.total_listings : "—"} to="/dashboard/seller/listings" />
        <StatCard icon={FaChartBar} label="Total Views" value={summary ? summary.total_views : "—"} to="/dashboard/seller/analytics" />
        <StatCard icon={FaClipboardList} label="Enquiries Received" value={summary ? summary.total_enquiries : "—"} to="/dashboard/seller/enquiries" />
        <StatCard icon={FaMoneyBillWave} label="Offers Received" value={summary ? summary.total_offers : "—"} to="/dashboard/seller/offers" />
      </div>
    </DashboardLayout>
  );
}
