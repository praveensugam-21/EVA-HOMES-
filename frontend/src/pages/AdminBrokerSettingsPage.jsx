import { useEffect, useState } from "react";
import { FaArrowLeft, FaPhoneAlt, FaQrcode, FaSave, FaSpinner, FaUpload, FaUserShield, FaWhatsapp } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { propertiesAPI, settingsAPI, getErrorMessage } from "../api/api";
import { useAuth } from "../context/AuthContext";
import funPhoto1 from "../assets/fun1.jpg";
import funPhoto2 from "../assets/fun2.png";

const initialForm = {
  broker_name: "",
  broker_phone: "",
  broker_whatsapp: "",
  photo_url: "",
  payment_qr_image_url: "",
  payment_phone: "",
  phone_unlock_fee: "20",
  map_unlock_fee: "30",
};

export default function AdminBrokerSettingsPage() {
  const { user, isLoggedIn } = useAuth();
  const [formData, setFormData] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !user?.is_admin) {
      return;
    }

    const loadSettings = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await settingsAPI.getBrokerContact();
        setFormData({
          broker_name: data.broker_name,
          broker_phone: data.broker_phone,
          broker_whatsapp: data.broker_whatsapp,
          photo_url: data.photo_url || "",
          payment_qr_image_url: data.payment_qr_image_url || "",
          payment_phone: data.payment_phone || "",
          phone_unlock_fee: String(data.phone_unlock_fee ?? 20),
          map_unlock_fee: String(data.map_unlock_fee ?? 30),
        });
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load agent settings."));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isLoggedIn, user]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await settingsAPI.updateBrokerContact({
        ...formData,
        phone_unlock_fee: formData.phone_unlock_fee ? parseFloat(formData.phone_unlock_fee) : undefined,
        map_unlock_fee: formData.map_unlock_fee ? parseFloat(formData.map_unlock_fee) : undefined,
      });
      setFormData({
        broker_name: updated.broker_name,
        broker_phone: updated.broker_phone,
        broker_whatsapp: updated.broker_whatsapp,
        photo_url: updated.photo_url || "",
        payment_qr_image_url: updated.payment_qr_image_url || "",
        payment_phone: updated.payment_phone || "",
        phone_unlock_fee: String(updated.phone_unlock_fee ?? 20),
        map_unlock_fee: String(updated.map_unlock_fee ?? 30),
      });
      setSuccess("Agent contact details updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update agent contact details."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingQr(true);
    setError("");
    try {
      const { url } = await propertiesAPI.uploadImage(file);
      setFormData((prev) => ({ ...prev, payment_qr_image_url: url }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload QR code image."));
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setError("");
    try {
      const { url } = await propertiesAPI.uploadImage(file);
      setFormData((prev) => ({ ...prev, photo_url: url }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload agent photo."));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/admin/enquiries" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink transition">
            <FaArrowLeft className="text-xs" />
            Back to enquiries
          </Link>

          <div className="mt-5 bg-white border-2 border-ink rounded-xl overflow-hidden">
            <div className="relative px-8 py-7 border-b border-line-soft bg-gradient-to-r from-ink via-ink to-accent-hover text-white overflow-hidden">
              <div
                className="hidden sm:flex absolute top-4 right-6 items-center"
                aria-hidden="true"
                title="The developer, taking a well-earned bow"
              >
                <img
                  src={funPhoto2}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md -rotate-6 hover:rotate-0 hover:scale-110 transition-transform duration-200"
                />
                <img
                  src={funPhoto1}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md -ml-4 rotate-6 hover:rotate-0 hover:scale-110 transition-transform duration-200"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center">
                  <FaUserShield />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-faint">Admin Settings</p>
                  <h1 className="text-2xl font-bold tracking-tight">Agent Contact</h1>
                </div>
              </div>
              <p className="mt-4 text-sm text-faint max-w-2xl">
                Update the photo and phone numbers shown on every property page for call and WhatsApp contact.
              </p>
            </div>

            <div className="p-8">
              {isLoading ? (
                <div className="min-h-56 flex items-center justify-center text-muted">
                  <FaSpinner className="animate-spin text-xl" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {success}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="block text-xs font-semibold text-muted mb-1.5">Agent Name</span>
                      <input
                        type="text"
                        name="broker_name"
                        value={formData.broker_name}
                        onChange={handleChange}
                        required
                        className="w-full border border-line rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-ink bg-white"
                      />
                    </label>

                    <div className="rounded-lg border border-line bg-surface px-4 py-4">
                      <p className="text-xs font-semibold text-muted mb-2">Where this appears</p>
                      <p className="text-sm text-ink-soft leading-relaxed">
                        Property detail pages, call button links, WhatsApp links, and agent contact API responses.
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-muted mb-1.5">Agent Photo</span>
                    <div className="flex items-center gap-4">
                      {formData.photo_url ? (
                        <img
                          src={formData.photo_url}
                          alt="Agent"
                          className="w-16 h-16 rounded-lg object-cover border-2 border-ink"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-ink text-white flex items-center justify-center">
                          <FaUserShield />
                        </div>
                      )}
                      <label className="inline-flex items-center gap-2 border border-line hover:border-ink text-ink-soft text-sm font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition">
                        {isUploadingPhoto ? <FaSpinner className="animate-spin text-xs" /> : <FaUpload className="text-xs" />}
                        {isUploadingPhoto ? "Uploading..." : formData.photo_url ? "Replace Photo" : "Upload Photo"}
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isUploadingPhoto} />
                      </label>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted mb-1.5">
                        <FaPhoneAlt className="text-[10px]" />
                        Call Number
                      </span>
                      <input
                        type="tel"
                        name="broker_phone"
                        value={formData.broker_phone}
                        onChange={handleChange}
                        required
                        className="w-full border border-line rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-ink bg-white"
                      />
                    </label>

                    <label className="block">
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted mb-1.5">
                        <FaWhatsapp className="text-[10px]" />
                        WhatsApp Number
                      </span>
                      <input
                        type="tel"
                        name="broker_whatsapp"
                        value={formData.broker_whatsapp}
                        onChange={handleChange}
                        required
                        className="w-full border border-line rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-ink bg-white"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-line bg-surface px-4 py-4">
                    <p className="text-xs font-semibold text-muted mb-2">Format guidance</p>
                    <p className="text-sm text-ink-soft">
                      Use international format where possible, for example <span className="font-semibold">+919900612425</span>.
                    </p>
                  </div>

                  <div className="border-t-2 border-ink pt-6">
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <FaQrcode className="text-muted" /> Location &amp; Phone Unlock Payment
                    </h2>
                    <p className="text-sm text-muted mt-1 mb-5">
                      Shown to buyers who want to unlock a listing's exact map location or the owner's real phone
                      number — two independent, separately-priced unlocks. Payment is offline (UPI) — you verify it
                      manually from the Payments admin page.
                    </p>

                    <div className="grid md:grid-cols-2 gap-5">
                      <label className="block">
                        <span className="block text-xs font-semibold text-muted mb-1.5">Phone Unlock Fee (₹)</span>
                        <input
                          type="number"
                          name="phone_unlock_fee"
                          min="0"
                          step="1"
                          value={formData.phone_unlock_fee}
                          onChange={handleChange}
                          className="w-full border border-line rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-ink bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-xs font-semibold text-muted mb-1.5">Map Unlock Fee (₹)</span>
                        <input
                          type="number"
                          name="map_unlock_fee"
                          min="0"
                          step="1"
                          value={formData.map_unlock_fee}
                          onChange={handleChange}
                          className="w-full border border-line rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-ink bg-white"
                        />
                      </label>
                    </div>

                    <label className="block mt-5">
                      <span className="block text-xs font-semibold text-muted mb-1.5">UPI Payment Phone Number</span>
                      <input
                        type="tel"
                        name="payment_phone"
                        value={formData.payment_phone}
                        onChange={handleChange}
                        placeholder="e.g. +919900612425"
                        className="w-full border border-line rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-ink bg-white"
                      />
                    </label>

                    <div className="mt-5">
                      <span className="block text-xs font-semibold text-muted mb-1.5">UPI QR Code Image</span>
                      <div className="flex items-center gap-4">
                        {formData.payment_qr_image_url && (
                          <img
                            src={formData.payment_qr_image_url}
                            alt="Payment QR code"
                            className="w-24 h-24 object-contain border-2 border-ink rounded-lg"
                          />
                        )}
                        <label className="inline-flex items-center gap-2 border border-line hover:border-ink text-ink-soft text-sm font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition">
                          {isUploadingQr ? <FaSpinner className="animate-spin text-xs" /> : <FaUpload className="text-xs" />}
                          {isUploadingQr ? "Uploading..." : formData.payment_qr_image_url ? "Replace QR" : "Upload QR"}
                          <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" disabled={isUploadingQr} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 bg-ink hover:bg-accent-hover disabled:bg-ink-soft text-white text-sm font-semibold px-5 py-3 rounded-lg transition"
                    >
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave className="text-xs" />}
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
