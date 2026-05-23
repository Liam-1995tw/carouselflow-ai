import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-white">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-5xl font-bold text-brand-900 mb-4">
          CarouselFlow <span className="text-brand-500">AI</span>
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          Generate stunning carousel content powered by multi-agent AI.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/generate" className="btn-primary">
            Start Generating
          </Link>
          <Link href="/dashboard" className="border border-brand-500 text-brand-500 font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-50 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
