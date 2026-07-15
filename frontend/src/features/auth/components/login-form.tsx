'use client';

import { AuthApi } from '@/features/auth/api';
import { getHomeRouteForUser } from '@/lib/auth/redirects';
import { tokenStore } from '@/lib/auth/token-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState('9123456789');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await AuthApi.login({ login, password });
      tokenStore.setSession({
        accessToken: response.data.accessToken,
        user: response.data.user,
      });
      router.push(getHomeRouteForUser(response.data.user));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use your admin, retailer, or staff credentials to continue.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Mobile or email</span>
          <input
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-cyan-500"
            placeholder="Enter mobile or email"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-cyan-500"
            placeholder="Enter password"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Login'}
      </button>

      <p className="mt-4 text-xs text-slate-500">
        Demo seed credentials are prefilled for quick testing against the backend.
      </p>
    </form>
  );
}
