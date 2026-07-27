import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaMoneyBillWave, FaSpinner, FaTimes } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { offersAPI, getErrorMessage } from "../../../api/api";

export default function MyOffersPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await offersAPI.mine();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load your offers."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleWithdraw = async (id) => {
    setActiveId(id);
    try {
      const updated = await offersAPI.updateStatus(id, "withdrawn");
      setItems((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to withdraw offer."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="buyer" title="My Offers" subtitle="Price offers you've made on properties">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-zinc-400"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
          <FaMoneyBillWave className="mx-auto text-3xl text-zinc-300 mb-3" />
          No offers made yet. Open a property page to make one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((offer) => (
            <article key={offer.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
              {offer.property_thumbnail_url && (
                <img src={offer.property_thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link to={`/properties/${offer.property_id}`} className="font-semibold text-zinc-900 hover:underline">
                  {offer.property_title}
                </Link>
                <p className="text-sm font-bold text-zinc-800 mt-1">Offer: {offer.amount}</p>
                {offer.message && <p className="text-sm text-zinc-500 mt-1">{offer.message}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={offer.status} />
                {offer.status === "pending" && (
                  <button
                    type="button"
                    disabled={activeId === offer.id}
                    onClick={() => handleWithdraw(offer.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FaTimes className="text-[10px]" /> Withdraw
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
