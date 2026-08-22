import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";

// Pages — lazy-loaded so a visitor browsing public pages never downloads
// the admin/seller/buyer dashboard code. Only the Home route's own pieces
// (below) stay as regular imports, since that's the first thing everyone
// loads anyway and splitting it further wouldn't help first paint.
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ListingsPage = lazy(() => import("./pages/ListingsPage"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetailPage"));
const CreateListingPage = lazy(() => import("./pages/CreateListingPage"));
const AdminBrokerSettingsPage = lazy(() => import("./pages/AdminBrokerSettingsPage"));
const AdminEnquiriesPage = lazy(() => import("./pages/AdminEnquiriesPage"));
const AdminPaymentVerificationsPage = lazy(() => import("./pages/AdminPaymentVerificationsPage"));
const AdminListingsPage = lazy(() => import("./pages/AdminListingsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminSellerVerificationsPage = lazy(() => import("./pages/AdminSellerVerificationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// Buyer dashboard
const BuyerDashboardHome = lazy(() => import("./pages/dashboard/buyer/BuyerDashboardHome"));
const SavedPropertiesPage = lazy(() => import("./pages/dashboard/buyer/SavedPropertiesPage"));
const MyEnquiriesPage = lazy(() => import("./pages/dashboard/buyer/MyEnquiriesPage"));
const MyVisitsPage = lazy(() => import("./pages/dashboard/buyer/MyVisitsPage"));
const MyOffersPage = lazy(() => import("./pages/dashboard/buyer/MyOffersPage"));
const MyUnlocksPage = lazy(() => import("./pages/dashboard/buyer/MyUnlocksPage"));

// Seller dashboard
const SellerDashboardHome = lazy(() => import("./pages/dashboard/seller/SellerDashboardHome"));
const MyListingsPage = lazy(() => import("./pages/dashboard/seller/MyListingsPage"));
const ListingAnalyticsPage = lazy(() => import("./pages/dashboard/seller/ListingAnalyticsPage"));
const SellerEnquiriesPage = lazy(() => import("./pages/dashboard/seller/SellerEnquiriesPage"));
const SellerVisitsPage = lazy(() => import("./pages/dashboard/seller/SellerVisitsPage"));
const SellerOffersPage = lazy(() => import("./pages/dashboard/seller/SellerOffersPage"));
const SellerDocumentsPage = lazy(() => import("./pages/dashboard/seller/SellerDocumentsPage"));
const SellerVerificationPage = lazy(() => import("./pages/dashboard/seller/SellerVerificationPage"));

// Shared dashboard
const NotificationsPage = lazy(() => import("./pages/dashboard/shared/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/shared/SettingsPage"));

// Components (Home route only — kept eager, see note above)
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Featured from "./components/Featured";
import Cities from "./components/Cities";
import WhyUs from "./components/WhyUs";
import Steps from "./components/Steps";
import Footer from "./components/Footer";

function HomePage() {
  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <Hero />
      <Featured />
      <Cities />
      <WhyUs />
      <Steps />
      <Footer />
    </div>
  );
}

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-line border-t-ink rounded-full animate-spin" />
    </div>
  );
}

function AdminRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function SellerRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // An admin may also hold a seller profile (opted in like any other
  // account) — only a missing seller profile blocks this route now.
  if (!user?.has_seller_profile) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route
              path="/listings/create"
              element={
                <SellerRoute>
                  <CreateListingPage />
                </SellerRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />

            {/* Buyer dashboard */}
            <Route path="/dashboard/buyer" element={<RequireAuth><BuyerDashboardHome /></RequireAuth>} />
            <Route path="/dashboard/buyer/saved" element={<RequireAuth><SavedPropertiesPage /></RequireAuth>} />
            <Route path="/dashboard/buyer/enquiries" element={<RequireAuth><MyEnquiriesPage /></RequireAuth>} />
            <Route path="/dashboard/buyer/visits" element={<RequireAuth><MyVisitsPage /></RequireAuth>} />
            <Route path="/dashboard/buyer/offers" element={<RequireAuth><MyOffersPage /></RequireAuth>} />
            <Route path="/dashboard/buyer/unlocks" element={<RequireAuth><MyUnlocksPage /></RequireAuth>} />

            {/* Seller dashboard */}
            <Route path="/dashboard/seller" element={<SellerRoute><SellerDashboardHome /></SellerRoute>} />
            <Route path="/dashboard/seller/listings" element={<SellerRoute><MyListingsPage /></SellerRoute>} />
            <Route path="/dashboard/seller/analytics" element={<SellerRoute><ListingAnalyticsPage /></SellerRoute>} />
            <Route path="/dashboard/seller/enquiries" element={<SellerRoute><SellerEnquiriesPage /></SellerRoute>} />
            <Route path="/dashboard/seller/visits" element={<SellerRoute><SellerVisitsPage /></SellerRoute>} />
            <Route path="/dashboard/seller/offers" element={<SellerRoute><SellerOffersPage /></SellerRoute>} />
            <Route path="/dashboard/seller/documents" element={<SellerRoute><SellerDocumentsPage /></SellerRoute>} />
            <Route path="/dashboard/seller/verification" element={<SellerRoute><SellerVerificationPage /></SellerRoute>} />

            {/* Shared dashboard */}
            <Route path="/dashboard/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="/dashboard/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/dashboard/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

            <Route
              path="/admin/enquiries"
              element={
                <AdminRoute>
                  <AdminEnquiriesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/payment-verifications"
              element={
                <AdminRoute>
                  <AdminPaymentVerificationsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/listings"
              element={
                <AdminRoute>
                  <AdminListingsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/seller-verifications"
              element={
                <AdminRoute>
                  <AdminSellerVerificationsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings/broker-contact"
              element={
                <AdminRoute>
                  <AdminBrokerSettingsPage />
                </AdminRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="*"
              element={
                <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4">
                  <span className="text-6xl mb-4">🏠</span>
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Page Not Found</h1>
                  <p className="text-zinc-500 mt-2">The page you are looking for does not exist.</p>
                  <a href="/" className="mt-6 bg-zinc-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-zinc-800 transition">
                    Back to Home
                  </a>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
