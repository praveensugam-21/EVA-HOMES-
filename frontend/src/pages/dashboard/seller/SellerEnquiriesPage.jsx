import { useEffect, useState } from "react";
import { FaClipboardList, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { enquiriesAPI, getErrorMessage } from "../../../api/api";

export default function SellerEnquiriesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await enquiriesAPI.received();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load enquiries."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleStatusChange = async (id, status) => {
    setActiveId(id);
    try {
      const updated = await enquiriesAPI.update(id, { status });
      setItems((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update enquiry."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="seller" title="Enquiries" subtitle="Buyer enquiries received on your listings">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-zinc-400"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
          <FaClipboardList className="mx-auto text-3xl text-zinc-300 mb-3" />
          No enquiries received yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">{item.property_title || "General enquiry"}</p>
                  <p className="text-xs text-zinc-500 mt-1">From {item.name} ({item.email}{item.phone ? `, ${item.phone}` : ""})</p>
                  <p className="text-sm text-zinc-700 mt-2">{item.message}</p>
                  <p className="text-xs text-zinc-400 mt-2">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex gap-2 mt-4">
                {["new", "contacted", "closed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={activeId === item.id || item.status === s}
                    onClick={() => handleStatusChange(item.id, s)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:border-zinc-400 disabled:opacity-40 capitalize"
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
