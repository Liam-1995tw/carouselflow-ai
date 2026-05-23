"use client";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-brand-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-400">Carousels Generated</p>
          <p className="text-4xl font-bold text-brand-500 mt-1">0</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Active Agents</p>
          <p className="text-4xl font-bold text-brand-500 mt-1">4</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Brands Configured</p>
          <p className="text-4xl font-bold text-brand-500 mt-1">0</p>
        </div>
      </div>
    </div>
  );
}
