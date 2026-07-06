import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { propertiesAPI } from "../api/api";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-zinc-100 shadow-sm animate-pulse">
      <div className="h-48 bg-zinc-100" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-zinc-100 rounded w-3/4" />
        <div className="h-3 bg-zinc-100 rounded w-1/2" />
        <div className="h-5 bg-zinc-100 rounded w-1/3 mt-4" />
      </div>
    </div>
  );
}

export default function Featured() {
  const [homes, setHomes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await propertiesAPI.getFeatured(6);
        setHomes(data);
      } catch (error) {
        console.error("Failed to load featured properties:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <section className="py-20 max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Latest Listings</h2>
          <p className="text-zinc-550 text-sm mt-1">Explore the newest properties added to our directory.</p>
        </div>
        <Link
          to="/listings"
          className="text-sm font-semibold text-zinc-900 hover:text-zinc-700 hover:underline transition"
        >
          View All &rarr;
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : homes.map((home) => (
              <Link
                key={home.id}
                to={`/properties/${home.id}`}
                className="bg-white rounded-xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-md transition duration-200 group flex flex-col"
              >
                <div className="relative h-48 overflow-hidden bg-zinc-50">
                  <img
                    src={home.thumbnail_url || `https://picsum.photos/600/400?random=${home.id}`}
                    alt={home.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
                      {home.listing_type}
                    </span>
                    {home.is_verified && (
                      <span className="bg-emerald-600/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded">
                        ✓ VERIFIED
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-zinc-900 text-base leading-snug line-clamp-1 group-hover:text-zinc-700 transition-colors">
                      {home.title}
                    </h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      📍 {home.locality ? `${home.locality}, ` : ""}{home.city}
                    </p>
                    {home.bedrooms && (
                      <p className="text-zinc-500 text-xs mt-2 font-medium">
                        {home.bedrooms} Beds · {home.bathrooms || 0} Baths · {home.area_sqft?.toLocaleString()} sqft
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between">
                    <p className="text-zinc-900 font-extrabold text-lg">
                      {home.price_label || `₹${home.price?.toLocaleString()}`}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-2 py-1 rounded">
                      {home.property_type}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}