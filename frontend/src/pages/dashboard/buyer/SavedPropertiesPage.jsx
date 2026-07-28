import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaSpinner, FaTrash } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { savedPropertiesAPI, getErrorMessage } from "../../../api/api";

export default function SavedPropertiesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await savedPropertiesAPI.list();
      setItems(data.items);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load saved properties."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnsave = async (propertyId) => {
    setRemovingId(propertyId);
    try {
      await savedPropertiesAPI.unsave(propertyId);
      setItems((prev) => prev.filter((item) => item.property_id !== propertyId));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove property."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DashboardLayout mode="buyer" title="Saved Properties" subtitle="Properties you've added to your wishlist">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-faint">
          <FaSpinner className="animate-spin text-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-ink bg-white p-10 text-center text-muted">
          <FaHeart className="mx-auto text-3xl text-faint mb-3" />
          No saved properties yet. Browse listings and tap the heart icon to save one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white border-2 border-ink rounded-xl overflow-hidden flex">
              <img src={item.property.thumbnail_url} alt={item.property.title} className="w-28 h-28 object-cover shrink-0" />
              <div className="p-4 flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link to={`/properties/${item.property.id}`} className="font-semibold text-ink hover:underline line-clamp-1">
                    {item.property.title}
                  </Link>
                  <p className="text-xs text-muted mt-1">{item.property.city}{item.property.locality ? `, ${item.property.locality}` : ""}</p>
                  <p className="text-sm font-bold text-ink mt-1">{item.property.price_label || `₹${item.property.price.toLocaleString()}`}</p>
                </div>
                <button
                  type="button"
                  disabled={removingId === item.property_id}
                  onClick={() => handleUnsave(item.property_id)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 self-start"
                >
                  <FaTrash className="text-[10px]" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
