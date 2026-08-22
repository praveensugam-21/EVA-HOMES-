import { useCallback, useEffect, useState } from "react";
import { FaSearch, FaFilter, FaTimes } from "react-icons/fa";
import { Link, useSearchParams } from "react-router-dom";
import { propertiesAPI } from "../api/api";
import FamilyIllustration from "./FamilyIllustration";

function PropertyCard({ property }) {
  return (
    <Link
      to={`/properties/${property.id}`}
      id={`property-card-${property.id}`}
      className="bg-white rounded-xl overflow-hidden border-2 border-ink hover:shadow-md transition duration-200 group flex flex-col"
    >
      <div className="relative overflow-hidden h-48 bg-surface">
        <img
          src={property.thumbnail_url || `https://picsum.photos/600/400?random=${property.id}`}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-ink/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
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
          <h3 className="font-bold text-ink text-base leading-snug line-clamp-1 group-hover:text-ink-soft transition-colors">
            {property.title}
          </h3>
          <p className="text-faint text-xs mt-1">📍 {property.locality ? `${property.locality}, ` : ""}{property.city}</p>
          <div className="flex gap-3 mt-3 text-xs text-muted font-medium">
            {property.bedrooms && <span>{property.bedrooms} Beds</span>}
            {property.bathrooms && <span>{property.bathrooms} Baths</span>}
            {property.area_sqft && <span>{property.area_sqft.toLocaleString()} sqft</span>}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-line-soft flex items-center justify-between">
          <p className="text-ink font-extrabold text-lg truncate max-w-[70%]" title={property.price_label || undefined}>
            {property.price_label || `₹${property.price.toLocaleString()}`}
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider text-faint bg-surface px-2 py-1 rounded">{property.property_type}</span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border-2 border-ink animate-pulse">
      <div className="h-48 bg-line-soft" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-line-soft rounded w-3/4" />
        <div className="h-3 bg-line-soft rounded w-1/2" />
        <div className="h-5 bg-line-soft rounded w-1/3" />
      </div>
    </div>
  );
}

const FILTER_KEYS = ["search", "city", "listing_type", "property_type", "min_price", "max_price", "bedrooms"];

/**
 * The full search/filter/grid/pagination experience for browsing listings.
 * Rendered standalone on the public /listings page (ListingsPage.jsx, with
 * its own "Find Properties" heading + illustration) and embedded inside the
 * buyer dashboard (SearchPropertiesPage.jsx, where DashboardLayout already
 * provides the page title/sidebar — pass showTitle={false} there so the
 * heading isn't duplicated, while the live result count still shows).
 */
export default function PropertyBrowser({ showTitle = true }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 12, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // The URL is the single source of truth for filters — read fresh every render
  // instead of mirroring it into separate state, so a navbar link (Buy/Rent/
  // Commercial) that changes only the URL's query string, without navigating
  // to a new route, is picked up immediately instead of being ignored.
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""]));
  const filtersKey = searchParams.toString();

  const fetchProperties = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, per_page: 12 };
      for (const key of FILTER_KEYS) {
        const value = searchParams.get(key);
        if (value) params[key] = value;
      }
      const data = await propertiesAPI.list(params);
      setProperties(data.items);
      setPagination({ total: data.total, page: data.page, per_page: data.per_page, total_pages: data.total_pages });
    } catch (err) {
      console.error("Failed to load properties:", err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    fetchProperties(1);
  }, [filtersKey, fetchProperties]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true }
    );
  };

  const clearFilters = () => setSearchParams({}, { replace: true });
  const hasActiveFilters = FILTER_KEYS.some((k) => filters[k]);

  return (
    <>
      <div className="relative mb-10 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {showTitle && <h1 className="text-2xl font-bold tracking-tight text-ink">Find Properties</h1>}
          <p className="text-muted text-sm mt-1">{isLoading ? "Searching..." : `${pagination.total} properties found`}</p>
        </div>
        {showTitle && (
          <div
            className="hidden md:block absolute -top-6 right-0 w-20 h-20 lg:w-24 lg:h-24 pointer-events-none"
            aria-hidden="true"
          >
            <FamilyIllustration />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text" name="search" id="listings-search" value={filters.search}
            onChange={handleFilterChange} placeholder="Search city, locality, or property name..."
            className="w-full pl-11 pr-4 py-3.5 border border-line rounded-xl focus:outline-none focus:border-ink bg-white text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button id="toggle-filters" onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-medium text-sm border transition ${showFilters ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line"}`}>
            <FaFilter /> Filters
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-2 px-5 py-3.5 bg-surface text-ink-soft rounded-xl font-medium text-sm hover:bg-line transition">
              <FaTimes /> Clear
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl p-5 border-2 border-ink mb-6 grid sm:grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "City", name: "city", type: "text", placeholder: "e.g. Mumbai" },
            { label: "Min Price", name: "min_price", type: "number", placeholder: "e.g. 50" },
            { label: "Max Price", name: "max_price", type: "number", placeholder: "e.g. 500" },
            { label: "Bedrooms", name: "bedrooms", type: "number", placeholder: "e.g. 2" },
          ].map((f) => (
            <div key={f.name}>
              <label className="text-xs font-semibold text-muted mb-1 block">{f.label}</label>
              <input type={f.type} name={f.name} id={`filter-${f.name}`} value={filters[f.name]}
                onChange={handleFilterChange} placeholder={f.placeholder}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink" />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">Listing Type</label>
            <select name="listing_type" id="filter-listing-type" value={filters.listing_type}
              onChange={handleFilterChange}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink">
              <option value="">All Types</option>
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">Property Type</label>
            <select name="property_type" id="filter-property-type" value={filters.property_type}
              onChange={handleFilterChange}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink">
              <option value="">All Properties</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
              <option value="house">House</option>
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-line rounded-xl">
          <span className="text-4xl mb-3 block">🏠</span>
          <h3 className="text-lg font-bold text-ink">No properties found</h3>
          <p className="text-muted text-xs mt-1">Try adjusting your filters or search term.</p>
          <button onClick={clearFilters} className="mt-4 bg-ink text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-hover transition">Clear Filters</button>
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
                  className={`w-9 h-9 rounded-lg font-medium text-xs transition ${pagination.page === pageNum ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-surface border border-line"}`}>
                  {pageNum}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
