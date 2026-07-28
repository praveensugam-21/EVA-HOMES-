import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt, FaCheckCircle, FaSpinner, FaCar, FaMap, FaPhoneAlt, FaWhatsapp, FaUserShield, FaTrash, FaExclamationTriangle, FaTimes, FaClock, FaHeart, FaRegHeart, FaCalendarPlus, FaHandHoldingUsd, FaLock, FaQrcode } from "react-icons/fa";
import { propertiesAPI, enquiriesAPI, savedPropertiesAPI, visitsAPI, offersAPI, unlocksAPI, settingsAPI, getErrorMessage } from "../api/api";
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

  // Buyer actions: save, visit request, offer
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitData, setVisitData] = useState({ requested_date: "", message: "" });
  const [visitStatus, setVisitStatus] = useState(""); // "success" | "error" | ""
  const [visitError, setVisitError] = useState("");
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerData, setOfferData] = useState({ amount: "", message: "" });
  const [offerStatus, setOfferStatus] = useState("");
  const [offerError, setOfferError] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Location + owner-phone unlock (paid, manually verified)
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [unlockRequest, setUnlockRequest] = useState(null); // this user's own request for this property, if any
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmittingUnlock, setIsSubmittingUnlock] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const refreshPropertyAndContact = async () => {
    const [data, contactData] = await Promise.all([
      propertiesAPI.getById(id),
      propertiesAPI.getContact(id),
    ]);
    setProperty(data);
    setContact(contactData);
    return data;
  };

  useEffect(() => {
    const loadProperty = async () => {
      setIsLoading(true);
      try {
        const data = await refreshPropertyAndContact();
        setActivePhoto(data.thumbnail_url);
      } catch (err) {
        if (err.response?.status === 404) navigate("/listings");
      } finally {
        setIsLoading(false);
      }
    };
    loadProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    settingsAPI.getPaymentInfo().then(setPaymentInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    unlocksAPI.mine().then((data) => {
      const mine = data.items.find((item) => item.property_id === Number(id));
      setUnlockRequest(mine || null);
    }).catch(() => {});
  }, [user, id]);

  const handleUnlockRequest = async (e) => {
    e.preventDefault();
    setIsSubmittingUnlock(true);
    setUnlockError("");
    try {
      const created = await propertiesAPI.requestUnlock(id, paymentReference.trim());
      setUnlockRequest(created);
    } catch (err) {
      setUnlockError(getErrorMessage(err, "Failed to submit — please try again."));
    } finally {
      setIsSubmittingUnlock(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    savedPropertiesAPI.list().then((data) => {
      setIsSaved(data.items.some((item) => item.property_id === Number(id)));
    }).catch(() => {});
  }, [user, id]);

  const handleToggleSave = async () => {
    setIsSaving(true);
    try {
      if (isSaved) {
        await savedPropertiesAPI.unsave(id);
        setIsSaved(false);
      } else {
        await savedPropertiesAPI.save(id);
        setIsSaved(true);
      }
    } catch {
      // best-effort — no dedicated error UI for this quick toggle
    } finally {
      setIsSaving(false);
    }
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingVisit(true);
    setVisitError("");
    try {
      await visitsAPI.create({
        property_id: Number(id),
        requested_date: new Date(visitData.requested_date).toISOString(),
        message: visitData.message || undefined,
      });
      setVisitStatus("success");
    } catch (err) {
      setVisitStatus("error");
      setVisitError(getErrorMessage(err, "Failed to request a visit."));
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingOffer(true);
    setOfferError("");
    try {
      await offersAPI.create({
        property_id: Number(id),
        amount: Number(offerData.amount),
        message: offerData.message || undefined,
      });
      setOfferStatus("success");
    } catch (err) {
      setOfferStatus("error");
      setOfferError(getErrorMessage(err, "Failed to submit your offer."));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

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
      setEnquiryError(getErrorMessage(err, "Unable to send the enquiry right now. Please check your details and try again."));
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
      setDeleteError(getErrorMessage(err, "Failed to delete listing."));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-ink text-3xl" />
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

  if (property.parking_type !== "none" && property.parking_image_url) {
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

  // Multiple photos can share a label (e.g. three "Kitchen" shots) — number
  // them ("Kitchen 1", "Kitchen 2"...) so each thumbnail reads as distinct
  // rather than looking like duplicates of the same photo.
  const labelCounts = {};
  galleryPhotos.forEach((photo) => {
    labelCounts[photo.label] = (labelCounts[photo.label] || 0) + 1;
  });
  const labelSeen = {};
  galleryPhotos.forEach((photo) => {
    if (labelCounts[photo.label] > 1) {
      labelSeen[photo.label] = (labelSeen[photo.label] || 0) + 1;
      photo.label = `${photo.label} ${labelSeen[photo.label]}/${labelCounts[photo.label]}`;
    }
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-ink">
            <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-faint hover:text-ink-soft transition">
              <FaTimes />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-ink">Delete Listing</h2>
            </div>
            <p className="text-sm text-ink-soft mb-1">Are you sure you want to permanently delete:</p>
            <p className="text-sm font-semibold text-ink mb-4">"{property.title}"</p>
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">
              This action is permanent. All photos and enquiries for this property will also be removed.
            </p>
            {deleteError && <p className="text-xs text-red-600 mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-line hover:border-ink text-ink-soft text-sm font-semibold py-2.5 rounded-lg transition">
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
            <span className="bg-ink text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded capitalize">
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
            <span className="text-faint text-xs capitalize bg-surface px-2 py-0.5 rounded">{property.property_type}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ink">{property.title}</h1>
            {user && !isOwner && (
              <button
                type="button"
                onClick={handleToggleSave}
                disabled={isSaving}
                className={`shrink-0 inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-lg border transition disabled:opacity-60 ${
                  isSaved ? "bg-red-50 border-red-200 text-red-600" : "border-line text-ink-soft hover:border-ink"
                }`}
              >
                {isSaved ? <FaHeart /> : <FaRegHeart />}
                {isSaved ? "Saved" : "Save"}
              </button>
            )}
          </div>
          <p className="text-muted text-sm flex items-center gap-1.5 mt-2">
            <FaMapMarkerAlt className="text-faint" />
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
              <div className="rounded-xl overflow-hidden h-80 md:h-[450px] bg-surface border-2 border-ink relative">
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
                      activePhoto === photo.url ? "border-ink scale-95 shadow-sm" : "border-line hover:border-ink"
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

            <div className="bg-white rounded-xl p-6 border-2 border-ink flex items-center justify-between">
              <div>
                <p className="text-xs text-faint font-semibold uppercase tracking-wider">Listing Price</p>
                <p className="text-3xl font-extrabold text-ink mt-1">{property.price_label || `₹${property.price.toLocaleString()}`}</p>
              </div>
              {property.listing_type === "rent" && <span className="text-muted text-sm bg-surface px-3 py-1 rounded">per month</span>}
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-ink">
              <h2 className="text-lg font-bold text-ink mb-4">Property Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms && (
                  <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                    <FaBed className="text-muted text-lg" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-faint">Bedrooms</p>
                      <p className="font-bold text-sm text-ink">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                    <FaBath className="text-muted text-lg" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-faint">Bathrooms</p>
                      <p className="font-bold text-sm text-ink">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.area_sqft && (
                  <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                    <FaRulerCombined className="text-muted text-lg" />
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-faint">Area</p>
                      <p className="font-bold text-sm text-ink">{property.area_sqft.toLocaleString()} sqft</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
                  <FaCar className="text-muted text-lg" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-faint">Parking</p>
                    <p className="font-bold text-sm text-ink capitalize">
                      {property.parking_type === "none" ? "Not Available" : `${property.parking_type} Parking`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {property.description && (
              <div className="bg-white rounded-xl p-6 border-2 border-ink">
                <h2 className="text-lg font-bold text-ink mb-3">About this Property</h2>
                <p className="text-ink-soft text-sm leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Embedded Live Google Maps Preview — exact location, paywalled */}
            {property.location_unlocked ? (
              <div className="bg-white rounded-xl p-6 border-2 border-ink space-y-4">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <FaMap className="text-muted" /> Location Map
                </h2>
                <div className="rounded-lg overflow-hidden h-72 border border-line-soft relative shadow-inner">
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
                    className="flex items-center gap-2 bg-ink hover:bg-accent-hover text-white text-xs font-semibold px-4.5 py-3 rounded-lg transition shadow-sm"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border-2 border-ink space-y-4">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <FaLock className="text-muted" /> Exact Location &amp; Owner's Number
                </h2>
                <p className="text-ink-soft text-sm">
                  Pay a one-time <span className="font-bold text-ink">₹{paymentInfo?.unlock_fee ?? 20}</span> to unlock
                  the exact map pin and the owner's real phone number for this listing.
                </p>

                {unlockRequest?.status === "pending" ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <FaClock /> Payment submitted — waiting on admin verification.
                  </div>
                ) : unlockRequest?.status === "rejected" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Your last payment couldn't be verified. Please try again below.
                  </div>
                ) : null}

                {(!unlockRequest || unlockRequest.status === "rejected") && (
                  <>
                    {paymentInfo?.payment_qr_image_url && (
                      <div className="flex justify-center">
                        <img
                          src={paymentInfo.payment_qr_image_url}
                          alt="Payment QR code"
                          className="w-40 h-40 object-contain border border-line-soft rounded-lg"
                        />
                      </div>
                    )}
                    {paymentInfo?.payment_phone && (
                      <p className="text-center text-sm text-ink-soft">
                        Pay via UPI to <span className="font-bold text-ink">{paymentInfo.payment_phone}</span>
                      </p>
                    )}

                    {user ? (
                      <form onSubmit={handleUnlockRequest} className="space-y-2.5">
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Transaction / UTR reference (optional, helps verification)"
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
                        />
                        {unlockError && <p className="text-xs text-red-600">{unlockError}</p>}
                        <button
                          type="submit"
                          disabled={isSubmittingUnlock}
                          className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-accent-hover text-white text-sm font-semibold py-3 rounded-lg transition disabled:opacity-60"
                        >
                          {isSubmittingUnlock ? <FaSpinner className="animate-spin" /> : <FaQrcode />}
                          I've Paid — Submit for Verification
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="w-full bg-ink hover:bg-accent-hover text-white text-sm font-semibold py-3 rounded-lg transition"
                      >
                        Log in to unlock
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border-2 border-ink sticky top-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-ink">Contact Broker</h3>
                  <p className="text-faint text-xs mt-1">Verified contact desk for this property</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-ink text-white flex items-center justify-center">
                  <FaUserShield />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-line-soft bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">Posted by</span>
                  <span className="font-semibold text-ink text-right">{contact?.owner_name || property.owner_name || "Verified owner"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">Owner phone</span>
                  {contact?.location_unlocked && contact?.owner_phone ? (
                    <a href={`tel:${contact.owner_phone}`} className="font-semibold text-ink hover:text-accent">
                      {contact.owner_phone}
                    </a>
                  ) : (
                    <span className="font-semibold text-ink">{contact?.owner_phone_masked || "Hidden"}</span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-muted pt-1">
                  Owner contact is protected. Buyers connect through the broker desk for visits and negotiation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <a
                  href={contact?.broker_phone ? `tel:${contact.broker_phone}` : undefined}
                  className="flex items-center justify-center gap-2 bg-ink hover:bg-accent-hover text-white text-xs font-semibold px-3 py-3 rounded-lg transition"
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

              {user && !isOwner && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => { setShowVisitForm((v) => !v); setShowOfferForm(false); }}
                    className="flex items-center justify-center gap-2 border border-line hover:border-ink text-ink-soft text-xs font-semibold px-3 py-3 rounded-lg transition"
                  >
                    <FaCalendarPlus /> Request Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowOfferForm((v) => !v); setShowVisitForm(false); }}
                    className="flex items-center justify-center gap-2 border border-line hover:border-ink text-ink-soft text-xs font-semibold px-3 py-3 rounded-lg transition"
                  >
                    <FaHandHoldingUsd /> Make Offer
                  </button>
                </div>
              )}

              {showVisitForm && (
                <div className="mt-4 rounded-lg border border-line p-4">
                  {visitStatus === "success" ? (
                    <p className="text-sm text-emerald-700 text-center">Visit requested! Track it under My Visits.</p>
                  ) : (
                    <form onSubmit={handleVisitSubmit} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted mb-1 block">Preferred date &amp; time</label>
                        <input
                          type="datetime-local"
                          required
                          value={visitData.requested_date}
                          onChange={(e) => setVisitData((p) => ({ ...p, requested_date: e.target.value }))}
                          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink bg-white"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Message (optional)"
                        value={visitData.message}
                        onChange={(e) => setVisitData((p) => ({ ...p, message: e.target.value }))}
                        className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none bg-white"
                      />
                      {visitStatus === "error" && <p className="text-red-500 text-xs">{visitError}</p>}
                      <button
                        type="submit"
                        disabled={isSubmittingVisit}
                        className="w-full bg-ink hover:bg-accent-hover text-white text-xs font-semibold py-2.5 rounded-lg transition"
                      >
                        {isSubmittingVisit ? "Submitting..." : "Request Visit"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {showOfferForm && (
                <div className="mt-4 rounded-lg border border-line p-4">
                  {offerStatus === "success" ? (
                    <p className="text-sm text-emerald-700 text-center">Offer submitted! Track it under My Offers.</p>
                  ) : (
                    <form onSubmit={handleOfferSubmit} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted mb-1 block">Your offer amount</label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          value={offerData.amount}
                          onChange={(e) => setOfferData((p) => ({ ...p, amount: e.target.value }))}
                          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink bg-white"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Message (optional)"
                        value={offerData.message}
                        onChange={(e) => setOfferData((p) => ({ ...p, message: e.target.value }))}
                        className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none bg-white"
                      />
                      {offerStatus === "error" && <p className="text-red-500 text-xs">{offerError}</p>}
                      <button
                        type="submit"
                        disabled={isSubmittingOffer}
                        className="w-full bg-ink hover:bg-accent-hover text-white text-xs font-semibold py-2.5 rounded-lg transition"
                      >
                        {isSubmittingOffer ? "Submitting..." : "Submit Offer"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="my-5 h-px bg-surface" />

              {enquiryStatus === "success" ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 text-center">
                  <FaCheckCircle className="text-emerald-600 text-3xl mx-auto mb-2" />
                  <p className="font-bold text-emerald-800 text-sm">Enquiry Sent</p>
                  <p className="text-emerald-600 text-xs mt-1">The broker desk will contact you shortly.</p>
                  <button
                    type="button"
                    onClick={() => setEnquiryStatus("")}
                    className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="space-y-4">
                  {[
                    { label: "Your Name", name: "name", type: "text" },
                    { label: "Email Address", name: "email", type: "email" },
                    { label: "Phone Number", name: "phone", type: "tel" },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className="text-xs font-semibold text-muted mb-1 block">{f.label}</label>
                      <input type={f.type} name={f.name} id={`enquiry-${f.name}`} value={enquiry[f.name]}
                        onChange={handleEnquiryChange} required={f.name !== "phone"}
                        placeholder={f.name === "phone" ? "Optional" : ""}
                        className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink bg-white" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-muted mb-1 block">Message</label>
                    <textarea name="message" id="enquiry-message" rows={3} value={enquiry.message}
                      onChange={handleEnquiryChange} required
                      placeholder="Tell us what you want to know about this property."
                      className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none bg-white" />
                  </div>
                  {enquiryStatus === "error" && (
                    <p className="text-red-500 text-xs">{enquiryError}</p>
                  )}
                  <button
                    type="submit"
                    id="enquiry-submit"
                    disabled={isSubmitting}
                    onClick={() => setEnquirySource("form")}
                    className="w-full bg-ink hover:bg-accent-hover text-white text-sm font-semibold py-3.5 rounded-lg transition flex items-center justify-center gap-2">
                    {isSubmitting ? <><FaSpinner className="animate-spin" /> Sending...</> : "Send Enquiry"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setEnquirySource("callback_request")}
                    className="w-full border border-line hover:border-ink text-ink text-sm font-semibold py-3.5 rounded-lg transition flex items-center justify-center gap-2"
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
