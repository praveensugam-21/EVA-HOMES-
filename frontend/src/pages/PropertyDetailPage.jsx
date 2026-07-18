import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt, FaCheckCircle, FaSpinner, FaCar, FaMap, FaPhoneAlt, FaWhatsapp, FaUserShield } from "react-icons/fa";
import { propertiesAPI, enquiriesAPI } from "../api/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState("");
  const [enquiry, setEnquiry] = useState({ name: "", email: "", phone: "", message: "" });
  const [enquirySource, setEnquirySource] = useState("form");
  const [enquiryStatus, setEnquiryStatus] = useState(""); // "success" | "error" | ""
  const [enquiryError, setEnquiryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-zinc-900 text-3xl" />
      </div>
    );
  }

  if (!property) return null;

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
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-6">
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
            <span className="text-zinc-400 text-xs capitalize bg-zinc-50 px-2 py-0.5 rounded">{property.property_type}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">{property.title}</h1>
          <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-2">
            <FaMapMarkerAlt className="text-zinc-400" />
            {property.locality ? `${property.locality}, ` : ""}{property.city}
          </p>
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
