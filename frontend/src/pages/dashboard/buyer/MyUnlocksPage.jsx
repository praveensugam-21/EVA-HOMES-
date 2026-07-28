import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaLock, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { unlocksAPI, getErrorMessage } from "../../../api/api";

export default function MyUnlocksPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    unlocksAPI.mine()
      .then((data) => setItems(data.items))
      .catch((err) => setError(getErrorMessage(err, "Failed to load your unlock requests.")))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <DashboardLayout
      mode="buyer"
      title="My Unlocks"
      subtitle="Exact-location + owner-phone unlock requests you've submitted"
    >
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaLock className="mx-auto text-3xl text-faint mb-3" />
          No unlock requests yet. Open a property and tap "I've Paid" to request one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="bg-white border-2 border-ink rounded-xl p-5 flex items-center gap-4">
              {item.property_thumbnail_url && (
                <img src={item.property_thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/properties/${item.property_id}`} className="font-semibold text-ink hover:underline">
                    {item.property_title || "Property"}
                  </Link>
                  <StatusBadge status={item.status} />
                </div>
                {item.payment_reference && (
                  <p className="text-xs text-muted mt-1">Reference: {item.payment_reference}</p>
                )}
                <p className="text-xs text-faint mt-1">
                  Requested {new Date(item.requested_at).toLocaleString()}
                  {item.reviewed_at && ` · Reviewed ${new Date(item.reviewed_at).toLocaleString()}`}
                </p>
                {item.status === "verified" && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    Unlocked — exact location and owner's number are visible on this listing.
                  </p>
                )}
                {item.status === "rejected" && (
                  <p className="text-xs text-red-600 mt-1">
                    Couldn't be verified — open the listing to try again.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
