// ============================================================
// src/api/api.js — Axios API Client
// ============================================================
// This file is the SINGLE place where all API calls are defined.
//
// WHY CENTRALIZE API CALLS?
// - If the backend URL changes, we change it in ONE place
// - All requests automatically get the auth token attached
// - Error handling is consistent across the whole app
// - Easy to mock for testing
//
// HOW IT WORKS:
// 1. We create an "axios instance" with our base URL
// 2. We add a "request interceptor" that auto-attaches the JWT token
// 3. We add a "response interceptor" that handles 401 errors globally
// 4. We export clean functions like: getProperties(), login(), etc.
// ============================================================

import axios from "axios";

// ============================================================
// ERROR MESSAGE HELPER
// ============================================================
// FastAPI error responses aren't always a plain string in `detail`:
// - App-raised HTTPExceptions → detail is a string.
// - Pydantic validation errors (422) → detail is an ARRAY of
//   { msg, loc, ... } objects. Rendering that array directly as a
//   React child crashes the component (blank page), so every catch
//   block should go through this helper instead of reading
//   `err.response?.data?.detail` directly.
export function getErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join(" ");
  }
  return fallback;
}

// The base URL of our FastAPI backend
// In development: http://localhost:8000
// In production: set VITE_API_BASE_URL env variable (e.g. https://your-backend.onrender.com)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";


