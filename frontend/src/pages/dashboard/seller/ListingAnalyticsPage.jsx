import { useEffect, useState } from "react";
import { FaChartBar, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import StatusBadge from "../../../components/dashboard/StatusBadge";
import { propertiesAPI, getErrorMessage } from "../../../api/api";

function SummaryTile({ label, value }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-2xl font-bold text-zinc-950 mt-2">{value}</p>
    </div>
  );
}

export default function ListingAnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await propertiesAPI.getMyAnalytics();
        setSummary(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load analytics."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout mode="seller" title="Listing Analytics" subtitle="Views, enquiries, visits, and offers across your listings">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="min-h-48 flex items-center justify-center text-zinc-400"><FaSpinner className="animate-spin text-2xl" /></div>
      ) : summary ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryTile label="Total Views" value={summary.total_views} />
            <SummaryTile label="Enquiries" value={summary.total_enquiries} />
            <SummaryTile label="Visit Requests" value={summary.total_visits} />
            <SummaryTile label="Offers" value={summary.total_offers} />
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3">Listing</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Views</th>
                    <th className="px-5 py-3 text-right">Enquiries</th>
                    <th className="px-5 py-3 text-right">Visits</th>
                    <th className="px-5 py-3 text-right">Offers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {summary.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-400">
                        <FaChartBar className="mx-auto text-2xl text-zinc-300 mb-2" />
                        No listings yet.
                      </td>
                    </tr>
                  ) : (
                    summary.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 font-medium text-zinc-800">{item.title}</td>
                        <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-5 py-3 text-right">{item.view_count}</td>
                        <td className="px-5 py-3 text-right">{item.enquiry_count}</td>
                        <td className="px-5 py-3 text-right">{item.visit_count}</td>
                        <td className="px-5 py-3 text-right">{item.offer_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
