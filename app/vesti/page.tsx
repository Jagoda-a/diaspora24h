// app/vesti/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { CATS, getCatImage } from '@/lib/cats'
import { prisma } from '@/lib/db'

export default async function VestiKategorijePage() {
  // opciono: broj vesti po kategoriji (za bedž)
  const grouped = await prisma.article.groupBy({
    by: ['category'],
    _count: { _all: true },
  })
  const counts = Object.fromEntries(grouped.map(g => [g.category, g._count._all as number]))

  return (
    <main>
      <h1 style={{fontSize:'22px', margin:'0 0 12px 0'}}>Vesti</h1>
      <p style={{opacity:.8, margin:'0 0 16px 0'}}>Izaberi kategoriju</p>

      <div className="cards-grid">
        {CATS.filter(c => c.slug !== 'nepoznato').map(c => {
          const img = getCatImage(c.slug)
          const count = counts[c.slug] || 0
          return (
            <Link key={c.slug} className="card" href={`/vesti/k/${c.slug}`} style={{padding:0, overflow:'hidden'}}>
              <div style={{position:'relative', width:'100%', aspectRatio:'16/9'}}>
                <Image
                  src={img}
                  alt={c.label}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  style={{objectFit:'cover'}}
                  priority={false}
                />
                {/* overlay */}
                <div style={{
                  position:'absolute',
                  inset:0,
                  background:'linear-gradient(180deg, rgba(0,0,0,0.0) 25%, rgba(0,0,0,0.55) 100%)'
                }}/>
                <div style={{
                  position:'absolute',
                  left:12, right:12, bottom:12,
                  color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between'
                }}>
                  <h2 style={{margin:0, fontSize:18}}>{c.label}</h2>
                  <span style={{
                    background:'rgba(255,255,255,0.2)',
                    padding:'2px 8px',
                    borderRadius:999,
                    fontSize:12,
                  }}>
                    {count} vesti
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
