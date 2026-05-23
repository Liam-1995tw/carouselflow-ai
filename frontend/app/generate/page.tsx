"use client";

import { useState } from "react";

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/carousel/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      console.log(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="card w-full max-w-xl">
        <h2 className="text-2xl font-bold text-brand-900 mb-6">Generate Carousel</h2>
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Enter a topic or URL..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          className="btn-primary w-full"
          onClick={handleGenerate}
          disabled={loading || !topic}
        >
          {loading ? "Generating..." : "Generate with AI Agents"}
        </button>
      </div>
    </div>
  );
}
