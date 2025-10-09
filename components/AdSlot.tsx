'use client'
import { useEffect, useRef } from 'react'

type Props = {
  slot: string
  format?: string
  style?: React.CSSProperties
}

export default function AdSlot({ slot, format = 'auto', style }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current.querySelector('ins.adsbygoogle') as any
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          try { (window as any).adsbygoogle = (window as any).adsbygoogle || []; (window as any).adsbygoogle.push({}) } catch {}
          observer.disconnect()
        }
      })
    }, { rootMargin: '200px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      <ins className="adsbygoogle"
        style={style || { display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"></ins>
    </div>
  )
}
