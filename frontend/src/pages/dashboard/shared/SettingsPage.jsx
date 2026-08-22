import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaFileAlt,
  FaLock,
  FaQuestionCircle,
  FaSignOutAlt,
  FaSpinner,
} from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { authAPI, getErrorMessage } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";

const TABS = [
  { key: "security", label: "Security", icon: FaLock },
  { key: "notifications", label: "Notification Settings", icon: FaCheckCircle },
  { key: "help", label: "Help & Support", icon: FaQuestionCircle },
  { key: "terms", label: "Terms & Privacy", icon: FaFileAlt },
];

function SecuritySection() {
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await authAPI.changePassword(form.current_password, form.new_password);
      setMessage("Password updated.");
      setForm({ current_password: "", new_password: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to change password."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-ink rounded-xl p-6">
      <h2 className="text-lg font-bold text-ink mb-4">Change Password</h2>
      {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">{error}</div>}
      {message && <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-3 mb-4 text-xs font-medium">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-ink-soft text-xs font-semibold mb-1.5">Current Password</label>
          <input
            type="password"
            required
            value={form.current_password}
            onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
          />
        </div>
        <div>
          <label className="block text-ink-soft text-xs font-semibold mb-1.5">New Password</label>
          <input
            type="password"
            required
            value={form.new_password}
            onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-ink hover:bg-accent-hover disabled:bg-ink-soft text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          {isSaving && <FaSpinner className="animate-spin text-xs" />}
          Update Password
        </button>
      </form>
    </div>
  );
}

function NotificationSettingsSection() {
  const [prefs, setPrefs] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await authAPI.getNotificationPreferences();
        setPrefs(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load notification settings."));
      }
    })();
  }, []);

  const toggle = async (field) => {
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);
    setIsSaving(true);
    try {
      await authAPI.updateNotificationPreferences({ [field]: updated[field] });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update preference."));
      setPrefs(prefs);
    } finally {
      setIsSaving(false);
    }
  };

  if (!prefs) {
    return <div className="flex items-center justify-center py-10 text-faint"><FaSpinner className="animate-spin text-2xl" /></div>;
  }

  const options = [
    { key: "email_on_enquiry", label: "Email me about new enquiries" },
    { key: "email_on_visit_offer_update", label: "Email me about visit/offer updates" },
    { key: "email_on_verification_update", label: "Email me about verification decisions" },
    { key: "sms_notifications", label: "SMS notifications" },
  ];

  return (
    <div className="bg-white border-2 border-ink rounded-xl p-6 max-w-md">
      <h2 className="text-lg font-bold text-ink mb-4">Notification Preferences</h2>
      {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">{error}</div>}
      <div className="space-y-3">
        {options.map((opt) => (
          <label key={opt.key} className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-ink-soft">{opt.label}</span>
            <input
              type="checkbox"
              checked={!!prefs[opt.key]}
              disabled={isSaving}
              onChange={() => toggle(opt.key)}
              className="w-4 h-4 accent-ink"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function HelpSection() {
  return (
    <div className="bg-white border-2 border-ink rounded-xl p-6 space-y-3 text-sm text-ink-soft">
      <h2 className="text-lg font-bold text-ink">Help &amp; Support</h2>
      <p>Need help with your account or a listing? Reach out to the agent desk from any property page's contact panel.</p>
      <p>For account-specific issues (login problems, incorrect verification status), contact an administrator.</p>
    </div>
  );
}

function TermsSection() {
  return (
    <div className="bg-white border-2 border-ink rounded-xl p-6 space-y-3 text-sm text-ink-soft">
      <h2 className="text-lg font-bold text-ink">Terms &amp; Privacy</h2>
      <p>EVA Homes is a demonstration real estate platform. Listings are moderated by admins before going live.</p>
      <p>Buyer and seller data is used only to operate the platform's core features (listings, enquiries, visits, offers, notifications).</p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("security");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <DashboardLayout title="Settings" subtitle="Account, security, and notification preferences">
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition ${
                activeTab === tab.key ? "bg-ink text-white" : "text-ink-soft hover:bg-surface"
              }`}
            >
              <tab.icon className="text-xs shrink-0" />
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left text-red-600 hover:bg-red-50 transition"
          >
            <FaSignOutAlt className="text-xs shrink-0" />
            Logout
          </button>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "security" && <SecuritySection />}
          {activeTab === "notifications" && <NotificationSettingsSection />}
          {activeTab === "help" && <HelpSection />}
          {activeTab === "terms" && <TermsSection />}
        </div>
      </div>
    </DashboardLayout>
  );
}
