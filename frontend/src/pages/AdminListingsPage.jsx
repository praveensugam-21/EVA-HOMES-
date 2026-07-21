import { useEffect, useState } from "react";
import {
  FaCheckCircle, FaSearch, FaSpinner, FaStar, FaStoreSlash,
  FaTrash, FaThumbsUp, FaThumbsDown, FaExclamationTriangle, FaTimes
} from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { propertiesAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";

const initialFilters = {
  status: "",
  verified: "",
  featured: "",
  search: "",
};

// ── Confirmation Modal ────────────────────────────────────────────────────────
function DeleteModal({ property, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition"
        >
          <FaTimes />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <FaExclamationTriangle className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Delete Listing</h2>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed mb-1">
          Are you sure you want to permanently delete:
        </p>
        <p className="text-sm font-semibold text-zinc-900 mb-4">"{property?.title}"</p>
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">
          This action cannot be undone. All images and enquiries linked to this property will also be removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-semibold py-2.5 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {isDeleting ? <><FaSpinner className="animate-spin" /> Deleting...</> : <><FaTrash className="text-xs" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:  "bg-amber-100 text-amber-800 border border-amber-200",
  active:   "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  inactive: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  sold:     "bg-blue-100 text-blue-800 border border-blue-200",
  rented:   "bg-purple-100 text-purple-800 border border-purple-200",
};

export default function AdminListingsPage() {
  const { isLoggedIn, user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // property object to delete
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) return;

    const loadProperties = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await propertiesAPI.listAdmin({
          status: filters.status || undefined,
          verified: filters.verified === "" ? undefined : filters.verified === "true",
          featured: filters.featured === "" ? undefined : filters.featured === "true",
          search: filters.search.trim() || undefined,
        });
        setData(response);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load properties.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProperties();
  }, [filters, isLoggedIn, user]);

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/" replace />;

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleModerationUpdate = async (propertyId, updates) => {
    setActiveId(propertyId);
    setError("");
    try {
      const updated = await propertiesAPI.update(propertyId, updates);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === propertyId
            ? { ...item, status: updated.status, is_verified: updated.is_verified, is_featured: updated.is_featured }
            : item
        ),
      }));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update property.");
    } finally {
      setActiveId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await propertiesAPI.delete(deleteTarget.id);
      setData((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== deleteTarget.id),
        total: prev.total - 1,
      }));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete property.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const pendingCount = data.items.filter((i) => i.status === "pending").length;

  const statusButtonClass = (active) =>
    `rounded-lg px-3 py-2 text-xs font-semibold transition ${
      active ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-700 hover:border-zinc-400"
    }`;

  return (
    <div className="min-h-screen bg-zinc-50">
      {deleteTarget && (
        <DeleteModal
          property={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      <Navbar />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">Admin Workspace</p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">Listings Moderation</h1>
              <p className="text-sm text-zinc-500 mt-2">
                Approve, reject, or moderate property listings before they go live.
              </p>
            </div>
            <div className="flex gap-3">
              {pendingCount > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-800 mt-2">{pendingCount}</p>
                </div>
              )}
              <div className="rounded-xl bg-white border border-zinc-200 px-5 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Listings</p>
                <p className="text-2xl font-bold text-zinc-950 mt-2">{data.total}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
            <div className="grid lg:grid-cols-[1fr_180px_180px_180px] gap-4">
              <label className="block">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1.5">
                  <FaSearch className="text-[10px]" />Search
                </span>
                <input
                  type="text" name="search" value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Property title, city, locality..."
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Status</span>
                <select name="status" value={filters.status} onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">All statuses</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="active">✅ Active</option>
                  <option value="rejected">❌ Rejected</option>
                  <option value="inactive">Inactive</option>
                  <option value="sold">Sold</option>
                  <option value="rented">Rented</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Verified</span>
                <select name="verified" value={filters.verified} onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Featured</span>
                <select name="featured" value={filters.featured} onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">All</option>
                  <option value="true">Featured</option>
                  <option value="false">Not Featured</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {isLoading ? (
            <div className="min-h-72 flex items-center justify-center text-zinc-500">
              <FaSpinner className="animate-spin text-2xl" />
            </div>
          ) : data.items.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
              No properties match the current moderation filters.
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => {
                const isPending = item.status === "pending";
                return (
                  <article
                    key={item.id}
                    className={`bg-white border rounded-xl shadow-sm p-5 transition ${
                      isPending ? "border-amber-300 ring-1 ring-amber-200" : "border-zinc-200"
                    }`}
                  >
                    {isPending && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <FaExclamationTriangle className="text-amber-500 text-xs shrink-0" />
                        <span className="text-xs font-semibold text-amber-800">
                          This listing is awaiting admin approval before it goes live.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col xl:flex-row gap-5">
                      {/* Thumbnail */}
                      <div className="xl:w-52 h-40 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                        <img
                          src={item.thumbnail_url || `https://picsum.photos/600/400?random=${item.id}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[item.status] || "bg-zinc-100 text-zinc-700"}`}>
                            {item.status}
                          </span>
                          {item.is_verified && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">
                              Verified
                            </span>
                          )}
                          {item.is_featured && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold uppercase tracking-wider">
                              Featured
                            </span>
                          )}
                        </div>

                        <div>
                          <h2 className="text-xl font-bold text-zinc-950">{item.title}</h2>
                          <p className="text-sm text-zinc-500 mt-1">
                            {item.locality ? `${item.locality}, ` : ""}{item.city} · {item.owner_name || "Unknown owner"}
                          </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-sm text-zinc-700">
                          <p>Type: <span className="font-medium capitalize">{item.property_type}</span></p>
                          <p>Listing: <span className="font-medium capitalize">{item.listing_type}</span></p>
                          <p>Price: <span className="font-medium">{item.price_label || item.price.toLocaleString()}</span></p>
                          <p>Created: <span className="font-medium">{new Date(item.created_at).toLocaleString()}</span></p>
                        </div>

                        {/* Status action buttons */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {/* Approve / Reject — prominent for pending */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={activeId === item.id}
                                onClick={() => handleModerationUpdate(item.id, { status: "active", is_verified: true })}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-60"
                              >
                                {activeId === item.id ? <FaSpinner className="animate-spin" /> : <FaThumbsUp />}
                                Approve & Publish
                              </button>
                              <button
                                type="button"
                                disabled={activeId === item.id}
                                onClick={() => handleModerationUpdate(item.id, { status: "rejected" })}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-60"
                              >
                                {activeId === item.id ? <FaSpinner className="animate-spin" /> : <FaThumbsDown />}
                                Reject
                              </button>
                              <div className="w-px bg-zinc-200 self-stretch mx-1" />
                            </>
                          )}

                          <button type="button" disabled={activeId === item.id}
                            onClick={() => handleModerationUpdate(item.id, { status: "active" })}
                            className={statusButtonClass(item.status === "active")}>
                            Active
                          </button>
                          <button type="button" disabled={activeId === item.id}
                            onClick={() => handleModerationUpdate(item.id, { status: "inactive" })}
                            className={statusButtonClass(item.status === "inactive")}>
                            <FaStoreSlash className="inline mr-1 text-[10px]" />Inactive
                          </button>
                          <button type="button" disabled={activeId === item.id}
                            onClick={() => handleModerationUpdate(item.id, { status: "sold" })}
                            className={statusButtonClass(item.status === "sold")}>
                            Sold
                          </button>
                          <button type="button" disabled={activeId === item.id}
                            onClick={() => handleModerationUpdate(item.id, { status: "rented" })}
                            className={statusButtonClass(item.status === "rented")}>
                            Rented
                          </button>
                        </div>
                      </div>

                      {/* Right panel */}
                      <div className="xl:w-64 space-y-3">
                        <button type="button" disabled={activeId === item.id}
                          onClick={() => handleModerationUpdate(item.id, { is_verified: !item.is_verified })}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60">
                          <FaCheckCircle className="text-xs" />
                          {item.is_verified ? "Remove Verification" : "Mark Verified"}
                        </button>

                        <button type="button" disabled={activeId === item.id}
                          onClick={() => handleModerationUpdate(item.id, { is_featured: !item.is_featured })}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60">
                          <FaStar className="text-xs" />
                          {item.is_featured ? "Remove Featured" : "Make Featured"}
                        </button>

                        <Link to={`/properties/${item.id}`}
                          className="w-full inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition">
                          View Listing
                        </Link>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition"
                        >
                          <FaTrash className="text-xs" />
                          Delete Listing
                        </button>
                      </div>
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
