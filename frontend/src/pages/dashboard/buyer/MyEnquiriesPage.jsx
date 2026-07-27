import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaClipboardList, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { enquiriesAPI, getErrorMessage } from "../../../api/api";

export default function MyEnquiriesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await enquiriesAPI.mine();
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load your enquiries."));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout mode="buyer" title="My Enquiries" subtitle="Enquiries you've submitted on properties">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-zinc-400"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-500 shadow-sm">
          <FaClipboardList className="mx-auto text-3xl text-zinc-300 mb-3" />
          You haven't submitted any enquiries yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {item.property_title ? (
                    <Link to={`/properties/${item.property_id}`} className="font-semibold text-zinc-900 hover:underline">
                      {item.property_title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-zinc-900">General enquiry</p>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">{item.property_city}{item.property_locality ? `, ${item.property_locality}` : ""}</p>
                  <p className="text-sm text-zinc-700 mt-2">{item.message}</p>
                  <p className="text-xs text-zinc-400 mt-2">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              {item.notes && item.notes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Replies from the broker desk</p>
                  {item.notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                      <p className="text-sm text-zinc-800 whitespace-pre-line">{note.text}</p>
                      <p className="text-[11px] text-zinc-400 mt-1">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
