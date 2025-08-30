// src/components/NewsCard.jsx
// Props: { badge?, title, excerpt?, image?, big?, onClick? }
export default function NewsCard({ badge, title, excerpt, image, big = false, onClick }) {
  const base =
    "bg-white rounded-2xl shadow hover:shadow-md transition cursor-pointer overflow-hidden";

  if (big) {
    // Large hero-style card
    return (
      <article className={base} onClick={onClick}>
        {image ? (
          <div className="relative">
            <img
              src={image}
              alt={title}
              className="w-full h-48 sm:h-64 object-cover"
              loading="lazy"
            />
            {badge ? (
              <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                {badge}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="p-4">
          <h3 className="font-semibold leading-snug text-lg">{title}</h3>
          {excerpt ? <p className="text-sm text-gray-600 mt-1">{excerpt}</p> : null}
        </div>
      </article>
    );
  }

  // Compact list card
  return (
    <article className={`${base} p-3`} onClick={onClick}>
      <div className="flex gap-3">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
            loading="lazy"
          />
        ) : null}

        <div className="flex-1">
          {badge ? (
            <span className="inline-block text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
              {badge}
            </span>
          ) : null}
          <h3 className="mt-1 font-semibold leading-tight">{title}</h3>
          {excerpt ? <p className="text-sm text-gray-600 mt-1">{excerpt}</p> : null}
        </div>
      </div>
    </article>
  );
}
