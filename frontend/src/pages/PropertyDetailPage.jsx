import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { propertiesAPI, enquiriesAPI } from "../api/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enquiry, setEnquiry] = useState({ name: "", email: "", phone: "", message: "I am interested in this property and would like to schedule a visit." });
  const [enquiryStatus, setEnquiryStatus] = useState(""); // "success" | "error" | ""
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      setIsLoading(true);
      try {
        const data = await propertiesAPI.getById(id);
        setProperty(data);
      } catch (err) {
        if (err.response?.status === 404) navigate("/listings");
      } finally {
        setIsLoading(false);
      }
    };
    loadProperty();
  }, [id, navigate]);

  const handleEnquiryChange = (e) => {
    setEnquiry((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await enquiriesAPI.submit({ ...enquiry, property_id: property.id });
      setEnquiryStatus("success");
    } catch {
      setEnquiryStatus("error");
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
            <div className="rounded-xl overflow-hidden h-80 md:h-[420px] bg-zinc-50 border border-zinc-100">
              <img
                src={property.thumbnail_url || `https://picsum.photos/800/500?random=${property.id}`}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            {property.images?.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {property.images.slice(0, 3).map((img) => (
                  <div key={img.id} className="rounded-lg overflow-hidden h-24 border border-zinc-100 bg-zinc-55">
                    <img src={img.url} alt={img.caption || "Property image"} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Listing Price</p>
                <p className="text-3xl font-extrabold text-zinc-900 mt-1">{property.price_label || `₹${property.price.toLocaleString()}`}</p>
              </div>
              {property.listing_type === "rent" && <span className="text-zinc-500 text-sm bg-zinc-50 px-3 py-1 rounded">per month</span>}
            </div>

            <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Property Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              </div>
            </div>

            {property.description && (
              <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-900 mb-3">About this Property</h2>
                <p className="text-zinc-650 text-sm leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-zinc-150 shadow-sm sticky top-24">
              <h3 className="text-base font-bold text-zinc-900">Contact Agent</h3>
              {property.owner_name && <p className="text-zinc-400 text-xs mt-1 mb-4">Listed by: {property.owner_name}</p>}

              {enquiryStatus === "success" ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 text-center">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="font-bold text-emerald-800 text-sm">Enquiry Sent!</p>
                  <p className="text-emerald-600 text-xs mt-1">The owner/agent will contact you shortly.</p>
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
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 bg-white" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 mb-1 block">Message</label>
                    <textarea name="message" id="enquiry-message" rows={3} value={enquiry.message}
                      onChange={handleEnquiryChange} required
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 resize-none bg-white" />
                  </div>
                  {enquiryStatus === "error" && (
                    <p className="text-red-500 text-xs">Failed to send enquiry. Please try again.</p>
                  )}
                  <button type="submit" id="enquiry-submit" disabled={isSubmitting}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold py-3.5 rounded-lg transition flex items-center justify-center gap-2">
                    {isSubmitting ? <><FaSpinner className="animate-spin" /> Sending...</> : "Send Enquiry"}
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
