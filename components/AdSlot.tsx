'use client'
import { useEffect, useRef } from 'react'

type Props = {
  slot: string
  format?: string
  style?: React.CSSProperties
}

export default function AdSlot({ slot, format = 'auto', style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''

  // Ako nema client ID-ja ili slot-a, nemoj ništa da prikazuješ
  if (!client || !slot) return null

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current.querySelector('ins.adsbygoogle') as HTMLModElement | null
    if (!el) return

    // Izbegni dupli push ako je već inicijalizovano
    if ((el as any).__adsbygoogle_loaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            try {
              ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
              ;(window as any).adsbygoogle.push({})
              ;(el as any).__adsbygoogle_loaded = true
            } catch {}
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px' }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      <ins
        className="adsbygoogle"
        style={style || { display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        // test mod u dev okruženju (bez pravih impresija)
        data-adtest={process.env.NODE_ENV !== 'production' ? 'on' : undefined}
      />
    </div>
  )
}
