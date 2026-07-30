import { useEffect, useState } from "react";
import { FaCheckCircle, FaLock, FaSpinner, FaTimesCircle } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { unlocksAPI, getErrorMessage } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function AdminPaymentVerificationsPage() {
  const { isLoggedIn, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dashboard, setDashboard] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await unlocksAPI.list({ status: statusFilter || undefined });
      setDashboard(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load unlock requests."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isLoggedIn, user]);

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/" replace />;

  const handleReview = async (id, status) => {
    setActiveId(id);
    setError("");
    try {
      await unlocksAPI.review(id, status);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update this request."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-faint font-semibold">Admin Workspace</p>
            <h1 className="text-3xl font-bold tracking-tight text-ink mt-1">Payment Verifications</h1>
            <p className="text-sm text-muted mt-2">
              Check your UPI app against each reference below, then verify or reject — this unlocks the exact
              location and owner's phone for that buyer on that listing only.
            </p>
          </div>

          <div className="bg-white border-2 border-ink rounded-xl p-5">
            <div className="flex gap-2">
              {["pending", "verified", "rejected", ""].map((s) => (
                <button
                  key={s || "all"}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                    statusFilter === s ? "bg-ink text-white" : "border border-line text-ink-soft hover:border-ink"
                  }`}
                >
                  {s || "All"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {isLoading ? (
            <div className="min-h-72 flex items-center justify-center text-muted">
              <FaSpinner className="animate-spin text-2xl" />
            </div>
          ) : dashboard.items.length === 0 ? (
            <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
              <FaLock className="mx-auto text-3xl text-faint mb-3" />
              No {statusFilter || ""} unlock requests.
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.items.map((item) => (
                <article key={item.id} className="bg-white border-2 border-ink rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {item.property_thumbnail_url && (
                        <img src={item.property_thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <Link to={`/properties/${item.property_id}`} className="font-semibold text-ink hover:underline">
                          {item.property_title || "Property"}
                        </Link>
                        <p className="text-sm text-muted mt-1">
                          {item.buyer_name} · {item.buyer_email}
                          {item.buyer_phone && ` · ${item.buyer_phone}`}
                        </p>
                        <p className="text-xs text-faint mt-1">
                          {item.payment_reference ? `Reference: ${item.payment_reference}` : "No reference provided"}
                          {" · "}
                          {new Date(item.requested_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {item.status === "pending" ? (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleReview(item.id, "verified")}
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-60"
                        >
                          <FaCheckCircle className="text-xs" /> Verify
                        </button>
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleReview(item.id, "rejected")}
                          className="inline-flex items-center gap-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-60"
                        >
                          <FaTimesCircle className="text-xs" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          item.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
