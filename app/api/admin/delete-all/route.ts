// app/api/admin/delete-all/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  try {
    const count = await prisma.article.deleteMany({})
    return NextResponse.json({ ok: true, deleted: count.count })
  } catch (err) {
    console.error('Greška pri brisanju svih vesti:', err)
    return NextResponse.json({ ok: false, error: 'Brisanje nije uspelo' }, { status: 500 })
  }
}
