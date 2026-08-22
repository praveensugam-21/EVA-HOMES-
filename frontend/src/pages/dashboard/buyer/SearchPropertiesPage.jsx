import DashboardLayout from "../../../layouts/DashboardLayout";
import PropertyBrowser from "../../../components/PropertyBrowser";

export default function SearchPropertiesPage() {
  return (
    <DashboardLayout mode="buyer" title="Search Properties" subtitle="Browse listings without leaving your dashboard">
      <PropertyBrowser showTitle={false} />
    </DashboardLayout>
  );
}
