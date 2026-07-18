import { useEffect, useState } from "react";
import { FaArrowLeft, FaPhoneAlt, FaSave, FaSpinner, FaUserShield, FaWhatsapp } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { settingsAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  broker_name: "",
  broker_phone: "",
  broker_whatsapp: "",
};

export default function AdminBrokerSettingsPage() {
  const { user, isLoggedIn } = useAuth();
  const [formData, setFormData] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        });
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load broker settings.");
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
      const updated = await settingsAPI.updateBrokerContact(formData);
      setFormData({
        broker_name: updated.broker_name,
        broker_phone: updated.broker_phone,
        broker_whatsapp: updated.broker_whatsapp,
      });
      setSuccess("Broker contact details updated successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update broker contact details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/admin/enquiries" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition">
            <FaArrowLeft className="text-xs" />
            Back to enquiries
          </Link>

          <div className="mt-5 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-8 py-7 border-b border-zinc-100 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 text-white">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center">
                  <FaUserShield />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Admin Settings</p>
                  <h1 className="text-2xl font-bold tracking-tight">Broker Contact</h1>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-300 max-w-2xl">
                Update the phone numbers shown on every property page for call and WhatsApp contact.
              </p>
            </div>

            <div className="p-8">
              {isLoading ? (
                <div className="min-h-56 flex items-center justify-center text-zinc-500">
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
                      <span className="block text-xs font-semibold text-zinc-500 mb-1.5">Broker Name</span>
                      <input
                        type="text"
                        name="broker_name"
                        value={formData.broker_name}
                        onChange={handleChange}
                        required
                        className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                      />
                    </label>

                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
                      <p className="text-xs font-semibold text-zinc-500 mb-2">Where this appears</p>
                      <p className="text-sm text-zinc-700 leading-relaxed">
                        Property detail pages, call button links, WhatsApp links, and broker contact API responses.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1.5">
                        <FaPhoneAlt className="text-[10px]" />
                        Call Number
                      </span>
                      <input
                        type="tel"
                        name="broker_phone"
                        value={formData.broker_phone}
                        onChange={handleChange}
                        required
                        className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                      />
                    </label>

                    <label className="block">
                      <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1.5">
                        <FaWhatsapp className="text-[10px]" />
                        WhatsApp Number
                      </span>
                      <input
                        type="tel"
                        name="broker_whatsapp"
                        value={formData.broker_whatsapp}
                        onChange={handleChange}
                        required
                        className="w-full border border-zinc-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-zinc-400 bg-white"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <p className="text-xs font-semibold text-zinc-500 mb-2">Format guidance</p>
                    <p className="text-sm text-zinc-700">
                      Use international format where possible, for example <span className="font-semibold">+919900612425</span>.
                    </p>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-700 text-white text-sm font-semibold px-5 py-3 rounded-lg transition"
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
