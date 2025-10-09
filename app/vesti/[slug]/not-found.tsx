// app/vesti/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card">
        <h1>Vest nije pronađena</h1>
        <p>Link je možda zastareo ili je vest uklonjena.</p>
      </div>
    </main>
  )
}
