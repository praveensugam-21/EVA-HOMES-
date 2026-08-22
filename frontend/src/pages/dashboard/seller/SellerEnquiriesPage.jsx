import { useEffect, useState } from "react";
import { FaCheckCircle, FaClipboardList, FaPaperPlane, FaSpinner, FaWhatsapp } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { enquiriesAPI, getErrorMessage } from "../../../api/api";
import { whatsAppNumber } from "../../../utils/whatsapp";

export default function SellerEnquiriesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [draftNotes, setDraftNotes] = useState({});
  const [sentId, setSentId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await enquiriesAPI.received();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load enquiries."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleStatusChange = async (id, status) => {
    setActiveId(id);
    try {
      const updated = await enquiriesAPI.update(id, { status });
      setItems((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update enquiry."));
    } finally {
      setActiveId(null);
    }
  };

  const handleSendNote = async (item) => {
    const text = (draftNotes[item.id] || "").trim();
    if (!text) return;

    setActiveId(item.id);
    setError("");
    try {
      const note = await enquiriesAPI.addNote(item.id, text);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, notes: [...(it.notes || []), note] } : it))
      );
      setDraftNotes((prev) => ({ ...prev, [item.id]: "" }));
      setSentId(item.id);
      setTimeout(() => setSentId((current) => (current === item.id ? null : current)), 1800);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send reply."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="seller" title="Enquiries" subtitle="Buyer enquiries received on your listings">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaClipboardList className="mx-auto text-3xl text-faint mb-3" />
          No enquiries received yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="bg-white border-2 border-ink rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{item.property_title || "General enquiry"}</p>
                  <p className="text-xs text-muted mt-1">From {item.name} ({item.email}{item.phone ? `, ${item.phone}` : ""})</p>
                  <p className="text-sm text-ink-soft mt-2">{item.message}</p>
                  <p className="text-xs text-faint mt-2">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex gap-2 mt-4">
                {["new", "contacted", "closed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={activeId === item.id || item.status === s}
                    onClick={() => handleStatusChange(item.id, s)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line text-ink-soft hover:border-ink disabled:opacity-40 capitalize"
                  >
                    Mark {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-line-soft">
                <span className="block text-xs font-semibold text-muted mb-1">Reply to buyer</span>
                <p className="text-[11px] text-faint mb-1.5">
                  {item.user_id
                    ? "Visible to the buyer on their My Enquiries page, with a notification. The admin can see this reply too."
                    : "This enquiry has no linked account — the buyer can't see replies here. Call or email them directly instead."}
                </p>

                {item.notes && item.notes.length > 0 && (
                  <div className="space-y-2 mb-2 max-h-40 overflow-y-auto pr-1">
                    {item.notes.map((note) => (
                      <div key={note.id} className="rounded-lg bg-surface border border-line-soft px-3 py-2">
                        <p className="text-sm text-ink whitespace-pre-line">{note.text}</p>
                        <p className="text-[11px] text-faint mt-1">{new Date(note.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sentId === item.id && (
                  <p className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mb-2">
                    <FaCheckCircle className="text-[10px]" /> Reply sent
                  </p>
                )}

                <textarea
                  rows={3}
                  value={draftNotes[item.id] || ""}
                  placeholder="Write a reply the buyer will see..."
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink resize-none bg-white"
                  onChange={(e) => setDraftNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    disabled={activeId === item.id || !(draftNotes[item.id] || "").trim()}
                    onClick={() => handleSendNote(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition disabled:opacity-60"
                  >
                    {activeId === item.id ? <FaSpinner className="animate-spin text-xs" /> : <FaPaperPlane className="text-xs" />}
                    Send Reply
                  </button>
                  {item.phone && (
                    <a
                      href={`https://wa.me/${whatsAppNumber(item.phone)}?text=${encodeURIComponent(
                        (draftNotes[item.id] || "").trim() ||
                          `Hi ${item.name}, thanks for your enquiry${item.property_title ? ` about "${item.property_title}"` : ""}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      <FaWhatsapp className="text-xs" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
