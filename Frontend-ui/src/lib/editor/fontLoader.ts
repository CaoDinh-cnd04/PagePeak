/**
 * fontLoader — Gọi thẳng Bunny Fonts API từ frontend (không qua backend).
 *
 * Bunny Fonts (https://fonts.bunny.net):
 *   - Miễn phí hoàn toàn, không cần auth
 *   - CORS đã bật sẵn → gọi thẳng từ browser
 *   - GDPR-friendly, drop-in replacement cho Google Fonts
 *   - Có 1300+ font families
 *
 * API: GET https://fonts.bunny.net/api/fonts
 * Response: { "inter": { styles: ["400", "700", ...], ... }, "roboto": {...}, ... }
 *
 * Load font face: https://fonts.bunny.net/css?family=Inter:400,700&display=swap
 */

const BUNNY_API = "https://fonts.bunny.net/api/fonts";
const BUNNY_CDN = "https://fonts.bunny.net/css";

const loadedFonts = new Set<string>();

// ─── Module-level cache ───────────────────────────────────────────────────

let _fontsCache: string[] = [];
let _loaded = false;

function toTitleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Tải danh sách font trực tiếp từ Bunny Fonts API — chỉ gọi 1 lần (có cache). */
export async function fetchFontList(limit = 300): Promise<string[]> {
  if (_loaded && _fontsCache.length > 0) return _fontsCache.slice(0, limit);

  try {
    const res = await fetch(BUNNY_API, {
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      // Keys là slug dạng "inter", "open-sans" → chuyển về Title Case
      const families = Object.keys(data)
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));

      if (families.length > 0) {
        _fontsCache = families;
        _loaded = true;
        return _fontsCache.slice(0, limit);
      }
    }
  } catch (err) {
    console.warn("[FontLoader] Bunny Fonts API không khả dụng:", err);
  }

  // Fallback: curated list phổ biến nhất
  if (_fontsCache.length === 0) {
    _fontsCache = [
      "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito",
      "Raleway", "Ubuntu", "Playfair Display", "Merriweather", "Source Sans 3",
      "Oswald", "Noto Sans", "PT Sans", "Roboto Condensed", "Roboto Slab",
      "Quicksand", "Work Sans", "Mulish", "Barlow", "DM Sans", "Rubik",
      "Manrope", "Karla", "Josefin Sans", "Libre Baskerville", "Space Grotesk",
      "Cabin", "Arimo", "Overpass", "Assistant", "Bitter", "Crimson Text",
      "Exo 2", "Fira Sans", "Heebo", "Inconsolata", "Kanit", "Lexend",
      "Libre Franklin", "Maven Pro", "Mukta", "Noto Serif", "Outfit",
      "Plus Jakarta Sans", "Prompt", "Public Sans", "Red Hat Display",
      "Signika", "Titillium Web", "Varela Round", "Yanone Kaffeesatz",
      "Bebas Neue", "Comfortaa", "Dancing Script", "EB Garamond", "Figtree",
      "Great Vibes", "IBM Plex Sans", "Lobster", "Lora", "Nunito Sans",
      "Pacifico", "PT Serif", "Righteous", "Roboto Mono", "Satisfy", "Sora",
      "Spectral", "Ubuntu Mono", "Urbanist", "Be Vietnam Pro", "Cairo",
      "Fredoka", "Gloria Hallelujah",
    ];
    _loaded = true;
  }

  return _fontsCache.slice(0, limit);
}

/**
 * Tải font face qua Bunny Fonts CDN — gọi thẳng từ browser.
 * Tự động fallback sang Google Fonts nếu Bunny không khả dụng.
 */
export function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const slug = family.toLowerCase().replace(/\s+/g, "-");

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${BUNNY_CDN}?family=${slug}:300,400,500,600,700,800,900&display=swap`;
    link.onload = () => {
      loadedFonts.add(family);
      resolve();
    };
    link.onerror = () => {
      // Fallback sang Google Fonts nếu Bunny không khả dụng
      const fallback = document.createElement("link");
      fallback.rel = "stylesheet";
      fallback.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
      fallback.onload = () => { loadedFonts.add(family); resolve(); };
      fallback.onerror = () => resolve();
      document.head.appendChild(fallback);
    };
    document.head.appendChild(link);
  });
}

export async function loadFontsFromSections(
  sections: { elements: { styles: Record<string, string | number> }[] }[]
): Promise<void> {
  const fonts = new Set<string>();
  for (const section of sections) {
    for (const el of section.elements) {
      const ff = el.styles?.fontFamily;
      if (typeof ff === "string" && ff && ff !== "Inter") fonts.add(ff);
    }
  }
  await Promise.all(Array.from(fonts).map(loadGoogleFont));
}

/** @deprecated Dùng fetchFontList() thay thế */
export const GOOGLE_FONTS = _fontsCache;
