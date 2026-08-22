import { Suspense, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import HeroScene, { SearchGlyph } from "./HeroScene";

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
    <section className="relative min-h-[85vh] bg-cream flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* opacity, not `hidden`/display:none — browser zoom shrinks the
          effective CSS viewport width, and a hard display:none breakpoint
          made this graphic disappear abruptly at common zoom levels.
          Fading via opacity below the breakpoint keeps the transition
          smooth instead of an instant snap, and the min-width is a bit
          lower than the old lg: (1024px) so normal desktop zoom is less
          likely to cross it at all. */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-0 min-[900px]:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>
      <div className="relative z-10 w-full max-w-5xl px-6 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent bg-accent-soft px-3 py-1.5 rounded-full mb-6">
          Verified listings · Agent-assisted deals
        </span>
        <h1 className="relative block w-fit mx-auto font-script text-accent text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] lg:whitespace-nowrap">
          Find your next home.
          <span
            className="absolute -top-10 right-0 w-20 h-20 pointer-events-none opacity-0 min-[900px]:opacity-100 transition-opacity duration-300"
            aria-hidden="true"
          >
            <Suspense fallback={null}>
              <SearchGlyph />
            </Suspense>
          </span>
        </h1>
        <p className="text-muted text-lg md:text-xl mt-5 max-w-2xl mx-auto">
          Explore premium verified properties across India's leading cities.
        </p>

        <div className="bg-white rounded-2xl shadow-[0_16px_40px_-16px_rgba(14,59,46,0.22)] border border-line mt-10 p-6 md:p-8 max-w-3xl mx-auto">
          <div className="flex gap-6 mb-6 border-b border-line-soft pb-3 text-sm font-medium">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`hero-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 transition-all ${
                  activeTab === tab.id
                    ? "text-accent border-b-2 border-accent font-semibold"
                    : "text-faint hover:text-accent"
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
              className="flex-1 border border-line rounded-xl px-5 py-4 text-base outline-none focus:border-accent transition"
            />
            <button
              type="submit"
              id="hero-search-btn"
              className="bg-accent hover:bg-accent-hover px-8 py-4 rounded-xl text-white flex items-center justify-center font-medium transition"
            >
              <FaSearch size={16} className="mr-2" /> Search
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-6 text-xs text-muted border-t border-line-soft pt-5 font-medium">
            <span className="flex items-center gap-1.5">🏠 500+ Properties</span>
            <span className="flex items-center gap-1.5">🌆 6+ Cities</span>
            <span className="flex items-center gap-1.5">✓ Verified Listings</span>
          </div>
        </div>
      </div>
    </section>
  );
}
