import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import CreateListingPage from "./pages/CreateListingPage";
import AdminBrokerSettingsPage from "./pages/AdminBrokerSettingsPage";
import AdminEnquiriesPage from "./pages/AdminEnquiriesPage";
import AdminListingsPage from "./pages/AdminListingsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ProfilePage from "./pages/ProfilePage";

// Buyer dashboard
import BuyerDashboardHome from "./pages/dashboard/buyer/BuyerDashboardHome";
import SavedPropertiesPage from "./pages/dashboard/buyer/SavedPropertiesPage";
import MyEnquiriesPage from "./pages/dashboard/buyer/MyEnquiriesPage";
import MyVisitsPage from "./pages/dashboard/buyer/MyVisitsPage";
import MyOffersPage from "./pages/dashboard/buyer/MyOffersPage";

// Seller dashboard
import SellerDashboardHome from "./pages/dashboard/seller/SellerDashboardHome";
import MyListingsPage from "./pages/dashboard/seller/MyListingsPage";
import ListingAnalyticsPage from "./pages/dashboard/seller/ListingAnalyticsPage";
import SellerEnquiriesPage from "./pages/dashboard/seller/SellerEnquiriesPage";
import SellerVisitsPage from "./pages/dashboard/seller/SellerVisitsPage";
import SellerOffersPage from "./pages/dashboard/seller/SellerOffersPage";
import SellerDocumentsPage from "./pages/dashboard/seller/SellerDocumentsPage";
import SellerVerificationPage from "./pages/dashboard/seller/SellerVerificationPage";

// Shared dashboard
import NotificationsPage from "./pages/dashboard/shared/NotificationsPage";
import SettingsPage from "./pages/dashboard/shared/SettingsPage";

// Components
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Featured from "./components/Featured";
import Cities from "./components/Cities";
import WhyUs from "./components/WhyUs";
import Steps from "./components/Steps";
import Testimonials from "./components/Testimonials";
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
      <Testimonials />
      <Footer />
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

  if (!user?.has_seller_profile && !user?.is_admin) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
