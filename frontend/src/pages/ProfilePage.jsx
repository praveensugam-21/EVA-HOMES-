import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaHandshake,
  FaSave,
  FaSpinner,
  FaTimesCircle,
  FaUserCircle,
} from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import { authAPI, getErrorMessage } from "../api/api";
import { useAuth } from "../context/AuthContext";

const SELLER_STATUS_META = {
  unverified: { label: "Unverified", color: "bg-line text-ink-soft", icon: FaClock },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: FaClock },
  verified: { label: "Verified Seller", color: "bg-emerald-100 text-emerald-700", icon: FaCheckCircle },
  rejected: { label: "Verification Rejected", color: "bg-red-100 text-red-700", icon: FaTimesCircle },
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("buyer");

  // ---- Buyer (shared) profile form ----
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    bio: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  // ---- Seller profile activation + business details ----
  const [businessName, setBusinessName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [sellerError, setSellerError] = useState("");
  const [sellerMessage, setSellerMessage] = useState("");

  const hasSellerProfile = !!user?.has_seller_profile;
  const sellerStatus = user?.seller_profile?.seller_status || "unverified";
  const statusMeta = SELLER_STATUS_META[sellerStatus] || SELLER_STATUS_META.unverified;
  const StatusIcon = statusMeta.icon;

  useEffect(() => {
    if (!user) return;
    setFormData({
      full_name: user.full_name || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      bio: user.bio || "",
    });
    setBusinessName(user.seller_profile?.business_name || "");
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveMessage("");
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSaveMessage("");
    try {
      await authAPI.updateMyProfile(formData);
      await refreshUser();
      setSaveMessage("Profile updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setSellerError("");
  };

  const handleActivateSeller = async () => {
    if (!photoFile) {
      setSellerError("A photo of yourself is required to activate a seller profile — buyers need to see who they're dealing with.");
      return;
    }
    setIsActivating(true);
    setSellerError("");
    try {
      const { url } = await authAPI.uploadSellerPhoto(photoFile);
      await authAPI.createMySellerProfile({ business_name: businessName || undefined, photo_url: url });
      await refreshUser();
      setActiveTab("seller");
    } catch (err) {
      setSellerError(getErrorMessage(err, "Failed to activate seller profile."));
    } finally {
      setIsActivating(false);
    }
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setIsSavingBusiness(true);
    setSellerError("");
    setSellerMessage("");
    try {
      const updates = { business_name: businessName };
      if (photoFile) {
        const { url } = await authAPI.uploadSellerPhoto(photoFile);
        updates.photo_url = url;
      }
      await authAPI.updateMySellerProfile(updates);
      await refreshUser();
      setSellerMessage("Seller profile updated.");
      setPhotoFile(null);
    } catch (err) {
      setSellerError(getErrorMessage(err, "Failed to update seller profile."));
    } finally {
      setIsSavingBusiness(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title="Profile">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center">
          <FaUserCircle className="text-faint text-4xl" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">{user.full_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-1 rounded-full bg-surface text-ink-soft text-[11px] font-semibold uppercase tracking-wider">
              Buyer
            </span>
            {hasSellerProfile && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${statusMeta.color}`}>
                <StatusIcon className="text-[10px]" />
                {statusMeta.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab("buyer")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "buyer" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Buyer Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seller")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "seller" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Seller Profile
        </button>
      </div>

      {activeTab === "buyer" && (
        <section className="bg-white border-2 border-ink rounded-xl p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Profile Details</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">
              {error}
            </div>
          )}
          {saveMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-3 mb-4 text-xs font-medium">
              {saveMessage}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink-soft text-xs font-semibold mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
                />
              </div>
              <div>
                <label className="block text-ink-soft text-xs font-semibold mb-1.5">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
                />
              </div>
              <div>
                <label className="block text-ink-soft text-xs font-semibold mb-1.5">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Mumbai"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
                />
              </div>
              <div>
                <label className="block text-ink-soft text-xs font-semibold mb-1.5">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-ink-soft text-xs font-semibold mb-1.5">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                placeholder="A short note about yourself..."
                className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-ink hover:bg-accent-hover disabled:bg-ink-soft text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
            >
              {isSaving ? <FaSpinner className="animate-spin text-xs" /> : <FaSave className="text-xs" />}
              Save Changes
            </button>
          </form>
        </section>
      )}

      {activeTab === "seller" && !hasSellerProfile && (
        <section className="bg-white border-2 border-ink rounded-xl p-8 text-center">
          <FaHandshake className="text-faint text-4xl mx-auto mb-3" />
          <h2 className="text-lg font-bold text-ink mb-1">Start Selling on This Account</h2>
          <p className="text-sm text-muted max-w-md mx-auto mb-5">
            Activate a seller profile to list properties — no new account needed. You'll keep
            your buyer profile exactly as it is, and can upload verification documents afterwards.
          </p>

          {sellerError && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium max-w-sm mx-auto">
              {sellerError}
            </div>
          )}

          <div className="max-w-sm mx-auto space-y-3">
            <div className="flex flex-col items-center gap-2">
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="Your photo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-ink"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-line flex items-center justify-center">
                  <FaUserCircle className="text-faint text-3xl" />
                </div>
              )}
              <label className="text-xs font-semibold text-ink underline underline-offset-2 cursor-pointer">
                {photoPreviewUrl ? "Change photo" : "Upload your photo (required)"}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name (optional)"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
            />
            <button
              type="button"
              onClick={handleActivateSeller}
              disabled={isActivating || !photoFile}
              className="w-full inline-flex items-center justify-center gap-2 bg-ink hover:bg-accent-hover disabled:bg-ink-soft disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
            >
              {isActivating ? <FaSpinner className="animate-spin text-xs" /> : <FaHandshake className="text-xs" />}
              Activate Seller Profile
            </button>
          </div>
        </section>
      )}

      {activeTab === "seller" && hasSellerProfile && (
        <section className="bg-white border-2 border-ink rounded-xl p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Business Details</h2>

          {sellerError && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">
              {sellerError}
            </div>
          )}
          {sellerMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-3 mb-4 text-xs font-medium">
              {sellerMessage}
            </div>
          )}

          <div className="flex items-center gap-4 mb-5">
            {photoPreviewUrl || user?.seller_profile?.photo_url ? (
              <img
                src={photoPreviewUrl || user.seller_profile.photo_url}
                alt={user?.full_name || "You"}
                className="w-16 h-16 rounded-full object-cover border-2 border-ink"
              />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-line flex items-center justify-center">
                <FaUserCircle className="text-faint text-2xl" />
              </div>
            )}
            <label className="text-xs font-semibold text-ink underline underline-offset-2 cursor-pointer">
              Change photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          <form onSubmit={handleSaveBusiness} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name (optional)"
              className="flex-1 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
            />
            <button
              type="submit"
              disabled={isSavingBusiness}
              className="inline-flex items-center justify-center gap-2 bg-ink hover:bg-accent-hover disabled:bg-ink-soft text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition whitespace-nowrap"
            >
              {isSavingBusiness ? <FaSpinner className="animate-spin text-xs" /> : <FaSave className="text-xs" />}
              Save
            </button>
          </form>

          <p className="text-sm text-muted mt-5">
            Manage your verification documents and status from{" "}
            <Link to="/dashboard/seller/verification" className="font-semibold text-ink underline">
              Verification
            </Link>{" "}
            in the seller dashboard.
          </p>
        </section>
      )}
    </DashboardLayout>
  );
}
