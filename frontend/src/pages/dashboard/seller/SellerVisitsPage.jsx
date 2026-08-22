import { useEffect, useState } from "react";
import { FaCalendarCheck, FaCheck, FaPlus, FaSpinner, FaTimes, FaTrash } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { visitsAPI, availabilityAPI, propertiesAPI, getErrorMessage } from "../../../api/api";

function AvailabilitySlots() {
  const [properties, setProperties] = useState([]);
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ property_id: "", specific_date: "", start_time: "", end_time: "" });

  const load = async () => {
    setIsLoading(true);
    try {
      const [propsData, slotsData] = await Promise.all([
        propertiesAPI.mine({ per_page: 100 }),
        availabilityAPI.mine(),
      ]);
      setProperties(propsData.items);
      setSlots(slotsData.items);
      setForm((prev) => ({ ...prev, property_id: prev.property_id || propsData.items[0]?.id || "" }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load availability slots."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");
    try {
      const created = await availabilityAPI.create({
        property_id: Number(form.property_id),
        specific_date: form.specific_date,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      setSlots((prev) => [...prev, created].sort((a, b) => a.specific_date.localeCompare(b.specific_date)));
      setForm((prev) => ({ ...prev, specific_date: "", start_time: "", end_time: "" }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add slot."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemove = async (id) => {
    setRemovingId(id);
    setError("");
    try {
      await availabilityAPI.remove(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove slot."));
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-24 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-xl" /></div>;
  }

  if (properties.length === 0) {
    return <p className="text-sm text-faint">Add a property listing first, then come back here to open visit slots for it.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="grid sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-muted mb-1 block">Property</span>
          <select name="property_id" value={form.property_id} onChange={handleChange} required
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white">
            {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted mb-1 block">Date</span>
          <input type="date" name="specific_date" value={form.specific_date} onChange={handleChange} required
            min={new Date().toISOString().slice(0, 10)}
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted mb-1 block">Start</span>
          <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted mb-1 block">End</span>
          <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white" />
        </label>
        <button type="submit" disabled={isCreating}
          className="md:col-span-5 sm:col-span-2 inline-flex items-center justify-center gap-2 bg-ink hover:bg-accent-hover disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition">
          {isCreating ? <FaSpinner className="animate-spin text-xs" /> : <FaPlus className="text-xs" />}
          Add Slot
        </button>
      </form>

      {slots.length === 0 ? (
        <p className="text-sm text-faint">No open slots yet — add one above so buyers can book a visit.</p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between border border-line-soft rounded-lg px-4 py-2.5 text-sm">
              <div>
                <span className="font-medium text-ink">{slot.property_title}</span>
                <span className="text-muted ml-2">{slot.specific_date} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</span>
              </div>
              {slot.is_booked ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Booked</span>
              ) : (
                <button
                  type="button"
                  disabled={removingId === slot.id}
                  onClick={() => handleRemove(slot.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <FaTrash className="text-[10px]" /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SellerVisitsPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await visitsAPI.received();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load visit requests."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const respond = async (id, status) => {
    setActiveId(id);
    try {
      const updated = await visitsAPI.updateStatus(id, status);
      setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update visit."));
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardLayout mode="seller" title="Visit Requests" subtitle="Buyers who requested to view your properties">
      <div className="bg-white border-2 border-ink rounded-xl p-5 mb-6">
        <h2 className="text-base font-bold text-ink mb-1">Availability Slots</h2>
        <p className="text-xs text-muted mb-4">Open specific-date time slots per property — buyers pick one instead of proposing their own time.</p>
        <AvailabilitySlots />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaCalendarCheck className="mx-auto text-3xl text-faint mb-3" />
          No visit requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((visit) => (
            <article key={visit.id} className="bg-white border-2 border-ink rounded-xl p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{visit.property_title}</p>
                <p className="text-xs text-muted mt-1">Requested by {visit.buyer_name}</p>
                <p className="text-sm text-ink-soft mt-1">For: {new Date(visit.requested_date).toLocaleString()}</p>
                {visit.message && <p className="text-sm text-muted mt-1">{visit.message}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={visit.status} />
                {visit.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={activeId === visit.id}
                      onClick={() => respond(visit.id, "confirmed")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                    >
                      <FaCheck className="text-[10px]" /> Confirm
                    </button>
                    <button
                      type="button"
                      disabled={activeId === visit.id}
                      onClick={() => respond(visit.id, "rejected")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <FaTimes className="text-[10px]" /> Decline
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
