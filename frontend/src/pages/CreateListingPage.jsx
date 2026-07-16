import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUpload, FaSpinner, FaTimes, FaMapMarkerAlt, FaMagic } from "react-icons/fa";
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
    area_sqft: "",
    google_maps_link: "",
    has_parking: false
  });

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [bathroomUrl, setBathroomUrl] = useState("");
  const [hallUrl, setHallUrl] = useState("");
  const [kitchenUrl, setKitchenUrl] = useState("");
  const [parkingUrl, setParkingUrl] = useState("");
  const [additionalImages, setAdditionalImages] = useState([]); // [{ url: "", caption: "", order: 0 }]

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Uploading states
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [bathroomUploading, setBathroomUploading] = useState(false);
  const [hallUploading, setHallUploading] = useState(false);
  const [kitchenUploading, setKitchenUploading] = useState(false);
  const [parkingUploading, setParkingUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "true" ? true : value === "false" ? false : value
    }));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "thumbnail") setThumbnailUploading(true);
    else if (type === "bathroom") setBathroomUploading(true);
    else if (type === "hall") setHallUploading(true);
    else if (type === "kitchen") setKitchenUploading(true);
    else if (type === "parking") setParkingUploading(true);
    else setImageUploading(true);

    try {
      const response = await propertiesAPI.uploadImage(file);
      const url = response.url;

      if (type === "thumbnail") setThumbnailUrl(url);
      else if (type === "bathroom") setBathroomUrl(url);
      else if (type === "hall") setHallUrl(url);
      else if (type === "kitchen") setKitchenUrl(url);
      else if (type === "parking") setParkingUrl(url);
      else {
        setAdditionalImages((prev) => [
          ...prev,
          { url, caption: file.name.split(".")[0], order: prev.length }
        ]);
      }
    } catch (err) {
      console.error(err);
      setError("Image upload failed. Please try again.");
    } finally {
      if (type === "thumbnail") setThumbnailUploading(false);
      else if (type === "bathroom") setBathroomUploading(false);
      else if (type === "hall") setHallUploading(false);
      else if (type === "kitchen") setKitchenUploading(false);
      else if (type === "parking") setParkingUploading(false);
      else setImageUploading(false);
    }
  };

  const handleAddPresetImage = (url, type) => {
    if (type === "thumbnail") setThumbnailUrl(url);
    else if (type === "bathroom") setBathroomUrl(url);
    else if (type === "hall") setHallUrl(url);
    else if (type === "kitchen") setKitchenUrl(url);
    else if (type === "parking") setParkingUrl(url);
    else {
      setAdditionalImages((prev) => [
        ...prev,
        { url, caption: "Preset Image", order: prev.length }
      ]);
    }
  };

  const handleRemoveImage = (index) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAutoFill = () => {
    setThumbnailUrl("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80");
    setBathroomUrl("https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80");
    setHallUrl("https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80");
    setKitchenUrl("https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80");
    setParkingUrl("https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80");
    setFormData({
      title: "Luxury Modern Home with Parking & Premium Finish",
      description: "A gorgeous luxury modern home featuring high-end modular kitchen, designer bathrooms, spacious hall, and private parking. Located in a premium residential area.",
      price: "8500000",
      price_label: "₹85 Lakhs",
      city: "Mumbai",
      locality: "Bandra West",
      address: "302 Golden Heights, Bandra West",
      property_type: "villa",
      listing_type: "buy",
      bedrooms: "3",
      bathrooms: "3",
      area_sqft: "1650",
      google_maps_link: "https://maps.google.com/?q=Bandra+West+Mumbai",
      has_parking: true
    });
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
    if (!bathroomUrl) {
      setError("Please provide or upload a bathroom photo.");
      return;
    }
    if (!hallUrl) {
      setError("Please provide or upload a hall/living room photo.");
      return;
    }
    if (!kitchenUrl) {
      setError("Please provide or upload a kitchen photo.");
      return;
    }
    if (formData.has_parking && !parkingUrl) {
      setError("Please provide or upload a parking photo (since parking is enabled).");
      return;
    }
    if (!formData.google_maps_link) {
      setError("Please provide a Google Maps location link.");
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
      bathroom_image_url: bathroomUrl,
      hall_image_url: hallUrl,
      kitchen_image_url: kitchenUrl,
      has_parking: formData.has_parking,
      parking_image_url: formData.has_parking ? parkingUrl : null,
      google_maps_link: formData.google_maps_link,
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

  const renderUploadBox = (imageUrl, setImageUrl, uploading, label, type) => {
    return (
      <div className="border border-zinc-200 border-dashed rounded-lg p-5 bg-white text-center flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden transition hover:border-zinc-350">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={`${label} preview`} className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-zinc-950 text-white rounded-full p-1.5 text-xs transition z-10"
            >
              <FaTimes />
            </button>
            <span className="absolute bottom-2 left-2 bg-zinc-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm z-10 uppercase tracking-wider">
              {label}
            </span>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-4">
            {uploading ? (
              <FaSpinner className="animate-spin text-zinc-450 text-2xl mb-2" />
            ) : (
              <FaUpload className="text-zinc-450 text-2xl mb-2" />
            )}
            <span className="text-xs font-semibold text-zinc-800">{label}</span>
            <span className="text-[10px] text-zinc-400 mt-1">Upload Photo</span>
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, type)} className="hidden" />
          </label>
        )}
      </div>
    );
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">List Your Property</h1>
            <p className="text-zinc-550 text-sm mt-1">Upload mandatory photos of core areas and provide details to attract buyers.</p>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm"
          >
            <FaMagic /> Autofill Sample Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-4 mb-6 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PHOTO UPLOADER */}
          <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-2">Core Property Photos (Mandatory)</h3>
            <p className="text-zinc-450 text-[11px] mb-4">Upload actual photo files or pick high-quality preset photos below for the required sections.</p>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Thumbnail */}
              {renderUploadBox(thumbnailUrl, setThumbnailUrl, thumbnailUploading, "Exterior (Main)", "thumbnail")}

              {/* Bathroom */}
              {renderUploadBox(bathroomUrl, setBathroomUrl, bathroomUploading, "Bathroom", "bathroom")}

              {/* Hall */}
              {renderUploadBox(hallUrl, setHallUrl, hallUploading, "Living Room / Hall", "hall")}

              {/* Kitchen */}
              {renderUploadBox(kitchenUrl, setKitchenUrl, kitchenUploading, "Kitchen", "kitchen")}
            </div>

            {/* Dynamic Parking Image Upload */}
            {formData.has_parking && (
              <div className="border-t border-zinc-200 pt-5 mb-6">
                <h4 className="text-xs font-bold text-zinc-900 mb-2.5">Parking Area Photo (Mandatory when Parking is available)</h4>
                <div className="max-w-[220px]">
                  {renderUploadBox(parkingUrl, setParkingUrl, parkingUploading, "Parking Space", "parking")}
                </div>
              </div>
            )}

            {/* Presets picker */}
            <div className="border-t border-zinc-150 pt-4">
              <span className="text-[11px] font-bold text-zinc-550 uppercase tracking-wider block mb-2.5">Quick High-Quality Presets</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_PHOTOS.map((p, i) => (
                  <div key={i} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddPresetImage(p.url, "thumbnail")}
                      className="bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-900 px-3 py-1.5 rounded-l-full text-[10px] font-medium shadow-sm transition"
                    >
                      📷 {p.label} (Main)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetImage(p.url, "hall")}
                      className="bg-white border-y border-r border-zinc-200 text-zinc-700 hover:border-zinc-900 px-2 py-1.5 text-[10px] font-medium shadow-sm transition"
                    >
                      Hall
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetImage(p.url, "kitchen")}
                      className="bg-white border-y border-r border-zinc-200 text-zinc-700 hover:border-zinc-900 px-2 py-1.5 text-[10px] font-medium shadow-sm transition"
                    >
                      Kitchen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetImage(p.url, "bathroom")}
                      className="bg-white border-y border-r border-zinc-200 text-zinc-700 hover:border-zinc-900 px-2 py-1.5 text-[10px] font-medium shadow-sm transition"
                    >
                      Bath
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetImage(p.url, "parking")}
                      className="bg-white border-y border-r border-zinc-200 text-zinc-700 hover:border-zinc-900 px-3 py-1.5 rounded-r-full text-[10px] font-medium shadow-sm transition"
                    >
                      Park
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ADDITIONAL PHOTOS (OPTIONAL) */}
          <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-1">More Photos (Optional)</h3>
            <p className="text-zinc-450 text-[11px] mb-4">Add extra views of balconies, bedrooms, garden, etc.</p>

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="border border-zinc-200 border-dashed rounded-lg p-5 bg-white text-center flex flex-col items-center justify-center min-h-[140px]">
                <label className="cursor-pointer flex flex-col items-center">
                  {imageUploading ? (
                    <FaSpinner className="animate-spin text-zinc-450 text-xl mb-2" />
                  ) : (
                    <FaUpload className="text-zinc-450 text-xl mb-2" />
                  )}
                  <span className="text-xs font-semibold text-zinc-800">Upload Photo</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "additional")} className="hidden" />
                </label>
              </div>

              {additionalImages.map((img, i) => (
                <div key={i} className="min-h-[140px] relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                  <img src={img.url} alt="Room preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-2 right-2 bg-zinc-900/90 text-white rounded-full p-1 text-[10px]"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
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
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block">Parking Space Available?</label>
              <select
                name="has_parking" value={formData.has_parking ? "true" : "false"} onChange={handleSelectChange}
                className="w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-zinc-400 bg-white font-medium"
              >
                <option value="false">No Parking Available</option>
                <option value="true">Yes, Parking Available (Photo Required)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-zinc-650 mb-1.5 block flex items-center gap-1">
                <FaMapMarkerAlt className="text-zinc-450" /> Google Maps Location Link
              </label>
              <input
                type="url" name="google_maps_link" value={formData.google_maps_link} onChange={handleTextChange} required
                placeholder="e.g. https://maps.app.goo.gl/..."
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

            <div className="col-span-2">
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