// ---- CREATE AXIOS INSTANCE ----
// Instead of using axios directly, we create a configured instance.
// This lets us set default settings for ALL requests.
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- REQUEST INTERCEPTOR ----
// Runs BEFORE every request is sent.
// Automatically attaches the stored JWT token to the Authorization header.
//
// Flow: Your code calls api.get('/api/properties')
//       ↓ interceptor runs ↓
//       Header added: Authorization: Bearer eyJhbGci...
//       ↓ request actually sent ↓
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage (where we store it after login)
    const token = localStorage.getItem("eva_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- RESPONSE INTERCEPTOR ----
// Runs AFTER every response is received.
// If we get a 401 (Unauthorized), the token expired → force logout.
api.interceptors.response.use(
  (response) => response, // success — just pass through
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem("eva_token");
      localStorage.removeItem("eva_user");
      // Only redirect if not already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH API FUNCTIONS
// ============================================================

export const authAPI = {
  /**
   * Register a new user
   * @param {Object} userData - { full_name, email, password, phone }
   * @returns {Object} User object
   */
  register: async (userData) => {
    const response = await api.post("/api/auth/register", userData);
    return response.data;
  },

  /**
   * Login with email + password
   * @param {string} email
   * @param {string} password
   * @returns {Object} { access_token, token_type }
   */
  login: async (email, password) => {
    const response = await api.post("/api/auth/login", { email, password });
    return response.data;
  },

  /**
   * Sign in (or sign up) with the ID token from Google's "Sign in with Google" button
   * @param {string} credential
   * @returns {Object} { access_token, token_type }
   */
  google: async (credential) => {
    const response = await api.post("/api/auth/google", { credential });
    return response.data;
  },

  /**
   * Get the currently logged-in user's profile
   * (requires valid token in localStorage)
   */
  getMyProfile: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  /**
   * Get all users for admin management.
   */
  listUsers: async (params = {}) => {
    const response = await api.get("/api/auth/users", { params });
    return response.data;
  },

  /**
   * Update a user's admin or active status.
   */
  updateUser: async (id, data) => {
    const response = await api.put(`/api/auth/users/${id}`, data);
    return response.data;
  },

  /**
   * Update the logged-in user's own profile.
   * @param {Object} data - { full_name, phone, address, city, bio, avatar_url }
   */
  updateMyProfile: async (data) => {
    const response = await api.put("/api/auth/me", data);
    return response.data;
  },

  /**
   * Activate a seller profile on the current account (no separate account needed).
   * @param {Object} data - { business_name }
   */
  createMySellerProfile: async (data = {}) => {
    const response = await api.post("/api/auth/me/seller-profile", data);
    return response.data;
  },

  /**
   * Update the current account's seller profile (e.g. business name).
   */
  updateMySellerProfile: async (data) => {
    const response = await api.put("/api/auth/me/seller-profile", data);
    return response.data;
  },

  /**
   * List the logged-in seller's uploaded verification documents.
   */
  getMySellerDocuments: async () => {
    const response = await api.get("/api/auth/me/seller-documents");
    return response.data;
  },

  /**
   * Upload a seller verification document (seller accounts only).
   * @param {string} docType - e.g. "id_proof", "address_proof", "business_license"
   * @param {File} file
   */
  uploadSellerDocument: async (docType, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/auth/me/seller-documents", formData, {
      params: { doc_type: docType },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * View a seller's uploaded verification documents (admin only).
   */
  getSellerDocuments: async (userId) => {
    const response = await api.get(`/api/auth/users/${userId}/seller-documents`);
    return response.data;
  },

  /**
   * Approve or reject a seller's verification (admin only).
   * @param {number} userId
   * @param {string} sellerStatus - "unverified" | "pending" | "verified" | "rejected"
   */
  updateSellerVerification: async (userId, sellerStatus) => {
    const response = await api.put(`/api/auth/users/${userId}/seller-verification`, {
      seller_status: sellerStatus,
    });
    return response.data;
  },

  /**
   * Change the current user's password.
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put("/api/auth/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /** Get the current user's notification preferences. */
  getNotificationPreferences: async () => {
    const response = await api.get("/api/auth/me/notification-preferences");
    return response.data;
  },

  /** Update the current user's notification preferences. */
  updateNotificationPreferences: async (data) => {
    const response = await api.put("/api/auth/me/notification-preferences", data);
    return response.data;
  },

};

// ============================================================
// PROPERTIES API FUNCTIONS
// ============================================================

export const propertiesAPI = {
  /**
   * Get paginated list of properties with optional filters
   * @param {Object} params - { city, listing_type, min_price, max_price, search, page, per_page }
   */
  list: async (params = {}) => {
    const response = await api.get("/api/properties", { params });
    return response.data; // { items, total, page, per_page, total_pages }
  },

  /**
   * Get featured properties for homepage
   * @param {number} limit - How many to return (default 6)
   */
  getFeatured: async (limit = 6) => {
    const response = await api.get("/api/properties/featured", {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get full details of a single property
   * @param {number} id - Property ID
   */
  getById: async (id) => {
    const response = await api.get(`/api/properties/${id}`);
    return response.data;
  },

  /**
   * Get safe broker contact details for a property.
   * The backend masks owner phone and returns broker contact actions.
   */
  getContact: async (id) => {
    const response = await api.get(`/api/properties/${id}/contact`);
    return response.data;
  },

  /**
   * Create a new property listing (requires login)
   * @param {Object} propertyData - Property fields
   */
  create: async (propertyData) => {
    const response = await api.post("/api/properties", propertyData);
    return response.data;
  },

  /**
   * Update a property (owner only)
   * @param {number} id - Property ID
   * @param {Object} updates - Fields to update
   */
  update: async (id, updates) => {
    const response = await api.put(`/api/properties/${id}`, updates);
    return response.data;
  },

  /**
   * Get all properties for admin moderation.
   */
  listAdmin: async (params = {}) => {
    const response = await api.get("/api/properties/admin/all", { params });
    return response.data;
  },

  /**
   * Get the current user's own property listings, any status (seller "My Listings").
   */
  mine: async (params = {}) => {
    const response = await api.get("/api/properties/mine", { params });
    return response.data;
  },

  /**
   * Get listing analytics (views/enquiries/visits/offers) for the current seller.
   */
  getMyAnalytics: async () => {
    const response = await api.get("/api/properties/mine/analytics");
    return response.data;
  },

  /**
   * Delete a property (owner only)
   * @param {number} id - Property ID
   */
  delete: async (id) => {
    await api.delete(`/api/properties/${id}`);
  },

  /**
   * Upload an image file (requires login)
   * @param {File} file - Image file object
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/properties/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data; // { url: "http://..." }
  },

  /**
   * Claim you've paid the (offline UPI) unlock fee for this property.
   * @param {number} id - Property ID
   * @param {string} [paymentReference] - Optional UTR/transaction ID
   */
  requestUnlock: async (id, paymentReference) => {
    const response = await api.post(`/api/properties/${id}/unlock-request`, {
      payment_reference: paymentReference || undefined,
    });
    return response.data;
  },
};

// ============================================================
// PROPERTY UNLOCK API FUNCTIONS (location + owner phone paywall)
// ============================================================
export const unlocksAPI = {
  /** List the current user's own unlock requests. */
  mine: async () => {
    const response = await api.get("/api/unlocks/mine");
    return response.data;
  },

  /** List every unlock request (admin only), optionally filtered by status. */
  list: async (params = {}) => {
    const response = await api.get("/api/unlocks", { params });
    return response.data;
  },

  /** Verify or reject an unlock request (admin only). */
  review: async (id, status) => {
    const response = await api.put(`/api/unlocks/${id}`, { status });
    return response.data;
  },
};

// ============================================================
// CITIES API FUNCTIONS
// ============================================================

export const citiesAPI = {
  /**
   * Get all cities with active property counts
   * @returns {Array} [{ city: "Mumbai", count: 42 }, ...]
   */
  list: async () => {
    const response = await api.get("/api/cities");
    return response.data;
  },
};

// ============================================================
// ENQUIRIES API FUNCTIONS
// ============================================================

export const enquiriesAPI = {
  /**
   * Submit a contact enquiry (public — no login needed)
   * @param {Object} data - { name, email, phone, message, property_id }
   */
  submit: async (data) => {
    const response = await api.post("/api/enquiries", data);
    return response.data;
  },
  list: async (params = {}) => {
    const response = await api.get("/api/enquiries", { params });
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/enquiries/${id}`, data);
    return response.data;
  },

  /** List the current user's own submitted enquiries (buyer dashboard). */
  mine: async () => {
    const response = await api.get("/api/enquiries/mine");
    return response.data;
  },

  /** List enquiries received on the current seller's properties. */
  received: async () => {
    const response = await api.get("/api/enquiries/received");
    return response.data;
  },

  /** Add a timestamped broker note to an enquiry (admin only). */
  addNote: async (id, text) => {
    const response = await api.post(`/api/enquiries/${id}/notes`, { text });
    return response.data;
  },
};

// ============================================================
// SAVED PROPERTIES (WISHLIST) API FUNCTIONS
// ============================================================

export const savedPropertiesAPI = {
  list: async () => {
    const response = await api.get("/api/saved-properties");
    return response.data;
  },
  save: async (propertyId) => {
    const response = await api.post(`/api/saved-properties/${propertyId}`);
    return response.data;
  },
  unsave: async (propertyId) => {
    await api.delete(`/api/saved-properties/${propertyId}`);
  },
};

// ============================================================
// VISITS API FUNCTIONS
// ============================================================

export const visitsAPI = {
  /** Request a visit as a buyer. @param {Object} data - { property_id, requested_date, message } */
  create: async (data) => {
    const response = await api.post("/api/visits", data);
    return response.data;
  },
  mine: async () => {
    const response = await api.get("/api/visits/mine");
    return response.data;
  },
  received: async () => {
    const response = await api.get("/api/visits/received");
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/api/visits/${id}`, { status });
    return response.data;
  },
};

// ============================================================
// OFFERS API FUNCTIONS
// ============================================================

export const offersAPI = {
  /** Make a price offer as a buyer. @param {Object} data - { property_id, amount, message } */
  create: async (data) => {
    const response = await api.post("/api/offers", data);
    return response.data;
  },
  mine: async () => {
    const response = await api.get("/api/offers/mine");
    return response.data;
  },
  received: async () => {
    const response = await api.get("/api/offers/received");
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/api/offers/${id}`, { status });
    return response.data;
  },
};

// ============================================================
// NOTIFICATIONS API FUNCTIONS
// ============================================================

export const notificationsAPI = {
  list: async () => {
    const response = await api.get("/api/notifications");
    return response.data;
  },
  markRead: async (id) => {
    const response = await api.put(`/api/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.put("/api/notifications/read-all");
    return response.data;
  },
};

// ============================================================
// SETTINGS API FUNCTIONS
// ============================================================

export const settingsAPI = {
  /**
   * Get broker contact settings.
   */
  getBrokerContact: async () => {
    const response = await api.get("/api/settings/broker-contact");
    return response.data;
  },

  /**
   * Update broker contact settings (admin only).
   */
  updateBrokerContact: async (data) => {
    const response = await api.put("/api/settings/broker-contact", data);
    return response.data;
  },

  /**
   * Get the UPI QR code image / phone / fee for the location-unlock feature.
   */
  getPaymentInfo: async () => {
    const response = await api.get("/api/settings/payment-info");
    return response.data;
  },
};

// Export the raw axios instance too (for advanced use)
export default api;
