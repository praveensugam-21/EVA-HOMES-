import { useEffect, useState } from "react";
import { FaFileUpload, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { authAPI, getErrorMessage } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";

const DOC_TYPES = [
  { value: "id_proof", label: "Government ID Proof" },
  { value: "address_proof", label: "Address Proof" },
  { value: "business_license", label: "Business License (optional)" },
];

export default function SellerDocumentsPage() {
  const { refreshUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [docFile, setDocFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const docs = await authAPI.getMySellerDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load documents."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setError("Choose a file to upload first.");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const uploaded = await authAPI.uploadSellerDocument(docType, docFile);
      setDocuments((prev) => [uploaded, ...prev]);
      setDocFile(null);
      await refreshUser();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload document."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout mode="seller" title="Documents" subtitle="Upload documents to support your seller verification">
      <div className="bg-white border-2 border-ink rounded-xl p-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">{error}</div>
        )}

        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ink bg-white sm:w-56"
          >
            {DOC_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface file:text-xs file:font-semibold"
          />
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 border border-ink text-ink hover:bg-ink hover:text-white disabled:opacity-60 font-semibold px-4 py-2.5 rounded-lg text-sm transition whitespace-nowrap"
          >
            {isUploading ? <FaSpinner className="animate-spin text-xs" /> : <FaFileUpload className="text-xs" />}
            Upload
          </button>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-faint"><FaSpinner className="animate-spin" /></div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-faint">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between border border-line-soft rounded-lg px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {DOC_TYPES.find((d) => d.value === doc.doc_type)?.label || doc.doc_type}
                  </p>
                  <p className="text-xs text-faint">{new Date(doc.uploaded_at).toLocaleString()}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-ink-soft hover:text-ink underline">
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
