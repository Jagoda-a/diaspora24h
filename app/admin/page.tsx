// app/admin/page.tsx
export const dynamic = 'force-dynamic'

import AdminClient from './ui/AdminClient'

export default async function Page() {
  // Ako ovde koristiš prisma za listu, to je ok – proslediš preko props
  // const initial = await prisma.article.findMany({ select: { id: true, title: true, slug: true }, orderBy: { updatedAt: 'desc' }, take: 50 })

  return <AdminClient /* initial={initial} */ />
}
