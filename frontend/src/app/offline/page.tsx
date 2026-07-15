export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-sm uppercase tracking-[0.2em] text-cyan-600">Offline Mode</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">You are offline right now.</h1>
        <p className="mt-3 text-sm text-slate-600">
          Previously opened pages may still work, and supported field actions can be queued until connectivity returns.
        </p>
      </div>
    </main>
  );
}
