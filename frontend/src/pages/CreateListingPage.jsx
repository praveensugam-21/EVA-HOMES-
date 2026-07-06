import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUpload, FaSpinner, FaTimes } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { propertiesAPI } from "../api/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// High-quality real estate placeholder options to make it easy for users to pick premium photos
const PRESET_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80", label: "Modern Exterior" },
  { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80", label: "Elegant Living Room" },
  { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80", label: "Villa Patio" },
  { url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80", label: "Minimalist Kitchen" },
  { url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80", label: "Luxury Bedroom" }
];

export default function CreateListingPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    price_label: "",
    city: "",
    locality: "",
    address: "",
    property_type: "apartment",
    listing_type: "buy",
    bedrooms: "",
    bathrooms: "",
    area_sqft: ""
  });

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [additionalImages, setAdditionalImages] = useState([]); // [{ url: "", caption: "", order: 0 }]
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Uploading state
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "thumbnail") {
      setThumbnailUploading(true);
    } else {
      setImageUploading(true);
    }

    try {
      const response = await propertiesAPI.uploadImage(file);
      if (type === "thumbnail") {
        setThumbnailUrl(response.url);
      } else {
        setAdditionalImages((prev) => [
          ...prev,
          { url: response.url, caption: file.name.split(".")[0], order: prev.length }
        ]);
      }
    } catch (err) {
      console.error(err);
      setError("Image upload failed. Please try again.");
    } finally {
      setThumbnailUploading(false);
      setImageUploading(false);
    }
  };

  const handleAddPresetImage = (url) => {
    if (!thumbnailUrl) {
      setThumbnailUrl(url);
    } else {
      setAdditionalImages((prev) => [
        ...prev,
        { url, caption: "Preset Image", order: prev.length }
      ]);
    }
  };

  const handleRemoveImage = (index) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveThumbnail = () => {
    setThumbnailUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      setError("You must be logged in to create a listing.");
      navigate("/login");
      return;
    }

    if (!thumbnailUrl) {
      setError("Please provide or upload a thumbnail photo.");
      return;
    }

    setIsSubmitting(true);

    // Build payload matching PropertyCreate Pydantic schema
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
      thumbnail_url: thumbnailUrl,
      images: additionalImages.map((img, index) => ({
        url: img.url,
        caption: img.caption || "",
        order: index
      }))
    };

    try {
      const newProperty = await propertiesAPI.create(payload);
      navigate(`/properties/${newProperty.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to create listing. Please verify input fields.";
      setError(Array.isArray(msg) ? "Validation Error. Check form fields." : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
        <FaHome className="text-zinc-400 text-5xl mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Sign in to list property</h2>
        <p className="text-zinc-500 text-xs mt-1 max-w-xs">You must be logged in as an agent or seller to add new real estate properties.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-5 bg-zinc-900 text-white text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-zinc-800 transition"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">List Your Property</h1>
          <p className="text-zinc-550 text-sm mt-1">Upload high-quality photos and provide details to attract buyers or tenants.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-4 mb-6 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PHOTO UPLOADER */}
          <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-2">Property Photos</h3>
            <p className="text-zinc-450 text-[11px] mb-4">Upload actual photo files or pick high-quality preset photos below.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Thumbnail card */}
              <div className="border border-zinc-200 border-dashed rounded-lg p-5 bg-white text-center flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                {thumbnailUrl ? (
                  <>
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-zinc-950 text-white rounded-full p-1.5 text-xs transition"
                    >
                      <FaTimes />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    {thumbnailUploading ? (
                      <FaSpinner className="animate-spin text-zinc-450 text-2xl mb-2" />
                    ) : (
                      <FaUpload className="text-zinc-450 text-2xl mb-2" />
                    )}
                    <span className="text-xs font-semibold text-zinc-800">Upload Main Thumbnail</span>
                    <span className="text-[10px] text-zinc-400 mt-1">PNG, JPG up to 10MB</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "thumbnail")} className="hidden" />
                  </label>
                )}
              </div>

              {/* Additional images upload card */}
              <div className="border border-zinc-200 border-dashed rounded-lg p-5 bg-white text-center flex flex-col items-center justify-center min-h-[140px]">
                <label className="cursor-pointer flex flex-col items-center">
                  {imageUploading ? (
                    <FaSpinner className="animate-spin text-zinc-450 text-2xl mb-2" />
                  ) : (
                    <FaUpload className="text-zinc-450 text-2xl mb-2" />
                  )}
                  <span className="text-xs font-semibold text-zinc-800">Upload Additional Photo</span>
                  <span className="text-[10px] text-zinc-400 mt-1">Living rooms, kitchens, bedrooms</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "additional")} className="hidden" />
                </label>
              </div>
            </div>

            {/* Additional photos preview list */}
            {additionalImages.length > 0 && (
              <div className="mt-5 grid grid-cols-4 gap-3">
                {additionalImages.map((img, i) => (
                  <div key={i} className="h-16 relative rounded overflow-hidden border border-zinc-200 bg-zinc-100">
                    <img src={img.url} alt="Room preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 bg-zinc-900/90 text-white rounded-full p-1 text-[8px]"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Presets picker */}
            <div className="mt-6 border-t border-zinc-150 pt-4">
              <span className="text-[11px] font-bold text-zinc-550 uppercase tracking-wider block mb-2.5">Quick High-Quality Presets</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_PHOTOS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddPresetImage(p.url)}
                    className="flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-900 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition"
                  >
                    🏠 {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LISTING DETAILS */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Listing Title</label>
              <input
                type="text" name="title" value={formData.title} onChange={handleTextChange} required
                placeholder="e.g. 3BHK Premium Penthouse with Sea View"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Description / Details</label>
              <textarea
                name="description" value={formData.description} onChange={handleTextChange} rows={3}
                placeholder="Describe layout specifications, nearby landmarks, security, facilities, etc."
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Listing Mode</label>
              <select
                name="listing_type" value={formData.listing_type} onChange={handleTextChange}
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              >
                <option value="buy">Sell (For Sale)</option>
                <option value="rent">Rent (For Lease)</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Property Category</label>
              <select
                name="property_type" value={formData.property_type} onChange={handleTextChange}
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              >
                <option value="apartment">Apartment</option>
                <option value="villa">Villa / Independent House</option>
                <option value="plot">Plot / Land</option>
                <option value="commercial">Commercial Space</option>
                <option value="house">Row House</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Price Value (Raw number)</label>
              <input
                type="number" name="price" value={formData.price} onChange={handleTextChange} required
                placeholder="e.g. 7500000"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Price Label (User-friendly tag)</label>
              <input
                type="text" name="price_label" value={formData.price_label} onChange={handleTextChange}
                placeholder="e.g. ₹75 Lakhs or ₹35k/mo"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Bedrooms</label>
              <input
                type="number" name="bedrooms" value={formData.bedrooms} onChange={handleTextChange}
                placeholder="e.g. 3 (Leave empty for plot/land)"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Bathrooms</label>
              <input
                type="number" name="bathrooms" value={formData.bathrooms} onChange={handleTextChange}
                placeholder="e.g. 2"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Area Size (Square Feet)</label>
              <input
                type="number" name="area_sqft" value={formData.area_sqft} onChange={handleTextChange}
                placeholder="e.g. 1450"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">City</label>
              <input
                type="text" name="city" value={formData.city} onChange={handleTextChange} required
                placeholder="e.g. Mumbai"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Locality</label>
              <input
                type="text" name="locality" value={formData.locality} onChange={handleTextChange}
                placeholder="e.g. Bandra West"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Detailed Address</label>
              <input
                type="text" name="address" value={formData.address} onChange={handleTextChange}
                placeholder="e.g. 102, Blue Heights, Linking Road"
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold px-6 py-3 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-xs font-semibold px-6 py-3 rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Listing"
              )}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
