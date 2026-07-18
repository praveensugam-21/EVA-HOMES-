import { useEffect, useState } from "react";
import { FaCheckCircle, FaSearch, FaSpinner, FaStar, FaStoreSlash } from "react-icons/fa";
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

export default function AdminListingsPage() {
  const { isLoggedIn, user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) {
      return;
    }

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

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

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
        items: prev.items.map((item) => (
          item.id === propertyId
            ? {
                ...item,
                status: updated.status,
                is_verified: updated.is_verified,
                is_featured: updated.is_featured,
              }
            : item
        )),
      }));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update property.");
    } finally {
      setActiveId(null);
    }
  };

  const statusButtonClass = (active) => (
    `rounded-lg px-3 py-2 text-xs font-semibold transition ${
      active ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-700 hover:border-zinc-400"
    }`
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">Admin Workspace</p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">Listings Moderation</h1>
              <p className="text-sm text-zinc-500 mt-2">Review statuses, featured flags, and verification before properties go live.</p>
            </div>
            <div className="rounded-xl bg-white border border-zinc-200 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Listings</p>
              <p className="text-2xl font-bold text-zinc-950 mt-2">{data.total}</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
            <div className="grid lg:grid-cols-[1fr_180px_180px_180px] gap-4">
              <label className="block">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1.5">
                  <FaSearch className="text-[10px]" />
                  Search
                </span>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Property title, city, locality..."
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Status</span>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="sold">Sold</option>
                  <option value="rented">Rented</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Verified</span>
                <select
                  name="verified"
                  value={filters.verified}
                  onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Featured</span>
                <select
                  name="featured"
                  value={filters.featured}
                  onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                >
                  <option value="">All</option>
                  <option value="true">Featured</option>
                  <option value="false">Not Featured</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
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
              {data.items.map((item) => (
                <article key={item.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
                  <div className="flex flex-col xl:flex-row gap-5">
                    <div className="xl:w-52 h-40 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                      <img
                        src={item.thumbnail_url || `https://picsum.photos/600/400?random=${item.id}`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-900 text-white text-[11px] font-semibold uppercase tracking-wider">
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

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleModerationUpdate(item.id, { status: "active" })}
                          className={statusButtonClass(item.status === "active")}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleModerationUpdate(item.id, { status: "inactive" })}
                          className={statusButtonClass(item.status === "inactive")}
                        >
                          <FaStoreSlash className="inline mr-1 text-[10px]" />
                          Inactive
                        </button>
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleModerationUpdate(item.id, { status: "sold" })}
                          className={statusButtonClass(item.status === "sold")}
                        >
                          Sold
                        </button>
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleModerationUpdate(item.id, { status: "rented" })}
                          className={statusButtonClass(item.status === "rented")}
                        >
                          Rented
                        </button>
                      </div>
                    </div>

                    <div className="xl:w-64 space-y-3">
                      <button
                        type="button"
                        disabled={activeId === item.id}
                        onClick={() => handleModerationUpdate(item.id, { is_verified: !item.is_verified })}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                      >
                        <FaCheckCircle className="text-xs" />
                        {item.is_verified ? "Remove Verification" : "Mark Verified"}
                      </button>

                      <button
                        type="button"
                        disabled={activeId === item.id}
                        onClick={() => handleModerationUpdate(item.id, { is_featured: !item.is_featured })}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                      >
                        <FaStar className="text-xs" />
                        {item.is_featured ? "Remove Featured" : "Make Featured"}
                      </button>

                      <Link
                        to={`/properties/${item.id}`}
                        className="w-full inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                      >
                        View Listing
                      </Link>
                    </div>
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
