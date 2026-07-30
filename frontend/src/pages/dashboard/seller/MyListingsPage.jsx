import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBoxOpen, FaEye, FaPlus, FaSpinner, FaTrash } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { propertiesAPI, getErrorMessage } from "../../../api/api";

const STATUS_HINTS = {
  pending: "Awaiting admin approval — not visible to buyers yet.",
  active: "Live and visible to buyers.",
  rejected: "Rejected by admin. Edit and resubmit, or contact support.",
  inactive: "Hidden from buyers.",
  sold: "Marked as sold.",
  rented: "Marked as rented.",
};

export default function MyListingsPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await propertiesAPI.mine();
      setItems(data.items);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load your listings."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await propertiesAPI.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete listing."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout
      mode="seller"
      title="My Listings"
      subtitle="Every property you've posted, including its approval status"
      actions={
        <Link to="/listings/create" className="inline-flex items-center gap-2 bg-ink hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <FaPlus className="text-xs" /> Add Property
        </Link>
      }
    >
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaBoxOpen className="mx-auto text-3xl text-faint mb-3" />
          You haven't posted any listings yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="bg-white border-2 border-ink rounded-xl p-5 flex items-center gap-4">
              {item.thumbnail_url && (
                <img src={item.thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-ink">{item.title}</h2>
                  <StatusBadge status={item.status} />
                  {item.is_verified && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase">Verified</span>
                  )}
                  {item.is_featured && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase">Featured</span>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">{item.city}{item.locality ? `, ${item.locality}` : ""}</p>
                <p className="text-sm font-bold text-ink mt-1">{item.price_label || `₹${item.price.toLocaleString()}`}</p>
                {STATUS_HINTS[item.status] && (
                  <p className="text-xs text-faint mt-1">{STATUS_HINTS[item.status]}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {item.status === "active" && (
                  <Link to={`/properties/${item.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink">
                    <FaEye className="text-[10px]" /> View live
                  </Link>
                )}
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  <FaTrash className="text-[10px]" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
