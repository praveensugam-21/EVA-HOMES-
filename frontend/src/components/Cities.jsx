import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { citiesAPI } from "../api/api";

const FALLBACK_CITIES = [
  { city: "Delhi", count: null },
  { city: "Mumbai", count: null },
  { city: "Bangalore", count: null },
  { city: "Hyderabad", count: null },
  { city: "Chennai", count: null },
  { city: "Pune", count: null },
];

export default function Cities() {
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const data = await citiesAPI.list();
        setCities(data.length > 0 ? data : FALLBACK_CITIES);
      } catch {
        setCities(FALLBACK_CITIES);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCities();
  }, []);

  const handleCityClick = (cityName) => {
    navigate(`/listings?city=${encodeURIComponent(cityName)}`);
  };

  return (
    <section className="py-20 bg-surface border-y border-line-soft">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8 text-center md:text-left">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Where to look</span>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink mt-1.5">Popular Cities</h2>
          <p className="text-muted text-sm mt-1">Browse properties in India's top real estate markets.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border-2 border-ink rounded-xl h-20 animate-pulse" />
              ))
            : cities.slice(0, 6).map((item) => (
                <div
                  key={item.city}
                  onClick={() => handleCityClick(item.city)}
                  className="group bg-white border-2 border-ink rounded-xl py-5 px-3 text-center hover:-translate-y-1 hover:shadow-[0_10px_24px_-12px_rgba(16,17,20,0.35)] cursor-pointer transition-all duration-200"
                >
                  <p className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">{item.city}</p>
                  {item.count !== null && (
                    <p className="text-[10px] text-faint font-semibold uppercase mt-1 tracking-wide">
                      {item.count} {item.count === 1 ? "listing" : "listings"}
                    </p>
                  )}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
