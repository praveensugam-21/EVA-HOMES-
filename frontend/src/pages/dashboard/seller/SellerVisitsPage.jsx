import { useEffect, useState } from "react";
import { FaCalendarCheck, FaCheck, FaSpinner, FaTimes } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { visitsAPI, getErrorMessage } from "../../../api/api";

export default function SellerVisitsPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await visitsAPI.received();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load visit requests."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const respond = async (id, status) => {
    setActiveId(id);
    try {
      const updated = await visitsAPI.updateStatus(id, status);
      setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update visit."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="seller" title="Visit Requests" subtitle="Buyers who requested to view your properties">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-zinc-400"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
          <FaCalendarCheck className="mx-auto text-3xl text-zinc-300 mb-3" />
          No visit requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((visit) => (
            <article key={visit.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900">{visit.property_title}</p>
                <p className="text-xs text-zinc-500 mt-1">Requested by {visit.buyer_name}</p>
                <p className="text-sm text-zinc-600 mt-1">For: {new Date(visit.requested_date).toLocaleString()}</p>
                {visit.message && <p className="text-sm text-zinc-500 mt-1">{visit.message}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={visit.status} />
                {visit.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={activeId === visit.id}
                      onClick={() => respond(visit.id, "confirmed")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                    >
                      <FaCheck className="text-[10px]" /> Confirm
                    </button>
                    <button
                      type="button"
                      disabled={activeId === visit.id}
                      onClick={() => respond(visit.id, "rejected")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <FaTimes className="text-[10px]" /> Decline
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
