// app/admin/ui/CoverUpload.tsx
'use client'

import { useRef, useState } from 'react'

type Props = {
  onUploaded: (url: string) => void
  accept?: string
  maxBytes?: number
}

export default function CoverUpload({ onUploaded, accept = 'image/*', maxBytes = 5 * 1024 * 1024 }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > maxBytes) {
      setErr(`Fajl je ${(f.size/1024/1024).toFixed(1)} MB; maksimum ${(maxBytes/1024/1024).toFixed(1)} MB.`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Greška pri uploadu')
      onUploaded(data.url)
    } catch (e: any) {
      setErr(e?.message || 'Greška pri uploadu')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <input ref={fileRef} type="file" accept={accept} onChange={handleFile} disabled={busy} />
      {busy && <span>Otpremam…</span>}
      {err && <span style={{ color: '#dc2626' }}>{err}</span>}
    </div>
  )
}
