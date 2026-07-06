// ============================================================
// src/context/AuthContext.jsx — Authentication State Manager
// ============================================================
// WHAT IS CONTEXT?
// ─────────────────
// React Context is a way to share data across MANY components
// without having to pass props down through every level.
//
// PROBLEM without context:
//   App → Navbar → UserMenu → UserAvatar (all need "user" data)
//   Without context: pass user as prop to each level → messy!
//
// WITH context:
//   Any component can call useAuth() and get the user directly.
//
// THIS FILE:
//   Creates AuthContext with: { user, token, login, logout, isLoading }
//   Wraps the whole app in AuthProvider (in main.jsx)
//   Any component can then use the useAuth() hook.
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authAPI } from "../api/api";

// ---- CREATE CONTEXT ----
// createContext(null) creates a Context object.
// The null is the default value when no Provider wraps the component.
const AuthContext = createContext(null);

// ---- PROVIDER COMPONENT ----
// This wraps the whole app and provides auth state to all children.
// Think of it as a "global store" for auth data.
export function AuthProvider({ children }) {
  // ---- STATE ----
  const [user, setUser] = useState(null);       // The logged-in user object
  const [token, setToken] = useState(null);     // The JWT token string
  const [isLoading, setIsLoading] = useState(true); // True during initial auth check

  // ---- INITIALIZE FROM LOCALSTORAGE ----
  // When the app first loads, check if the user was previously logged in.
  // We store the token in localStorage so login persists across page refreshes.
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("eva_token");

      if (storedToken) {
        setToken(storedToken);
        try {
          // Verify the token is still valid by fetching the user profile
          // If the token expired, this will throw a 401 error
          const userProfile = await authAPI.getMyProfile();
          setUser(userProfile);
        } catch (error) {
          // Token is invalid/expired — clear everything
          localStorage.removeItem("eva_token");
          localStorage.removeItem("eva_user");
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false); // Done initializing
    };

    initializeAuth();
  }, []);

  // ---- LOGIN FUNCTION ----
  // Called from the LoginPage after successful form submit.
  // Stores the token, then fetches and stores the user profile.
  const login = useCallback(async (email, password) => {
    // Call the login API → get JWT token
    const tokenData = await authAPI.login(email, password);

    // Store token in localStorage (persists across page refreshes)
    localStorage.setItem("eva_token", tokenData.access_token);
    setToken(tokenData.access_token);

    // Fetch the user profile using the new token
    const userProfile = await authAPI.getMyProfile();
    localStorage.setItem("eva_user", JSON.stringify(userProfile));
    setUser(userProfile);

    return userProfile;
  }, []);

  // ---- LOGOUT FUNCTION ----
  // Clears all auth state. No API call needed — JWT is stateless.
  const logout = useCallback(() => {
    localStorage.removeItem("eva_token");
    localStorage.removeItem("eva_user");
    setToken(null);
    setUser(null);
  }, []);

  // ---- REGISTER FUNCTION ----
  const register = useCallback(async (userData) => {
    const newUser = await authAPI.register(userData);
    return newUser;
  }, []);

  // ---- CONTEXT VALUE ----
  // This object is what components get when they call useAuth()
  const value = {
    user,           // null if not logged in, User object if logged in
    token,          // JWT token string
    isLoading,      // true while checking localStorage on startup
    isLoggedIn: !!user, // convenient boolean shorthand
    login,          // function(email, password)
    logout,         // function()
    register,       // function(userData)
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children until we've checked localStorage */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

// ---- CUSTOM HOOK ----
// Components call: const { user, login, logout } = useAuth();
// This is much cleaner than: const { user } = useContext(AuthContext);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() must be used inside an <AuthProvider>!");
  }
  return context;
}
