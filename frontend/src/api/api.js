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

// The base URL of our FastAPI backend
// In development: http://localhost:8000
// In production: your deployed API URL
const BASE_URL = "http://localhost:8000";

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
   * Get the currently logged-in user's profile
   * (requires valid token in localStorage)
   */
  getMyProfile: async () => {
    const response = await api.get("/api/auth/me");
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
};

// Export the raw axios instance too (for advanced use)
export default api;
