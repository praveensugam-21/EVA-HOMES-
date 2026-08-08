import { useEffect, useState } from "react";
import { FaCheckCircle, FaFileAlt, FaSpinner, FaTimesCircle, FaUserShield } from "react-icons/fa";
import { Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { authAPI, getErrorMessage } from "../api/api";
import { useAuth } from "../context/AuthContext";

const SELLER_STATUS_STYLES = {
  unverified: "bg-line text-ink-soft",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const DOC_LABELS = {
  id_proof: "Government ID Proof",
  address_proof: "Address Proof",
  electricity_bill: "Electricity Bill",
  business_license: "Business License",
};

export default function AdminSellerVerificationsPage() {
  const { isLoggedIn, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [docsByUser, setDocsByUser] = useState({});
  const [docsLoading, setDocsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await authAPI.listSellers({ status: statusFilter || undefined });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load sellers."));
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

  const handleToggleDocuments = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (!docsByUser[userId]) {
      setDocsLoading(true);
      try {
        const docs = await authAPI.getSellerDocuments(userId);
        setDocsByUser((prev) => ({ ...prev, [userId]: docs }));
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load documents."));
      } finally {
        setDocsLoading(false);
      }
    }
  };

  const handleReview = async (userId, sellerStatus) => {
    setActiveId(userId);
    setError("");
    try {
      await authAPI.updateSellerVerification(userId, sellerStatus);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update verification status."));
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
            <h1 className="text-3xl font-bold tracking-tight text-ink mt-1">Seller Verifications</h1>
            <p className="text-sm text-muted mt-2">
              Review uploaded documents, then verify or reject — this is separate from listing approval.
            </p>
          </div>

          <div className="bg-white border-2 border-ink rounded-xl p-5">
            <div className="flex gap-2">
              {["pending", "verified", "rejected", "unverified", ""].map((s) => (
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
          ) : data.items.length === 0 ? (
            <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
              <FaUserShield className="mx-auto text-3xl text-faint mb-3" />
              No {statusFilter || ""} sellers.
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((item) => {
                const sellerStatus = item.seller_profile?.seller_status || "unverified";
                const canReview = sellerStatus === "pending" || sellerStatus === "unverified";
                return (
                  <article key={item.id} className="bg-white border-2 border-ink rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="font-semibold text-ink">{item.full_name}</h2>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${SELLER_STATUS_STYLES[sellerStatus]}`}>
                            {sellerStatus}
                          </span>
                        </div>
                        <p className="text-sm text-muted">
                          {item.email} · {item.phone || "No phone"}
                        </p>
                        <p className="text-xs text-faint mt-1">
                          Business: {item.seller_profile?.business_name || "Not set"}
                          {" · "}
                          Seller since {new Date(item.seller_profile?.created_at).toLocaleDateString()}
                        </p>

                        <button
                          type="button"
                          onClick={() => handleToggleDocuments(item.id)}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft hover:text-ink underline mt-3"
                        >
                          <FaFileAlt className="text-[10px]" />
                          {expandedUserId === item.id ? "Hide Documents" : "View Documents"}
                        </button>

                        {expandedUserId === item.id && (
                          <div className="mt-3 border border-line-soft rounded-lg p-3 space-y-2 max-w-md">
                            {docsLoading && !docsByUser[item.id] ? (
                              <FaSpinner className="animate-spin text-faint" />
                            ) : (docsByUser[item.id] || []).length === 0 ? (
                              <p className="text-xs text-faint">No documents uploaded yet.</p>
                            ) : (
                              (docsByUser[item.id] || []).map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between text-xs">
                                  <span className="text-ink-soft font-medium">{DOC_LABELS[doc.doc_type] || doc.doc_type}</span>
                                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-muted hover:text-ink underline">
                                    View file
                                  </a>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {canReview ? (
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
                        <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${SELLER_STATUS_STYLES[sellerStatus]}`}>
                          {sellerStatus}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
