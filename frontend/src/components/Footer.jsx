import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-150 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <FaHome className="text-zinc-900 text-xl" />
          <span className="text-base font-bold tracking-tight text-zinc-900">
            EVA <span className="font-light text-zinc-500">HOMES</span>
          </span>
        </div>

        <p className="text-zinc-500 text-xs">
          Find • Buy • Rent • Sell Properties Across India
        </p>

        <p className="text-zinc-400 text-xs">
          &copy; {new Date().getFullYear()} EVA Homes. All rights reserved.
        </p>
      </div>
    </footer>
  );
}