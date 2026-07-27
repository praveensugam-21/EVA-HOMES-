import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaFileAlt,
  FaSearch,
  FaShieldAlt,
  FaSpinner,
  FaTimesCircle,
  FaUserCheck,
  FaUserSlash,
} from "react-icons/fa";
import { Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { authAPI, getErrorMessage } from "../api/api";
import { useAuth } from "../context/AuthContext";

const initialFilters = {
  search: "",
  active: "",
  is_admin: "",
};

const SELLER_STATUS_STYLES = {
  unverified: "bg-zinc-200 text-zinc-700",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminUsersPage() {
  const { isLoggedIn, user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [docsByUser, setDocsByUser] = useState({});
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) {
      return;
    }

    const loadUsers = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await authAPI.listUsers({
          search: filters.search.trim() || undefined,
          active: filters.active === "" ? undefined : filters.active === "true",
          is_admin: filters.is_admin === "" ? undefined : filters.is_admin === "true",
        });
        setData(response);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load users."));
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
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

  const handleUserUpdate = async (userId, updates) => {
    setActiveId(userId);
    setError("");
    try {
      const updated = await authAPI.updateUser(userId, updates);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === userId ? updated : item)),
      }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update user."));
    } finally {
      setActiveId(null);
    }
  };

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

  const handleSellerVerification = async (userId, sellerStatus) => {
    setActiveId(userId);
    setError("");
    try {
      const updated = await authAPI.updateSellerVerification(userId, sellerStatus);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === userId ? updated : item)),
      }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update verification status."));
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
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">Users</h1>
              <p className="text-sm text-zinc-500 mt-2">Manage account access, admin privileges, and active status.</p>
            </div>
            <div className="rounded-xl bg-white border border-zinc-200 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Users</p>
              <p className="text-2xl font-bold text-zinc-950 mt-2">{data.total}</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
            <div className="grid lg:grid-cols-[1fr_180px_180px] gap-4">
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
                  placeholder="Name, email, phone..."
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Active Status</span>
                <select
                  name="active"
                  value={filters.active}
                  onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                >
                  <option value="">All users</option>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Role</span>
                <select
                  name="is_admin"
                  value={filters.is_admin}
                  onChange={handleFilterChange}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                >
                  <option value="">All roles</option>
                  <option value="true">Admins</option>
                  <option value="false">Regular users</option>
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
              No users match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => (
                <article key={item.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                    <div className="space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                        {item.is_admin && (
                          <span className="px-2.5 py-1 rounded-full bg-zinc-900 text-white text-[11px] font-semibold uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-semibold uppercase tracking-wider">
                          Buyer
                        </span>
                        {item.has_seller_profile && (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${SELLER_STATUS_STYLES[item.seller_profile?.seller_status] || SELLER_STATUS_STYLES.unverified}`}>
                            Seller: {item.seller_profile?.seller_status}
                          </span>
                        )}
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-zinc-950">{item.full_name}</h2>
                        <p className="text-sm text-zinc-500 mt-1">{item.email}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm text-zinc-700">
                        <p>Phone: <span className="font-medium">{item.phone || "Not shared"}</span></p>
                        <p>Created: <span className="font-medium">{new Date(item.created_at).toLocaleString()}</span></p>
                      </div>

                      {item.has_seller_profile && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleDocuments(item.id)}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline"
                          >
                            <FaFileAlt className="text-[10px]" />
                            {expandedUserId === item.id ? "Hide Documents" : "View Documents"}
                          </button>

                          {expandedUserId === item.id && (
                            <div className="mt-3 border border-zinc-100 rounded-lg p-3 space-y-2">
                              {docsLoading && !docsByUser[item.id] ? (
                                <FaSpinner className="animate-spin text-zinc-400" />
                              ) : (docsByUser[item.id] || []).length === 0 ? (
                                <p className="text-xs text-zinc-400">No documents uploaded yet.</p>
                              ) : (
                                (docsByUser[item.id] || []).map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-700 font-medium">{doc.doc_type}</span>
                                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-900 underline">
                                      View file
                                    </a>
                                  </div>
                                ))
                              )}

                              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                                <button
                                  type="button"
                                  disabled={activeId === item.id}
                                  onClick={() => handleSellerVerification(item.id, "verified")}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 transition disabled:opacity-60"
                                >
                                  <FaCheckCircle className="text-[10px]" /> Verify Seller
                                </button>
                                <button
                                  type="button"
                                  disabled={activeId === item.id}
                                  onClick={() => handleSellerVerification(item.id, "rejected")}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold py-2 transition disabled:opacity-60"
                                >
                                  <FaTimesCircle className="text-[10px]" /> Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="xl:w-72 space-y-3">
                      <button
                        type="button"
                        disabled={activeId === item.id}
                        onClick={() => handleUserUpdate(item.id, { is_admin: !item.is_admin })}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                      >
                        <FaShieldAlt className="text-xs" />
                        {item.is_admin ? "Remove Admin Access" : "Make Admin"}
                      </button>

                      <button
                        type="button"
                        disabled={activeId === item.id}
                        onClick={() => handleUserUpdate(item.id, { is_active: !item.is_active })}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400 transition disabled:opacity-60"
                      >
                        {item.is_active ? <FaUserSlash className="text-xs" /> : <FaUserCheck className="text-xs" />}
                        {item.is_active ? "Deactivate Account" : "Reactivate Account"}
                      </button>
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
