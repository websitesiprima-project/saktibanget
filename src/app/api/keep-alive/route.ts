import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Keep-Alive Endpoint
 * 
 * Endpoint ini melakukan query ringan ke Supabase setiap kali dipanggil,
 * untuk mencegah auto-pause pada Supabase free tier (pause setelah 7 hari tidak aktif).
 * 
 * Cara penggunaan:
 * - Dipanggil otomatis oleh Vercel Cron setiap hari
 * - Atau dipanggil oleh external cron service (cron-job.org, UptimeRobot, dll.)
 * 
 * Endpoint dilindungi oleh CRON_SECRET agar tidak disalahgunakan.
 * Jika CRON_SECRET tidak diset, endpoint tetap bisa diakses (untuk kemudahan setup awal).
 */

// Gunakan service role key agar bypass RLS, atau fallback ke anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
    try {
        // ========== Autentikasi ==========
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret) {
            // Cek header Authorization (untuk Vercel Cron)
            const authHeader = request.headers.get('authorization');
            // Cek query parameter (untuk external cron services)
            const { searchParams } = new URL(request.url);
            const querySecret = searchParams.get('secret');

            const isAuthorized =
                authHeader === `Bearer ${cronSecret}` ||
                querySecret === cronSecret;

            if (!isAuthorized) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized - Invalid or missing secret'
                    },
                    { status: 401 }
                );
            }
        }

        // ========== Ping Supabase ==========
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing Supabase environment variables'
                },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const startTime = Date.now();

        // Query 1: Simple SELECT 1 (paling ringan)
        const { data: pingData, error: pingError } = await supabase
            .rpc('ping_keepalive')
            .maybeSingle();

        // Jika function belum ada, fallback ke query tabel profiles
        let queryResult;
        if (pingError) {
            // Fallback: query ringan ke tabel profiles (ambil 1 row saja)
            const { data, error, count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true });

            if (error) {
                // Fallback kedua: coba tabel lain
                const { data: vendorData, error: vendorError } = await supabase
                    .from('vendors')
                    .select('id', { count: 'exact', head: true });

                if (vendorError) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: `Database query failed: ${vendorError.message}`,
                            timestamp: new Date().toISOString(),
                        },
                        { status: 500 }
                    );
                }
                queryResult = { table: 'vendors', count: vendorData };
            } else {
                queryResult = { table: 'profiles', count: data };
            }
        } else {
            queryResult = { table: 'rpc:ping_keepalive', result: pingData };
        }

        const responseTime = Date.now() - startTime;

        // ========== Log Aktivitas (opsional, max 1x per 6 jam) ==========
        // Cek apakah sudah ada log dalam 6 jam terakhir untuk menghindari spam
        // (UptimeRobot ping setiap 5 menit = 288x/hari, kita hanya log 4x/hari)
        try {
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
            const { count: recentLogs } = await supabase
                .from('audit_logs')
                .select('id', { count: 'exact', head: true })
                .eq('action', 'KEEP_ALIVE_PING')
                .gte('created_at', sixHoursAgo);

            if (!recentLogs || recentLogs === 0) {
                await supabase.from('audit_logs').insert({
                    action: 'KEEP_ALIVE_PING',
                    details: JSON.stringify({
                        query: queryResult,
                        response_time_ms: responseTime,
                        source: request.headers.get('user-agent') || 'unknown',
                    }),
                    performed_by: '00000000-0000-0000-0000-000000000000', // system
                });
            }
        } catch {
            // Tidak masalah jika logging gagal, yang penting ping-nya berhasil
        }

        // ========== Response ==========
        return NextResponse.json(
            {
                success: true,
                message: '🟢 Supabase is alive! Database pinged successfully.',
                timestamp: new Date().toISOString(),
                responseTimeMs: responseTime,
                query: queryResult,
                nextPauseThreshold: '7 days of inactivity',
                status: 'active',
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Unknown error occurred',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// Juga support POST (untuk beberapa cron services yang hanya support POST)
export async function POST(request: NextRequest) {
    return GET(request);
}
