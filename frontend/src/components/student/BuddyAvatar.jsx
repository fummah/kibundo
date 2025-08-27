export default function BuddyAvatar({ src, size = 112, ring = true, alt = "Buddy" }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover ${ring ? "ring-4 ring-white shadow" : ""}`}
    />
  );
}
