import { useEffect, useState } from "react";
import { FaCheckCircle, FaEnvelopeOpenText, FaFilter, FaPhoneAlt, FaSearch, FaSpinner } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { enquiriesAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";

const initialFilters = {
  status: "",
  unreadOnly: false,
  search: "",
};

export default function AdminEnquiriesPage() {
  const { isLoggedIn, user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [dashboard, setDashboard] = useState({ items: [], total: 0, unread_count: 0, new_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) {
      return;
    }

    const loadEnquiries = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await enquiriesAPI.list({
          status: filters.status || undefined,
          unread_only: filters.unreadOnly || undefined,
          search: filters.search.trim() || undefined,
        });
        setDashboard(data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load enquiries.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEnquiries();
  }, [filters, isLoggedIn, user]);

  const refreshEnquiries = async () => {
    const data = await enquiriesAPI.list({
      status: filters.status || undefined,
      unread_only: filters.unreadOnly || undefined,
      search: filters.search.trim() || undefined,
    });
    setDashboard(data);
  };

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEnquiryUpdate = async (enquiryId, data) => {
    setActiveId(enquiryId);
    setError("");
    try {
      await enquiriesAPI.update(enquiryId, data);
      await refreshEnquiries();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update enquiry.");
    } finally {
      setActiveId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">Admin Workspace</p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">Enquiries</h1>
              <p className="text-sm text-zinc-500 mt-2">Every new lead appears here for broker follow-up.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
              <div className="rounded-xl bg-white border border-zinc-200 px-4 py-4 shadow-sm min-w-[140px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total</p>
                <p className="text-2xl font-bold text-zinc-950 mt-2">{dashboard.total}</p>
              </div>
              <div className="rounded-xl bg-white border border-zinc-200 px-4 py-4 shadow-sm min-w-[140px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Unread</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{dashboard.unread_count}</p>
              </div>
              <div className="rounded-xl bg-white border border-zinc-200 px-4 py-4 shadow-sm min-w-[140px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">New</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{dashboard.new_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
            <div className="grid lg:grid-cols-[1fr_180px_auto] gap-4 items-end">
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
                  placeholder="Buyer name, email, phone, property..."
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1.5">
                  <FaFilter className="text-[10px]" />
                  Status
                </span>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                >
                  <option value="">All statuses</option>
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  name="unreadOnly"
                  checked={filters.unreadOnly}
                  onChange={handleFilterChange}
                  className="h-4 w-4 accent-zinc-900"
                />
                Unread only
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
          ) : dashboard.items.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
              No enquiries match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.items.map((item) => (
                <article key={item.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div className="space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-900 text-white text-[11px] font-semibold uppercase tracking-wider">
                          {item.status}
                        </span>
                        {!item.is_read && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold uppercase tracking-wider">
                            Unread
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-semibold uppercase tracking-wider">
                          {item.source.replace("_", " ")}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-zinc-950">{item.name}</h2>
                        <p className="text-sm text-zinc-500 mt-1">
                          {item.property_title || "General enquiry"}
                          {item.property_city ? ` · ${item.property_locality ? `${item.property_locality}, ` : ""}${item.property_city}` : ""}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm text-zinc-700">
                        <p>Email: <span className="font-medium">{item.email}</span></p>
                        <p>Phone: <span className="font-medium">{item.phone || "Not shared"}</span></p>
                        <p>Created: <span className="font-medium">{new Date(item.created_at).toLocaleString()}</span></p>
                        {item.property_id && (
                          <p>
                            Property:{" "}
                            <Link to={`/properties/${item.property_id}`} className="font-medium text-zinc-900 hover:underline">
                              View listing
                            </Link>
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 whitespace-pre-line">
                        {item.message}
                      </div>
                    </div>

                    <div className="xl:w-[320px] space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleEnquiryUpdate(item.id, { status: "contacted" })}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                        >
                          <FaPhoneAlt className="text-xs" />
                          Contacted
                        </button>
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleEnquiryUpdate(item.id, { status: "closed" })}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                        >
                          <FaCheckCircle className="text-xs" />
                          Closed
                        </button>
                        <button
                          type="button"
                          disabled={activeId === item.id}
                          onClick={() => handleEnquiryUpdate(item.id, { status: "read", is_read: true })}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                        >
                          <FaEnvelopeOpenText className="text-xs" />
                          Mark Read
                        </button>
                        <a
                          href={item.phone ? `tel:${item.phone}` : `mailto:${item.email}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition"
                        >
                          {item.phone ? <FaPhoneAlt className="text-xs" /> : <FaEnvelopeOpenText className="text-xs" />}
                          Reach Out
                        </a>
                      </div>

                      <label className="block">
                        <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Broker Notes</span>
                        <textarea
                          rows={4}
                          defaultValue={item.broker_notes || ""}
                          placeholder="Internal notes about follow-up, visit timing, negotiation..."
                          className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-400 resize-none bg-white"
                          onBlur={(e) => {
                            if ((item.broker_notes || "") !== e.target.value.trim()) {
                              handleEnquiryUpdate(item.id, { broker_notes: e.target.value });
                            }
                          }}
                        />
                      </label>
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
