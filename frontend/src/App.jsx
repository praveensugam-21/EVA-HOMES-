import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import CreateListingPage from "./pages/CreateListingPage";

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/listings/create" element={<CreateListingPage />} />
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