import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramReply, answerCallbackQuery, editMessageText } from '@/lib/telegramUtils';
import { getDashboardVendorData, getAllVendors } from '@/services/vendorService';
import { contractService } from '@/services/contractService';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Disable caching for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const update = await req.json();

        // 1. Handle Callback Queries (Button Clicks)
        if (update.callback_query) {
            const query = update.callback_query;
            const data = query.data;
            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;

            if (data.startsWith('approve_surat:') || data.startsWith('reject_surat:')) {
                const parts = data.split(':');
                const action = parts[0];
                const suratId = parts[1];
                const status = action === 'approve_surat' ? 'APPROVED' : 'REJECTED';

                // Use Admin Client to bypass RLS
                const { error } = await supabaseAdmin
                    .from('surat_pengajuan')
                    .update({
                        status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', suratId);

                if (error) {
                    console.error('Database Update Error:', error);
                    await answerCallbackQuery(query.id, 'Gagal update database ❌');
                    return NextResponse.json({ ok: true });
                }

                if (status === 'APPROVED') {
                    await answerCallbackQuery(query.id, 'Surat disetujui ✅');
                    await editMessageText(chatId, messageId, `✅ <b>Surat Disetujui</b>\n\nSurat ini telah disetujui via Telegram.`);
                } else {
                    await answerCallbackQuery(query.id, 'Surat ditolak ❌');
                    await editMessageText(chatId, messageId, `❌ <b>Surat Ditolak</b>\n\nSurat ini telah ditolak via Telegram.`);
                }
            }

            return NextResponse.json({ ok: true });
        }

        // 2. Handle Messages (Commands)
        if (update.message && update.message.text) {
            const text = update.message.text.trim();
            const chatId = update.message.chat.id;

            // =====================
            // /start atau /help
            // =====================
            if (text === '/start' || text === '/help') {
                const helpText = `
🤖 <b>SAKTI PLN Bot Information</b>
Sistem Administrasi Kontrak Terpadu - PT PLN UPT Manado

━━━━━━━━━━━━━━━━━━━
📊 <b>STATISTIK</b>
/stats — Ringkasan total vendor, kontrak, & aset

━━━━━━━━━━━━━━━━━━━
📄 <b>KONTRAK</b>
/active — Daftar kontrak aktif
/deadline — Kontrak mendekati deadline (30 hari)
/expired — Kontrak yang sudah berakhir

━━━━━━━━━━━━━━━━━━━
🏢 <b>VENDOR</b>
/vendor — Daftar vendor terbaru

━━━━━━━━━━━━━━━━━━━
📋 <b>SURAT PENGAJUAN</b>
/surat — Surat pengajuan yang masih PENDING

━━━━━━━━━━━━━━━━━━━
❓ <b>BANTUAN</b>
/help — Tampilkan daftar perintah ini

Bot ini juga mengirim notifikasi otomatis saat ada surat pengajuan masuk yang memerlukan persetujuan.
`.trim();
                await sendTelegramReply(chatId, helpText);

                // =====================
                // /stats
                // =====================
            } else if (text === '/stats') {
                const vendorData = await getDashboardVendorData() as any;
                const contracts = await contractService.getAllContracts() as any;

                const { data: asetData } = await supabaseAdmin.from('assets').select('status');
                const totalAssets = asetData ? asetData.length : 0;

                const { data: suratData } = await supabaseAdmin
                    .from('surat_pengajuan')
                    .select('status');
                const pendingSurat = suratData ? suratData.filter((s: any) => s.status === 'PENDING').length : 0;

                const totalVendors = vendorData.data?.total || 0;
                const totalContracts = contracts.data ? contracts.data.length : 0;
                const activeContracts = contracts.data ? contracts.data.filter((c: any) => c.status === 'Aktif').length : 0;
                const expiredContracts = contracts.data ? contracts.data.filter((c: any) => c.status === 'Tidak Aktif' || c.status === 'Berakhir').length : 0;

                const reply = `
📊 <b>Statistik Sistem SAKTI PLN</b>
📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

━━━━━━━━━━━━━━━━━━━
🏢 <b>Vendor</b>
   Total: <b>${totalVendors}</b> vendor

📄 <b>Kontrak</b>
   Total: <b>${totalContracts}</b> kontrak
   ✅ Aktif: <b>${activeContracts}</b>
   ❌ Berakhir: <b>${expiredContracts}</b>

🗂️ <b>Aset</b>
   Total: <b>${totalAssets}</b> aset

📋 <b>Surat Pengajuan</b>
   ⏳ Menunggu Persetujuan: <b>${pendingSurat}</b>
`.trim();
                await sendTelegramReply(chatId, reply);

                // =====================
                // /active
                // =====================
            } else if (text === '/active') {
                const contracts = await contractService.getAllContracts() as any;
                const activeList = contracts.data ? contracts.data.filter((c: any) => c.status === 'Aktif') : [];

                if (activeList.length === 0) {
                    await sendTelegramReply(chatId, 'ℹ️ Tidak ada kontrak aktif saat ini.');
                } else {
                    let reply = `📋 <b>Daftar Kontrak Aktif (${activeList.length})</b>\n\n`;
                    activeList.slice(0, 10).forEach((c: any, index: number) => {
                        reply += `${index + 1}. <b>${c.nama_pekerjaan}</b>\n   📝 ${c.nomor_kontrak}\n\n`;
                    });
                    if (activeList.length > 10) {
                        reply += `<i>... dan ${activeList.length - 10} kontrak lainnya</i>`;
                    }
                    await sendTelegramReply(chatId, reply);
                }

                // =====================
                // /deadline
                // =====================
            } else if (text === '/deadline') {
                const contracts = await contractService.getAllContracts() as any;
                const now = new Date();
                const deadlineList = contracts.data ? contracts.data.filter((c: any) => {
                    const endDate = new Date(c.tanggal_akhir);
                    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 30 && c.status === 'Aktif';
                }) : [];

                if (deadlineList.length === 0) {
                    await sendTelegramReply(chatId, '✅ Tidak ada kontrak yang mendekati deadline dalam 30 hari ke depan.');
                } else {
                    let reply = `⚠️ <b>Kontrak Mendekati Deadline (${deadlineList.length})</b>\n\n`;
                    deadlineList.forEach((c: any) => {
                        const endDate = new Date(c.tanggal_akhir);
                        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        reply += `🔥 <b>${c.nama_pekerjaan}</b>\n   📅 Berakhir: ${endDate.toLocaleDateString('id-ID')} (<b>${diffDays} hari lagi</b>)\n\n`;
                    });
                    await sendTelegramReply(chatId, reply);
                }

                // =====================
                // /expired
                // =====================
            } else if (text === '/expired') {
                const contracts = await contractService.getAllContracts() as any;
                const now = new Date();
                const expiredList = contracts.data ? contracts.data.filter((c: any) => {
                    const endDate = new Date(c.tanggal_akhir);
                    return endDate < now;
                }) : [];

                if (expiredList.length === 0) {
                    await sendTelegramReply(chatId, '✅ Tidak ada kontrak yang sudah berakhir.');
                } else {
                    let reply = `❌ <b>Kontrak Sudah Berakhir (${expiredList.length})</b>\n\n`;
                    expiredList.slice(0, 10).forEach((c: any, index: number) => {
                        const endDate = new Date(c.tanggal_akhir);
                        reply += `${index + 1}. <b>${c.nama_pekerjaan}</b>\n   📅 Berakhir: ${endDate.toLocaleDateString('id-ID')}\n\n`;
                    });
                    if (expiredList.length > 10) {
                        reply += `<i>... dan ${expiredList.length - 10} kontrak lainnya</i>`;
                    }
                    await sendTelegramReply(chatId, reply);
                }

                // =====================
                // /vendor
                // =====================
            } else if (text === '/vendor') {
                const vendorData = await getDashboardVendorData() as any;
                const total = vendorData.data?.total || 0;
                const recent = vendorData.data?.recent || [];

                let reply = `🏢 <b>Data Vendor (Total: ${total})</b>\n\n`;
                reply += `<b>5 Vendor Terbaru:</b>\n\n`;
                recent.forEach((v: any, index: number) => {
                    reply += `${index + 1}. <b>${v.nama}</b>\n   📌 ${v.kategori || '-'} | 🔵 ${v.status}\n\n`;
                });
                await sendTelegramReply(chatId, reply);

                // =====================
                // /surat
                // =====================
            } else if (text === '/surat') {
                const { data: suratList, error } = await supabaseAdmin
                    .from('surat_pengajuan')
                    .select('*')
                    .eq('status', 'PENDING')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error || !suratList || suratList.length === 0) {
                    await sendTelegramReply(chatId, '✅ Tidak ada surat pengajuan yang menunggu persetujuan.');
                } else {
                    let reply = `📋 <b>Surat Pengajuan PENDING (${suratList.length})</b>\n\n`;
                    suratList.forEach((s: any, index: number) => {
                        const tgl = new Date(s.created_at).toLocaleDateString('id-ID');
                        reply += `${index + 1}. <b>${s.perihal}</b>\n   📄 ${s.nomor_surat} | 📅 ${tgl}\n\n`;
                    });
                    reply += `<i>Gunakan dashboard web untuk approve/reject surat.</i>`;
                    await sendTelegramReply(chatId, reply);
                }

                // =====================
                // Perintah tidak dikenal
                // =====================
            } else if (text.startsWith('/')) {
                await sendTelegramReply(chatId, `❓ Perintah <b>${text}</b> tidak dikenal.\n\nKetik /help untuk melihat daftar perintah yang tersedia.`);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
