import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt, FaCheckCircle, FaSpinner, FaCar, FaMap, FaPhoneAlt, FaWhatsapp, FaUserShield, FaTrash, FaExclamationTriangle, FaTimes, FaClock } from "react-icons/fa";
import { propertiesAPI, enquiriesAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState("");
  const [enquiry, setEnquiry] = useState({ name: "", email: "", phone: "", message: "" });
  const [enquirySource, setEnquirySource] = useState("form");
  const [enquiryStatus, setEnquiryStatus] = useState(""); // "success" | "error" | ""
  const [enquiryError, setEnquiryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const loadProperty = async () => {
      setIsLoading(true);
      try {
        const [data, contactData] = await Promise.all([
          propertiesAPI.getById(id),
          propertiesAPI.getContact(id),
        ]);
        setProperty(data);
        setContact(contactData);
        setActivePhoto(data.thumbnail_url);
      } catch (err) {
        if (err.response?.status === 404) navigate("/listings");
      } finally {
        setIsLoading(false);
      }
    };
    loadProperty();
  }, [id, navigate]);

  const handleEnquiryChange = (e) => {
    setEnquiryStatus("");
    setEnquiryError("");
    setEnquiry((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquiryError("");
    setIsSubmitting(true);
    try {
      await enquiriesAPI.submit({ ...enquiry, property_id: property.id, source: enquirySource });
      setEnquiryStatus("success");
      setEnquiry({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setEnquiryStatus("error");
      const detail = err.response?.data?.detail;
      setEnquiryError(Array.isArray(detail) ? "Please correct the highlighted enquiry details and try again." : detail || "Unable to send the enquiry right now. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await propertiesAPI.delete(id);
      navigate("/listings");
    } catch (err) {
      setDeleteError(err.response?.data?.detail || "Failed to delete listing.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-zinc-900 text-3xl" />
      </div>
    );
  }

  if (!property) return null;

  const isOwner = user && property.owner_id === user.id;
  const isAdmin = user?.is_admin;
  const canDelete = isOwner || isAdmin;
  const isPending = property.status === "pending";
  const isRejected = property.status === "rejected";

  // Build the list of photos for the gallery picker
  const galleryPhotos = [
    { url: property.thumbnail_url, label: "Exterior (Main)" },
    { url: property.hall_image_url, label: "Living / Hall" },
    { url: property.kitchen_image_url, label: "Kitchen" },
    { url: property.bathroom_image_url, label: "Bathroom" }
  ];

  if (property.has_parking && property.parking_image_url) {
    galleryPhotos.push({ url: property.parking_image_url, label: "Parking" });
  }

  if (property.images?.length > 0) {
    property.images.forEach((img, i) => {
      galleryPhotos.push({
        url: img.url,
        label: img.caption || `View ${i + 1}`
      });
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200">
            <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition">
              <FaTimes />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">Delete Listing</h2>
            </div>
            <p className="text-sm text-zinc-600 mb-1">Are you sure you want to permanently delete:</p>
            <p className="text-sm font-semibold text-zinc-900 mb-4">"{property.title}"</p>
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">
              This action is permanent. All photos and enquiries for this property will also be removed.
            </p>
            {deleteError && <p className="text-xs text-red-600 mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-semibold py-2.5 rounded-lg transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
                {isDeleting ? <><FaSpinner className="animate-spin" /> Deleting...</> : <><FaTrash className="text-xs" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        {/* Pending / Rejected banner for owner */}
        {(isPending || isRejected) && (isOwner || isAdmin) && (
          <div className={`mb-5 rounded-xl border px-5 py-4 flex items-start gap-3 ${
            isPending ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
          }`}>
            {isPending ? (
              <FaClock className="text-amber-500 text-lg shrink-0 mt-0.5" />
            ) : (
              <FaExclamationTriangle className="text-red-500 text-lg shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-bold ${ isPending ? "text-amber-800" : "text-red-800" }`}>
                {isPending ? "Awaiting Admin Approval" : "Listing Rejected"}
              </p>
              <p className={`text-xs mt-0.5 ${ isPending ? "text-amber-700" : "text-red-700" }`}>
                {isPending
                  ? "Your listing has been submitted and is under review. It will appear in public search results once approved."
                  : "This listing was not approved. Please contact the admin for more information or delete and re-submit."}
              </p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-zinc-900 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded capitalize">
              {property.listing_type}
            </span>
            {property.is_verified && (
              <span className="bg-emerald-600/10 text-emerald-700 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1">
                <FaCheckCircle className="text-[10px]" /> VERIFIED
              </span>
            )}
            {isPending && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded">
                PENDING REVIEW
              </span>
            )}
            {isRejected && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded">
                REJECTED
              </span>
            )}
            <span className="text-zinc-400 text-xs capitalize bg-zinc-50 px-2 py-0.5 rounded">{property.property_type}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">{property.title}</h1>
          <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-2">
            <FaMapMarkerAlt className="text-zinc-400" />
            {property.locality ? `${property.locality}, ` : ""}{property.city}
          </p>
          {/* Owner / Admin delete button */}
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition"
            >
              <FaTrash className="text-[10px]" />
              Delete this Listing
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Interactive Main Photo Gallery */}
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden h-80 md:h-[450px] bg-zinc-50 border border-zinc-150 relative shadow-sm">
                <img
                  src={activePhoto || property.thumbnail_url}
                  alt={property.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>

              {/* Thumbnail List */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {galleryPhotos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(photo.url)}
                    className={`rounded-lg overflow-hidden h-20 border-2 transition relative ${
                      activePhoto === photo.url ? "border-zinc-900 scale-95 shadow-sm" : "border-zinc-200 hover:border-zinc-450"
                    }`}
                  >
                    <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-medium py-0.5 text-center truncate px-1">
                      {photo.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Listing Price</p>
                <p className="text-3xl font-extrabold text-zinc-900 mt-1">{property.price_label || `₹${property.price.toLocaleString()}`}</p>
              </div>
              {property.listing_type === "rent" && <span className="text-zinc-500 text-sm bg-zinc-50 px-3 py-1 rounded">per month</span>}
            </div>

            <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Property Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms && (
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg">
                    <FaBed className="text-zinc-550 text-lg" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Bedrooms</p>
                      <p className="font-bold text-sm text-zinc-900">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg">
                    <FaBath className="text-zinc-550 text-lg" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Bathrooms</p>
                      <p className="font-bold text-sm text-zinc-900">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.area_sqft && (
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg">
                    <FaRulerCombined className="text-zinc-550 text-lg" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Area</p>
                      <p className="font-bold text-sm text-zinc-900">{property.area_sqft.toLocaleString()} sqft</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg">
                  <FaCar className="text-zinc-550 text-lg" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Parking</p>
                    <p className="font-bold text-sm text-zinc-900">{property.has_parking ? "Available" : "Not Available"}</p>
                  </div>
                </div>
              </div>
            </div>

            {property.description && (
              <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-900 mb-3">About this Property</h2>
                <p className="text-zinc-650 text-sm leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Embedded Live Google Maps Preview */}
            {property.google_maps_link && (
              <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <FaMap className="text-zinc-550" /> Location Map
                </h2>
                <div className="rounded-lg overflow-hidden h-72 border border-zinc-150 relative shadow-inner">
                  <iframe
                    title="Property Location Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      (property.locality ? property.locality + ", " : "") + property.city
                    )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    allowFullScreen
                  />
                </div>
                <div className="flex justify-end">
                  <a
                    href={property.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4.5 py-3 rounded-lg transition shadow-sm"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-zinc-150 shadow-sm sticky top-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Contact Broker</h3>
                  <p className="text-zinc-400 text-xs mt-1">Verified contact desk for this property</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <FaUserShield />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">Posted by</span>
                  <span className="font-semibold text-zinc-900 text-right">{contact?.owner_name || property.owner_name || "Verified owner"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">Owner phone</span>
                  <span className="font-semibold text-zinc-900">{contact?.owner_phone_masked || "Hidden"}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500 pt-1">
                  Owner contact is protected. Buyers connect through the broker desk for visits and negotiation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <a
                  href={contact?.broker_phone ? `tel:${contact.broker_phone}` : undefined}
                  className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-3 rounded-lg transition"
                >
                  <FaPhoneAlt /> Call
                </a>
                <a
                  href={contact?.whatsapp_link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-3 rounded-lg transition"
                >
                  <FaWhatsapp /> WhatsApp
                </a>
              </div>

              <div className="my-5 h-px bg-zinc-100" />

              {enquiryStatus === "success" ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 text-center">
                  <FaCheckCircle className="text-emerald-600 text-3xl mx-auto mb-2" />
                  <p className="font-bold text-emerald-800 text-sm">Enquiry Sent</p>
                  <p className="text-emerald-600 text-xs mt-1">The broker desk will contact you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="space-y-4">
                  {[
                    { label: "Your Name", name: "name", type: "text" },
                    { label: "Email Address", name: "email", type: "email" },
                    { label: "Phone Number", name: "phone", type: "tel" },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className="text-xs font-semibold text-zinc-500 mb-1 block">{f.label}</label>
                      <input type={f.type} name={f.name} id={`enquiry-${f.name}`} value={enquiry[f.name]}
                        onChange={handleEnquiryChange} required={f.name !== "phone"}
                        placeholder={f.name === "phone" ? "Optional" : ""}
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 mb-1 block">Message</label>
                    <textarea name="message" id="enquiry-message" rows={3} value={enquiry.message}
                      onChange={handleEnquiryChange} required
                      placeholder="Tell us what you want to know about this property."
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 resize-none bg-white" />
                  </div>
                  {enquiryStatus === "error" && (
                    <p className="text-red-500 text-xs">{enquiryError}</p>
                  )}
                  <button
                    type="submit"
                    id="enquiry-submit"
                    disabled={isSubmitting}
                    onClick={() => setEnquirySource("form")}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold py-3.5 rounded-lg transition flex items-center justify-center gap-2">
                    {isSubmitting ? <><FaSpinner className="animate-spin" /> Sending...</> : "Send Enquiry"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setEnquirySource("callback_request")}
                    className="w-full border border-zinc-200 hover:border-zinc-400 text-zinc-800 text-sm font-semibold py-3.5 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    Request Owner Callback
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
