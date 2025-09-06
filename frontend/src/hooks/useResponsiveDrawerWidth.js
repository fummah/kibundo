import { useEffect, useState } from "react";

export default function useResponsiveDrawerWidth(max = 720, margin = 48) {
  const get = () =>
    Math.min(max, typeof window !== "undefined" ? window.innerWidth - margin : max);

  const [width, setWidth] = useState(get);

  useEffect(() => {
    function onResize() {
      setWidth(get());
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [max, margin]);

  return width;
}
