const STATUS_STYLES = {
  // Shared
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  accepted: "bg-emerald-100 text-emerald-700",
  verified: "bg-emerald-100 text-emerald-700",
  new: "bg-blue-100 text-blue-700",
  read: "bg-blue-100 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  closed: "bg-line text-ink-soft",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-line text-ink-soft",
  withdrawn: "bg-line text-ink-soft",
  unverified: "bg-line text-ink-soft",
  inactive: "bg-line text-ink-soft",
  sold: "bg-purple-100 text-purple-700",
  rented: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-line text-ink-soft";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
}
