import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUpload, FaSpinner, FaTimes, FaMapMarkerAlt, FaClock, FaCheckCircle, FaBath, FaCouch, FaUtensils, FaCar, FaImage, FaCamera, FaPhoneAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { propertiesAPI, getErrorMessage } from "../api/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LocationPicker from "../components/LocationPicker";

export default function CreateListingPage() {
  const { isLoggedIn, user } = useAuth();
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
    parking_type: "none"
  });

  const [pinLocation, setPinLocation] = useState(null); // { lat, lng } from the map picker
  const [showManualLink, setShowManualLink] = useState(false);

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  // Every room supports multiple photos now — first one becomes that room's
  // required "hero" image on submit, the rest ride along as captioned extras.
  const [bathroomPhotos, setBathroomPhotos] = useState([]);
  const [hallPhotos, setHallPhotos] = useState([]);
  const [kitchenPhotos, setKitchenPhotos] = useState([]);
  const [parkingPhotos, setParkingPhotos] = useState([]);
  const [additionalImages, setAdditionalImages] = useState([]); // [{ url: "", caption: "", order: 0 }]

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedProperty, setSubmittedProperty] = useState(null); // set after successful submit

  // Uploading states
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [bathroomUploading, setBathroomUploading] = useState(false);
  const [hallUploading, setHallUploading] = useState(false);
  const [kitchenUploading, setKitchenUploading] = useState(false);
  const [parkingUploading, setParkingUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const ROOM_SETTERS = {
    bathroom: setBathroomPhotos,
    hall: setHallPhotos,
    kitchen: setKitchenPhotos,
    parking: setParkingPhotos,
  };
  const ROOM_PHOTOS = { bathroom: bathroomPhotos, hall: hallPhotos, kitchen: kitchenPhotos, parking: parkingPhotos };
  const MAX_ROOM_PHOTOS = 10;
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB, matches the backend cap

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
    let files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = ""; // allow re-selecting the same file(s) again later

    const oversized = files.filter((f) => f.size > MAX_UPLOAD_BYTES);
    files = files.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (oversized.length) {
      setError(`${oversized.length} photo${oversized.length > 1 ? "s were" : " was"} over 5MB and skipped: ${oversized.map((f) => f.name).join(", ")}`);
    }
    if (!files.length) return;

    const isRoom = type in ROOM_SETTERS;

    if (isRoom) {
      const remaining = MAX_ROOM_PHOTOS - ROOM_PHOTOS[type].length;
      if (remaining <= 0) {
        setError(`You've reached the ${MAX_ROOM_PHOTOS}-photo limit for this room. Remove one to add another.`);
        return;
      }
      if (files.length > remaining) {
        setError(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} allowed here (max ${MAX_ROOM_PHOTOS} per room) — uploading the first ${remaining}.`);
        files = files.slice(0, remaining);
      }
    }

    if (type === "thumbnail") setThumbnailUploading(true);
    else if (isRoom) {
      const setUploading = { bathroom: setBathroomUploading, hall: setHallUploading, kitchen: setKitchenUploading, parking: setParkingUploading }[type];
      setUploading(true);
    } else setImageUploading(true);

    try {
      // Thumbnail only ever takes one photo; every room takes as many as selected.
      const uploads = type === "thumbnail" ? [files[0]] : files;
      const results = await Promise.all(uploads.map((file) => propertiesAPI.uploadImage(file)));
      const urls = results.map((r) => r.url);

      if (type === "thumbnail") setThumbnailUrl(urls[0]);
      else if (isRoom) ROOM_SETTERS[type]((prev) => [...prev, ...urls]);
      else {
        setAdditionalImages((prev) => [
          ...prev,
          ...urls.map((url, i) => ({ url, caption: files[i].name.split(".")[0], order: prev.length + i })),
        ]);
      }
    } catch (err) {
      console.error(err);
      setError("Image upload failed. Please try again.");
    } finally {
      if (type === "thumbnail") setThumbnailUploading(false);
      else if (isRoom) {
        const setUploading = { bathroom: setBathroomUploading, hall: setHallUploading, kitchen: setKitchenUploading, parking: setParkingUploading }[type];
        setUploading(false);
      } else setImageUploading(false);
    }
  };

  const handleRemoveRoomPhoto = (type, index) => {
    ROOM_SETTERS[type]((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveImage = (index) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
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
    if (bathroomPhotos.length === 0) {
      setError("Please provide or upload at least one bathroom photo.");
      return;
    }
    if (hallPhotos.length === 0) {
      setError("Please provide or upload at least one hall/living room photo.");
      return;
    }
    if (kitchenPhotos.length === 0) {
      setError("Please provide or upload at least one kitchen photo.");
      return;
    }
    if (formData.parking_type !== "none" && parkingPhotos.length === 0) {
      setError("Please provide or upload at least one parking photo (since a parking type is selected).");
      return;
    }
    if (!formData.google_maps_link) {
      setError("Please pin the property's location on the map (or paste a Google Maps link).");
      return;
    }

    setIsSubmitting(true);

    // Each room's first photo is the required "hero" column; any extra
    // photos for that room ride along as captioned entries in `images`,
    // alongside whatever was added in the uncategorized "More Photos" section.
    const extraRoomPhotos = [
      ...bathroomPhotos.slice(1).map((url) => ({ url, caption: "Bathroom" })),
      ...hallPhotos.slice(1).map((url) => ({ url, caption: "Hall" })),
      ...kitchenPhotos.slice(1).map((url) => ({ url, caption: "Kitchen" })),
      ...(formData.parking_type !== "none" ? parkingPhotos.slice(1).map((url) => ({ url, caption: "Parking" })) : []),
    ];
    const allExtraImages = [
      ...extraRoomPhotos,
      ...additionalImages.map((img) => ({ url: img.url, caption: img.caption || "" })),
    ];

    // Build payload matching PropertyCreate Pydantic schema
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
      thumbnail_url: thumbnailUrl,
      bathroom_image_url: bathroomPhotos[0],
      hall_image_url: hallPhotos[0],
      kitchen_image_url: kitchenPhotos[0],
      parking_type: formData.parking_type,
      parking_image_url: formData.parking_type !== "none" ? parkingPhotos[0] : null,
      google_maps_link: formData.google_maps_link,
      latitude: pinLocation?.lat ?? null,
      longitude: pinLocation?.lng ?? null,
      images: allExtraImages.map((img, index) => ({ ...img, order: index })),
    };

    try {
      const newProperty = await propertiesAPI.create(payload);
      setSubmittedProperty(newProperty);
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to create listing. Please verify input fields.");
      setError(Array.isArray(msg) ? "Validation Error. Check form fields." : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUploadBox = (imageUrl, setImageUrl, uploading, label, type) => {
    return (
      <div className="group relative rounded-xl overflow-hidden h-40 border-2 border-dashed border-line bg-surface transition hover:border-ink">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={`${label} preview`} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 bg-white text-ink rounded-full p-2 text-xs shadow-md opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"
            >
              <FaTimes />
            </button>
            <span className="absolute bottom-2 left-2 bg-white/95 text-ink text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
              {label}
            </span>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-4">
            <div className="w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center mb-2.5 group-hover:bg-ink group-hover:text-white text-accent transition-colors">
              {uploading ? <FaSpinner className="animate-spin text-lg" /> : <FaCamera className="text-lg" />}
            </div>
            <span className="text-xs font-bold text-ink">{label}</span>
            <span className="text-[10px] text-muted mt-0.5">Click to upload</span>
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, type)} className="hidden" />
          </label>
        )}
      </div>
    );
  };

  const ROOM_ICONS = { bathroom: FaBath, hall: FaCouch, kitchen: FaUtensils, parking: FaCar };

  // Multi-photo room uploader: a row of already-uploaded thumbnails (each
  // removable) plus one "add more" tile. First photo becomes that room's
  // required hero image on submit; the rest ride along as captioned extras.
  const renderRoomGallery = (photos, uploading, label, type) => {
    const RoomIcon = ROOM_ICONS[type];
    return (
      <div className="bg-white border border-line-soft rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <RoomIcon className="text-xs" />
          </div>
          <p className="text-sm font-bold text-ink">{label}</p>
          {photos.length > 0 && (
            <span className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full ml-auto">
              {photos.length} photo{photos.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {photos.map((url, index) => (
            <div key={url + index} className="group relative rounded-lg overflow-hidden h-24 border border-line">
              <img src={url} alt={`${label} ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 bg-white/95 text-ink text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemoveRoomPhoto(type, index)}
                className="absolute top-1 right-1 bg-white text-ink rounded-full p-1.5 text-[10px] shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"
              >
                <FaTimes />
              </button>
            </div>
          ))}

          <label className="group cursor-pointer flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-line hover:border-ink bg-surface hover:bg-accent-soft transition-colors">
            {uploading ? (
              <FaSpinner className="animate-spin text-muted text-base" />
            ) : (
              <>
                <FaUpload className="text-muted group-hover:text-accent text-base mb-1 transition-colors" />
                <span className="text-[10px] font-bold text-ink-soft">{photos.length ? "Add more" : "Upload"}</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e, type)}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  };

  // ── Success screen shown after submission ────────────────────────────────
  if (submittedProperty) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 pb-16 max-w-lg mx-auto px-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
            <FaClock className="text-amber-600 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Listing Submitted for Review</h1>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Your property <span className="font-semibold text-ink">"{submittedProperty.title}"</span> has been
            submitted successfully. It will be visible in public search results once an admin approves it.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-left w-full mb-6">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">What happens next?</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                  <li>Admin will review your listing details and photos</li>
                  <li>Once approved, it will go live and appear in search results</li>
                  <li>If rejected, you will see a notice when viewing your listing</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate(`/properties/${submittedProperty.id}`)}
              className="flex-1 bg-ink hover:bg-accent-hover text-white text-sm font-semibold py-3 rounded-lg transition"
            >
              View My Listing
            </button>
            <button
              onClick={() => navigate("/listings")}
              className="flex-1 border border-line hover:border-ink text-ink-soft text-sm font-semibold py-3 rounded-lg transition"
            >
              Browse Listings
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <FaHome className="text-faint text-5xl mb-4" />
        <h2 className="text-xl font-bold text-ink">Sign in to list property</h2>
        <p className="text-muted text-xs mt-1 max-w-xs">You must be logged in as an agent or seller to add new real estate properties.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-5 bg-ink text-white text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-accent-hover transition"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (!user?.phone) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <FaPhoneAlt className="text-faint text-5xl mb-4" />
        <h2 className="text-xl font-bold text-ink">Add a phone number first</h2>
        <p className="text-muted text-xs mt-1 max-w-xs">
          Buyers need a way to reach you — add a phone number to your profile before listing a property.
        </p>
        <button
          onClick={() => navigate("/dashboard/profile")}
          className="mt-5 bg-ink text-white text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-accent-hover transition"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  // Soft check only — a seller might legitimately be near an area whose
  // name doesn't literally appear in the reverse-geocoded address, so this
  // just surfaces a warning, it never blocks submission.
  const cityMismatch =
    pinLocation?.address &&
    formData.city.trim().length > 1 &&
    !pinLocation.address.toLowerCase().includes(formData.city.trim().toLowerCase());

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">List Your Property</h1>
          <p className="text-muted text-sm mt-1">Upload mandatory photos of core areas and provide details to attract buyers.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-4 mb-6 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PHOTO UPLOADER */}
          <div className="bg-surface border-2 border-ink rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-ink text-white flex items-center justify-center shrink-0">
                <FaCamera className="text-xs" />
              </div>
              <h3 className="text-sm font-bold text-ink">Core Property Photos</h3>
              <span className="text-[10px] font-bold text-white bg-ink px-2 py-0.5 rounded-full">Mandatory</span>
            </div>
            <p className="text-muted text-[11px] mb-5 ml-9">
              Upload one exterior photo, plus as many bathroom/hall/kitchen photos as you like — the first one in
              each room becomes its main photo.
            </p>

            <div className="max-w-[220px] mb-6">
              {renderUploadBox(thumbnailUrl, setThumbnailUrl, thumbnailUploading, "Exterior (Main)", "thumbnail")}
            </div>

            <div className="space-y-5">
              {renderRoomGallery(bathroomPhotos, bathroomUploading, "Bathroom", "bathroom")}
              {renderRoomGallery(hallPhotos, hallUploading, "Living Room / Hall", "hall")}
              {renderRoomGallery(kitchenPhotos, kitchenUploading, "Kitchen", "kitchen")}
            </div>

            {/* Dynamic Parking Image Upload */}
            {formData.parking_type !== "none" && (
              <div className="border-t border-line pt-5 mt-5">
                {renderRoomGallery(parkingPhotos, parkingUploading, "Parking", "parking")}
              </div>
            )}

          </div>

          {/* ADDITIONAL PHOTOS (OPTIONAL) */}
          <div className="bg-surface border-2 border-ink rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <FaImage className="text-xs" />
              </div>
              <h3 className="text-sm font-bold text-ink">More Photos</h3>
              <span className="text-[10px] font-bold text-muted bg-white px-2 py-0.5 rounded-full">Optional</span>
            </div>
            <p className="text-muted text-[11px] mb-4 ml-9">Add extra views of balconies, bedrooms, garden, etc.</p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {additionalImages.map((img, i) => (
                <div key={i} className="group relative rounded-lg overflow-hidden h-24 border border-line bg-white">
                  <img src={img.url} alt="Extra property photo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 bg-white text-ink rounded-full p-1.5 text-[10px] shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}

              <label className="group cursor-pointer flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-line hover:border-ink bg-white hover:bg-accent-soft transition-colors">
                {imageUploading ? (
                  <FaSpinner className="animate-spin text-muted text-base" />
                ) : (
                  <>
                    <FaUpload className="text-muted group-hover:text-accent text-base mb-1 transition-colors" />
                    <span className="text-[10px] font-bold text-ink-soft">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, "additional")} className="hidden" />
              </label>
            </div>
          </div>

          {/* LISTING DETAILS */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Listing Title</label>
              <input
                type="text" name="title" value={formData.title} onChange={handleTextChange} required
                placeholder="e.g. 3BHK Premium Penthouse with Sea View"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Description / Details</label>
              <textarea
                name="description" value={formData.description} onChange={handleTextChange} rows={3}
                placeholder="Describe layout specifications, nearby landmarks, security, facilities, etc."
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Listing Mode</label>
              <select
                name="listing_type" value={formData.listing_type} onChange={handleTextChange}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              >
                <option value="buy">Sell (For Sale)</option>
                <option value="rent">Rent (For Lease)</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Property Category</label>
              <select
                name="property_type" value={formData.property_type} onChange={handleTextChange}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              >
                <option value="apartment">Apartment</option>
                <option value="villa">Villa / Independent House</option>
                <option value="plot">Plot / Land</option>
                <option value="commercial">Commercial Space</option>
                <option value="house">Row House</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Price Value (Raw number)</label>
              <input
                type="number" name="price" value={formData.price} onChange={handleTextChange} required
                placeholder="e.g. 7500000"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Price Label (User-friendly tag)</label>
              <input
                type="text" name="price_label" value={formData.price_label} onChange={handleTextChange}
                placeholder="e.g. ₹75 Lakhs or ₹35k/mo" maxLength={20}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
              <p className="text-[11px] text-faint mt-1">
                A short tag shown instead of the price above — not the price itself. Leave blank to just show the number.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Bedrooms</label>
              <input
                type="number" name="bedrooms" value={formData.bedrooms} onChange={handleTextChange}
                placeholder="e.g. 3 (Leave empty for plot/land)"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Bathrooms</label>
              <input
                type="number" name="bathrooms" value={formData.bathrooms} onChange={handleTextChange}
                placeholder="e.g. 2"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Area Size (Square Feet)</label>
              <input
                type="number" name="area_sqft" value={formData.area_sqft} onChange={handleTextChange}
                placeholder="e.g. 1450"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Parking</label>
              <select
                name="parking_type" value={formData.parking_type} onChange={handleSelectChange}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white font-medium"
              >
                <option value="none">No Parking</option>
                <option value="open">Open Parking (Photo Required)</option>
                <option value="closed">Closed Parking (Photo Required)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1">
                <FaMapMarkerAlt className="text-muted" /> Exact Location
              </label>
              <LocationPicker
                value={pinLocation}
                onChange={(loc) => {
                  setPinLocation(loc);
                  setFormData((prev) => ({ ...prev, google_maps_link: loc.google_maps_link }));
                }}
              />

              <button
                type="button"
                onClick={() => setShowManualLink((prev) => !prev)}
                className="text-xs font-semibold text-muted hover:text-ink underline mt-2"
              >
                {showManualLink ? "Hide manual link entry" : "Have a Google Maps link already? Paste it instead"}
              </button>
              {showManualLink && (
                <input
                  type="url"
                  name="google_maps_link"
                  value={formData.google_maps_link}
                  onChange={handleTextChange}
                  placeholder="e.g. https://maps.app.goo.gl/..."
                  className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white mt-2"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">City</label>
              <input
                type="text" name="city" value={formData.city} onChange={handleTextChange} required
                placeholder="e.g. Mumbai"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
              {cityMismatch && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
                  ⚠ You pinned a location that doesn't seem to be in "{formData.city}" — double-check the map pin or the city name.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Locality</label>
              <input
                type="text" name="locality" value={formData.locality} onChange={handleTextChange}
                placeholder="e.g. Bandra West"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Detailed Address</label>
              <input
                type="text" name="address" value={formData.address} onChange={handleTextChange}
                placeholder="e.g. 102, Blue Heights, Linking Road"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-line-soft">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white border border-line hover:bg-surface text-ink-soft text-xs font-semibold px-6 py-3 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-ink hover:bg-accent-hover disabled:bg-ink-soft disabled:cursor-not-allowed text-white text-xs font-semibold px-6 py-3 rounded-lg transition flex items-center gap-1.5 shadow-sm"
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
