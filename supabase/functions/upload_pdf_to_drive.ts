// @ts-nocheck
// This file runs in Deno runtime (Supabase Edge Functions)
import { serve } from 'std/server'
import { google } from 'npm:googleapis@118.0.0'

serve(async (req) => {
  try {
    // 1. Ambil secrets dari env
    const GOOGLE_CLIENT_EMAIL = Deno.env.get('GOOGLE_CLIENT_EMAIL')
    const GOOGLE_PRIVATE_KEY = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n')
    const DRIVE_FOLDER_ID = Deno.env.get('DRIVE_FOLDER_ID')

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !DRIVE_FOLDER_ID) {
      return new Response(JSON.stringify({ error: 'Missing Google credentials' }), { status: 500 })
    }

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get('file')
    const contractId = formData.get('contract_id')

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 })
    }

    // 3. Validasi PDF
    if (file.type !== 'application/pdf') {
      return new Response(JSON.stringify({ error: 'File must be a PDF' }), { status: 400 })
    }

    // 4. Setup Google Auth
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      undefined,
      GOOGLE_PRIVATE_KEY,
      ['https://www.googleapis.com/auth/drive']
    )
    const drive = google.drive({ version: 'v3', auth })

    // 5. Upload ke Google Drive
    const buffer = await file.arrayBuffer()
    const fileName = `contract_${contractId || Date.now()}.pdf`
    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [DRIVE_FOLDER_ID],
        mimeType: 'application/pdf'
      },
      media: {
        mimeType: 'application/pdf',
        body: new Blob([buffer])
      },
      fields: 'id,webViewLink'
    })

    // 6. Set file permission (anyone with link can view)
    await drive.permissions.create({
      fileId: uploadRes.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })

    // 7. Get webViewLink
    const { id, webViewLink } = (await drive.files.get({
      fileId: uploadRes.data.id,
      fields: 'id,webViewLink'
    })).data

    return new Response(JSON.stringify({ fileId: id, webViewLink }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), { status: 500 })
  }
})
