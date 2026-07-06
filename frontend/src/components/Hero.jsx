import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import hero from "../assets/hero.png";

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("buy");
  const navigate = useNavigate();

  const tabs = [
    { id: "buy", label: "Buy" },
    { id: "rent", label: "Rent" },
    { id: "commercial", label: "Commercial" },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("listing_type", activeTab);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[85vh] bg-zinc-50 flex items-center justify-center pt-24 pb-16">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src={hero} alt="Background" className="w-full h-full object-cover filter grayscale" />
      </div>
      <div className="relative z-10 w-full max-w-5xl px-6 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 leading-tight">
          Find Your Next Home.
        </h1>
        <p className="text-zinc-500 text-lg md:text-xl mt-4 max-w-2xl mx-auto">
          Explore premium verified properties across India's leading cities.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 mt-10 p-6 md:p-8 max-w-3xl mx-auto">
          <div className="flex gap-6 mb-6 border-b border-zinc-100 pb-3 text-sm font-medium">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`hero-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 transition-all ${
                  activeTab === tab.id
                    ? "text-zinc-950 border-b-2 border-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-zinc-650"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              id="hero-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, locality, or property name..."
              className="flex-1 border border-zinc-200 rounded-xl px-5 py-4 text-base outline-none focus:border-zinc-400 transition"
            />
            <button
              type="submit"
              id="hero-search-btn"
              className="bg-zinc-900 hover:bg-zinc-800 px-8 py-4 rounded-xl text-white flex items-center justify-center font-medium transition"
            >
              <FaSearch size={16} className="mr-2" /> Search
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-6 text-xs text-zinc-450 border-t border-zinc-50 pt-5">
            <span className="flex items-center gap-1.5 text-zinc-500">🏠 500+ Properties</span>
            <span className="flex items-center gap-1.5 text-zinc-500">🌆 6+ Cities</span>
            <span className="flex items-center gap-1.5 text-zinc-500">✓ Verified Listings</span>
          </div>
        </div>
      </div>
    </section>
  );
}