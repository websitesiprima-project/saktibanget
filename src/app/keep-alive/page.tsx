'use client';

import { useState } from 'react';

export default function KeepAliveDashboard() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pingSupabase = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch('/api/keep-alive');
            const data = await res.json();

            if (res.ok) {
                setResult(data);
            } else {
                setError(data.error || 'Ping failed');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
                <div className="text-center mb-6">
                    <div className="text-4xl mb-3">💓</div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Supabase Keep-Alive
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Cek status koneksi database Supabase Anda
                    </p>
                </div>

                <button
                    onClick={pingSupabase}
                    disabled={loading}
                    className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                        }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Pinging...
                        </span>
                    ) : (
                        '🏓 Ping Supabase'
                    )}
                </button>

                {result && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-semibold text-green-700">
                                Database Aktif!
                            </span>
                        </div>
                        <div className="space-y-1.5 text-sm text-green-600">
                            <p>
                                <span className="font-medium">Response Time:</span>{' '}
                                {result.responseTimeMs}ms
                            </p>
                            <p>
                                <span className="font-medium">Timestamp:</span>{' '}
                                {new Date(result.timestamp).toLocaleString('id-ID')}
                            </p>
                            <p>
                                <span className="font-medium">Query:</span>{' '}
                                {result.query?.table || 'N/A'}
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <span className="font-semibold text-red-700">Error!</span>
                        </div>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <h3 className="font-semibold text-blue-800 text-sm mb-2">
                        ℹ️ Informasi
                    </h3>
                    <ul className="text-xs text-blue-600 space-y-1.5">
                        <li>
                            • Supabase free tier akan <strong>auto-pause</strong> setelah 7
                            hari tanpa aktivitas
                        </li>
                        <li>
                            • Sistem ini melakukan ping otomatis setiap <strong>2 hari</strong>{' '}
                            via Vercel Cron
                        </li>
                        <li>
                            • Anda juga bisa setup{' '}
                            <a
                                href="https://cron-job.org"
                                target="_blank"
                                className="underline"
                            >
                                cron-job.org
                            </a>{' '}
                            atau{' '}
                            <a
                                href="https://uptimerobot.com"
                                target="_blank"
                                className="underline"
                            >
                                UptimeRobot
                            </a>{' '}
                            sebagai backup
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
