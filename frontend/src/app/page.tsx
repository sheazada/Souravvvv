import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-cyan-300">Dairy Distributor ERP</p>
        <h1 className="mb-6 text-4xl font-bold md:text-6xl">Production-ready frontend architecture for admin, retailer, and staff workflows.</h1>
        <p className="mb-8 max-w-3xl text-lg text-slate-300">
          This scaffold includes route groups, shared layouts, API modules, and page placeholders aligned with the backend ERP modules.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-lg bg-cyan-500 px-5 py-3 font-medium text-slate-950" href="/login">Open Login</Link>
          <Link className="rounded-lg border border-slate-700 px-5 py-3 font-medium text-slate-100" href="/app/dashboard">Admin Area</Link>
          <Link className="rounded-lg border border-slate-700 px-5 py-3 font-medium text-slate-100" href="/portal/dashboard">Retailer Portal</Link>
          <Link className="rounded-lg border border-slate-700 px-5 py-3 font-medium text-slate-100" href="/staff/dashboard">Staff Portal</Link>
        </div>
      </div>
    </main>
  );
}
