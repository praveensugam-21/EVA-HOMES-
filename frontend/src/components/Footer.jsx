import { Link } from "react-router-dom";
import { FaHome, FaEnvelope } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-line-soft">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <FaHome className="text-white text-sm" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            EVA <span className="font-normal text-muted">Homes</span>
          </span>
        </Link>

        <p className="text-muted text-xs">
          Find · Buy · Rent · Sell Properties Across India
        </p>

        <a
          href="mailto:evahomes360@gmail.com"
          className="flex items-center gap-2 text-xs font-medium text-ink-soft hover:text-accent transition"
        >
          <FaEnvelope className="text-[11px]" />
          evahomes360@gmail.com
        </a>
      </div>

      <div className="border-t border-line-soft">
        <p className="max-w-7xl mx-auto px-6 py-5 text-center text-faint text-[11px]">
          &copy; {new Date().getFullYear()} EVA Homes. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
