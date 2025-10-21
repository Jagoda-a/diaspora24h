// app/admin/bulk-category/page.tsx
import AdminBulkCategoryClient from '@/app/admin/ui/AdminBulkCategoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Masovna promena kategorije</h1>
      <p style={{ color: 'var(--muted)', marginTop: 6 }}>
        Izaberi ciljnu kategoriju, čekiraj vesti i klikni Prebaci.
      </p>
      <AdminBulkCategoryClient />
    </main>
  )
}
