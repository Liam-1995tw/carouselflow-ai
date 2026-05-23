import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand-500">
          CarouselFlow AI
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-500">Dashboard</Link>
          <Link href="/generate" className="btn-primary text-sm">Generate</Link>
        </div>
      </div>
    </nav>
  );
}
