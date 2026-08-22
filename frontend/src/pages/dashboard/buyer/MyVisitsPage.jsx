import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCalendarCheck, FaSpinner, FaTimes } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { visitsAPI, getErrorMessage } from "../../../api/api";

export default function MyVisitsPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await visitsAPI.mine();
      setItems(data.items);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load your visits."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id) => {
    setActiveId(id);
    try {
      const updated = await visitsAPI.updateStatus(id, "cancelled");
      setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cancel visit."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="buyer" title="My Visits" subtitle="Property visit requests you've made">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaCalendarCheck className="mx-auto text-3xl text-faint mb-3" />
          No visit requests yet. Open a property page to request one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((visit) => (
            <article key={visit.id} className="bg-white border-2 border-ink rounded-xl p-5 flex items-center gap-4">
              {visit.property_thumbnail_url && (
                <img src={visit.property_thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link to={`/properties/${visit.property_id}`} className="font-semibold text-ink hover:underline">
                  {visit.property_title}
                </Link>
                <p className="text-sm text-ink-soft mt-1">Requested: {new Date(visit.requested_date).toLocaleString()}</p>
                {visit.message && <p className="text-sm text-muted mt-1">{visit.message}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={visit.status} />
                {visit.status === "pending" && (
                  <button
                    type="button"
                    disabled={activeId === visit.id}
                    onClick={() => handleCancel(visit.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FaTimes className="text-[10px]" /> Cancel
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
