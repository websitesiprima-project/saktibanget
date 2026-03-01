import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramReply, answerCallbackQuery, editMessageText } from '@/lib/telegramUtils';
import { getDashboardVendorData } from '@/services/vendorService';
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
            const text = update.message.text;
            const chatId = update.message.chat.id;

            if (text === '/start' || text === '/help') {
                const helpText = `
🤖 <b>SAKTI PLN Bot Information</b>

Halo! Saya adalah bot resmi sistem SAKTI PLN.

📋 <b>Daftar Perintah:</b>

/stats — Statistik ringkasan sistem
   (Total Vendor, Total Kontrak, Kontrak Aktif)

/active — Daftar semua kontrak yang aktif

/deadline — Kontrak yang mendekati deadline
   (dalam 30 hari ke depan)

/help — Tampilkan pesan bantuan ini

Selain itu, saya juga akan mengirimkan notifikasi otomatis untuk pengajuan surat yang memerlukan persetujuan.
`.trim();
                await sendTelegramReply(chatId, helpText);

            } else if (text === '/stats') {
                const vendorData = await getDashboardVendorData() as any;
                const contracts = await contractService.getAllContracts() as any;

                const totalVendors = vendorData.data?.total || 0;
                const totalContracts = contracts.data ? contracts.data.length : 0;
                const activeContracts = contracts.data ? contracts.data.filter((c: any) => c.status === 'Aktif').length : 0;

                const reply = `
<b>📊 Statistik Terkini</b>

🏢 <b>Total Vendor:</b> ${totalVendors}
📄 <b>Total Kontrak:</b> ${totalContracts}
✅ <b>Kontrak Aktif:</b> ${activeContracts}
`;
                await sendTelegramReply(chatId, reply);

            } else if (text === '/active') {
                const contracts = await contractService.getAllContracts() as any;
                const activeList = contracts.data ? contracts.data.filter((c: any) => c.status === 'Aktif') : [];

                if (activeList.length === 0) {
                    await sendTelegramReply(chatId, 'ℹ️ Tidak ada kontrak aktif saat ini.');
                } else {
                    let reply = '<b>📋 Daftar Kontrak Aktif:</b>\n\n';
                    activeList.forEach((c: any, index: number) => {
                        reply += `${index + 1}. <b>${c.nama_pekerjaan}</b>\n   Nomor: ${c.nomor_kontrak}\n\n`;
                    });
                    await sendTelegramReply(chatId, reply);
                }

            } else if (text === '/deadline') {
                const contracts = await contractService.getAllContracts() as any;
                const now = new Date();
                const deadlineList = contracts.data ? contracts.data.filter((c: any) => {
                    const endDate = new Date(c.tanggal_akhir);
                    const diffTime = endDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 30 && c.status === 'Aktif';
                }) : [];

                if (deadlineList.length === 0) {
                    await sendTelegramReply(chatId, '✅ Tidak ada kontrak yang mendekati deadline (30 hari).');
                } else {
                    let reply = '<b>⚠️ Kontrak Mendekati Deadline:</b>\n\n';
                    deadlineList.forEach((c: any) => {
                        const endDate = new Date(c.tanggal_akhir);
                        reply += `🔥 <b>${c.nama_pekerjaan}</b>\n   Berakhir: ${endDate.toLocaleDateString()}\n\n`;
                    });
                    await sendTelegramReply(chatId, reply);
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
