import { useEffect, useState } from "react";
import { FaCheck, FaMoneyBillWave, FaSpinner, FaTimes } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { offersAPI, getErrorMessage } from "../../../api/api";

export default function SellerOffersPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await offersAPI.received();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load offers."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const respond = async (id, status) => {
    setActiveId(id);
    try {
      const updated = await offersAPI.updateStatus(id, status);
      setItems((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update offer."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="seller" title="Offers" subtitle="Price offers received on your properties">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaMoneyBillWave className="mx-auto text-3xl text-faint mb-3" />
          No offers received yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((offer) => (
            <article key={offer.id} className="bg-white border-2 border-ink rounded-xl p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{offer.property_title}</p>
                <p className="text-xs text-muted mt-1">From {offer.buyer_name}</p>
                <p className="text-sm font-bold text-ink mt-1">Offer: {offer.amount}</p>
                {offer.message && <p className="text-sm text-muted mt-1">{offer.message}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={offer.status} />
                {offer.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={activeId === offer.id}
                      onClick={() => respond(offer.id, "accepted")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                    >
                      <FaCheck className="text-[10px]" /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={activeId === offer.id}
                      onClick={() => respond(offer.id, "rejected")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <FaTimes className="text-[10px]" /> Reject
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
