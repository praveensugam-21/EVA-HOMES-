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
    <section className="py-20 bg-zinc-50 border-y border-zinc-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Popular Cities</h2>
          <p className="text-zinc-500 text-sm mt-1">Browse properties in India's top real estate markets.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-zinc-200 rounded-xl h-20 animate-pulse"
                />
              ))
            : cities.slice(0, 6).map((item) => (
                <div
                  key={item.city}
                  onClick={() => handleCityClick(item.city)}
                  className="bg-white border border-zinc-100 rounded-xl py-5 px-3 text-center hover:border-zinc-900 cursor-pointer transition-all duration-200 shadow-sm"
                >
                  <p className="font-semibold text-zinc-900 text-sm">{item.city}</p>
                  {item.count !== null && (
                    <p className="text-[10px] text-zinc-400 font-medium uppercase mt-1">
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