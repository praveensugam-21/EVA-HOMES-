import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PropertyBrowser from "../components/PropertyBrowser";

export default function ListingsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        <PropertyBrowser />
      </div>
      <Footer />
    </div>
  );
}
