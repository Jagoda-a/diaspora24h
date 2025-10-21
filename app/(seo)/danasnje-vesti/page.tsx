// app/(seo)/vesti-danas/page.tsx
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Današnje vesti – najvažnije iz minuta u minut | Diaspora24h',
  description: 'Današnje vesti iz Srbije i regiona: politika, ekonomija, društvo, sport – pregled za dijasporu.',
  alternates: { canonical:'/danasnje-vesti', languages: { 'sr-RS':'/danasnje-vesti' } },
  openGraph: { title:'Današnje vesti – Diaspora24h', description:'Iz minuta u minut – pregled najvažnijih vesti.', url:'/vesti-danas', type:'website' }
}
export { default } from '../najnovije-vesti/page'
