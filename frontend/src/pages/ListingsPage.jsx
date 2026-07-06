import { useCallback, useEffect, useState } from "react";
import { FaSearch, FaFilter, FaTimes } from "react-icons/fa";
import { Link, useSearchParams } from "react-router-dom";
import { propertiesAPI } from "../api/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function PropertyCard({ property }) {
  return (
    <Link
      to={`/properties/${property.id}`}
      id={`property-card-${property.id}`}
      className="bg-white rounded-xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-md transition duration-200 group flex flex-col"
    >
      <div className="relative overflow-hidden h-48 bg-zinc-50">
        <img
          src={property.thumbnail_url || `https://picsum.photos/600/400?random=${property.id}`}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
            {property.listing_type}
          </span>
          {property.is_verified && (
            <span className="bg-emerald-600/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded">
              ✓ VERIFIED
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-zinc-900 text-base leading-snug line-clamp-1 group-hover:text-zinc-700 transition-colors">
            {property.title}
          </h3>
          <p className="text-zinc-400 text-xs mt-1">📍 {property.locality ? `${property.locality}, ` : ""}{property.city}</p>
          <div className="flex gap-3 mt-3 text-xs text-zinc-550 font-medium">
            {property.bedrooms && <span>{property.bedrooms} Beds</span>}
            {property.bathrooms && <span>{property.bathrooms} Baths</span>}
            {property.area_sqft && <span>{property.area_sqft.toLocaleString()} sqft</span>}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between">
          <p className="text-zinc-900 font-extrabold text-lg">{property.price_label || `₹${property.price.toLocaleString()}`}</p>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-2 py-1 rounded">{property.property_type}</span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-zinc-100 shadow-sm animate-pulse">
      <div className="h-48 bg-zinc-150" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-zinc-150 rounded w-3/4" />
        <div className="h-3 bg-zinc-150 rounded w-1/2" />
        <div className="h-5 bg-zinc-150 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 12, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    city: searchParams.get("city") || "",
    listing_type: searchParams.get("listing_type") || "",
    min_price: searchParams.get("min_price") || "",
    max_price: searchParams.get("max_price") || "",
    bedrooms: searchParams.get("bedrooms") || "",
  });

  const fetchProperties = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, per_page: 12 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await propertiesAPI.list(params);
      setProperties(data.items);
      setPagination({ total: data.total, page: data.page, per_page: data.per_page, total_pages: data.total_pages });
    } catch (err) {
      console.error("Failed to load properties:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties(1);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    setSearchParams(params, { replace: true });
  }, [filters, fetchProperties, setSearchParams]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => setFilters({ search: "", city: "", listing_type: "", min_price: "", max_price: "", bedrooms: "" });
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Find Properties</h1>
            <p className="text-zinc-500 text-sm mt-1">{isLoading ? "Searching..." : `${pagination.total} properties found`}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text" name="search" id="listings-search" value={filters.search}
              onChange={handleFilterChange} placeholder="Search city, locality, or property name..."
              className="w-full pl-11 pr-4 py-3.5 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-400 bg-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button id="toggle-filters" onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-medium text-sm border transition ${showFilters ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-200"}`}>
              <FaFilter /> Filters
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-2 px-5 py-3.5 bg-zinc-100 text-zinc-650 rounded-xl font-medium text-sm hover:bg-zinc-200 transition">
                <FaTimes /> Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl p-5 border border-zinc-200 mb-6 grid sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "City", name: "city", type: "text", placeholder: "e.g. Mumbai" },
              { label: "Min Price", name: "min_price", type: "number", placeholder: "e.g. 50" },
              { label: "Max Price", name: "max_price", type: "number", placeholder: "e.g. 500" },
              { label: "Bedrooms", name: "bedrooms", type: "number", placeholder: "e.g. 2" },
            ].map((f) => (
              <div key={f.name}>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">{f.label}</label>
                <input type={f.type} name={f.name} id={`filter-${f.name}`} value={filters[f.name]}
                  onChange={handleFilterChange} placeholder={f.placeholder}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-450" />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Type</label>
              <select name="listing_type" id="filter-listing-type" value={filters.listing_type}
                onChange={handleFilterChange}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-450">
                <option value="">All Types</option>
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-250 rounded-xl">
            <span className="text-4xl mb-3 block">🏠</span>
            <h3 className="text-lg font-bold text-zinc-900">No properties found</h3>
            <p className="text-zinc-500 text-xs mt-1">Try adjusting your filters or search term.</p>
            <button onClick={clearFilters} className="mt-4 bg-zinc-900 text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-zinc-800 transition">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => <PropertyCard key={prop.id} property={prop} />)}
            </div>
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((pageNum) => (
                  <button key={pageNum} onClick={() => fetchProperties(pageNum)}
                    className={`w-9 h-9 rounded-lg font-medium text-xs transition ${pagination.page === pageNum ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200"}`}>
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
