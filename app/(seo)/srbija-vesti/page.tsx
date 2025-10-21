// app/(seo)/srbija-vesti/page.tsx
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Srbija vesti – najnovije vesti i dešavanja | Diaspora24h',
  description: 'Srbija vesti: politika, ekonomija, društvo, sport – ažurirano više puta dnevno.',
  alternates: { canonical:'/srbija-vesti', languages: { 'sr-RS':'/srbija-vesti' } },
  openGraph: { title:'Srbija vesti – Diaspora24h', description:'Najnovije vesti iz Srbije za dijasporu.', url:'/srbija-vesti', type:'website' },
}
export { default } from '../vesti-u-srbiji/page'
