import { Link } from "react-router-dom";
import { FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";

const STATUS_META = {
  unverified: { label: "Unverified", color: "bg-line text-ink-soft", icon: FaClock },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: FaClock },
  verified: { label: "Verified Seller", color: "bg-emerald-100 text-emerald-700", icon: FaCheckCircle },
  rejected: { label: "Verification Rejected", color: "bg-red-100 text-red-700", icon: FaTimesCircle },
};

export default function SellerVerificationPage() {
  const { user } = useAuth();
  const status = user?.seller_profile?.seller_status || "unverified";
  const meta = STATUS_META[status] || STATUS_META.unverified;
  const Icon = meta.icon;

  return (
    <DashboardLayout mode="seller" title="Verification" subtitle="Your seller identity verification status">
      <div className="bg-white border-2 border-ink rounded-xl p-8 text-center">
        <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${meta.color}`}>
          <Icon className="text-2xl" />
        </div>
        <h2 className="text-lg font-bold text-ink mb-1">{meta.label}</h2>

        {status === "verified" && (
          <p className="text-sm text-muted max-w-md mx-auto">
            Your seller profile is verified. Buyers see a trust badge on your listings.
          </p>
        )}
        {status === "pending" && (
          <p className="text-sm text-muted max-w-md mx-auto">
            An admin is reviewing your submitted documents. This usually doesn't take long.
          </p>
        )}
        {status === "rejected" && (
          <p className="text-sm text-muted max-w-md mx-auto">
            Your last submission was rejected. Upload new documents to resubmit for review.
          </p>
        )}
        {status === "unverified" && (
          <p className="text-sm text-muted max-w-md mx-auto">
            Upload verification documents so an admin can review and approve your seller profile.
          </p>
        )}

        {status !== "verified" && (
          <Link
            to="/dashboard/seller/documents"
            className="inline-block mt-5 bg-ink hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            {status === "rejected" ? "Resubmit Documents" : "Upload Documents"}
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
}
