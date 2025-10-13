import Link from "next/link";

export default function CategoryTile({
  slug,
  label,
  count,
}: {
  slug: string;
  label: string;
  count: number;
}) {
  const cover = `/cats/${slug}.webp`; // statička slika iz /public/cats

  return (
    <Link
      href={`/vesti/k/${encodeURIComponent(slug)}`}
      className="block border border-neutral-200 rounded-md overflow-hidden hover:shadow-sm transition"
      prefetch
    >
      <div className="w-full aspect-[16/9] bg-neutral-100">
        <img
          src={cover}
          alt={label}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="p-3 flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-neutral-500">{count}</span>
      </div>
    </Link>
  );
}
