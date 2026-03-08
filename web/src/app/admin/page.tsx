import AdminConsole from "./ui/AdminConsole";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Pipeline Console</h1>
        <p className="text-gray-400 mt-2">
          Run pipeline stages, review scripts/videos, and inspect social + partner
          analytics.
        </p>
      </div>
      <AdminConsole />
    </div>
  );
}
