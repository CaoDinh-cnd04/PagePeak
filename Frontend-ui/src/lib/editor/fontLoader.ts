const loadedFonts = new Set<string>();

export const GOOGLE_FONTS = [
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
  "Abel", "Archivo", "Asap", "Bebas Neue", "Catamaran", "Comfortaa",
  "Cormorant Garamond", "Dancing Script", "EB Garamond", "Figtree",
  "Geologica", "Great Vibes", "Hind", "IBM Plex Sans", "Inter Tight",
  "Jost", "Kalam", "Lilita One", "Lobster", "Lora", "Nanum Gothic",
  "Nunito Sans", "Pacifico", "Patrick Hand", "Philosopher", "PT Serif",
  "Righteous", "Roboto Mono", "Saira", "Satisfy", "Sora", "Space Mono",
  "Spectral", "Teko", "Ubuntu Mono", "Urbanist", "Vollkorn", "Yantramanav",
  "Zilla Slab", "Abril Fatface", "Alegreya", "Amatic SC", "Archivo Narrow",
  "Barlow Condensed", "Be Vietnam Pro", "Cairo", "Chakra Petch",
  "Cinzel", "Courgette", "Domine", "Dosis", "Encode Sans",
  "Fira Code", "Fredoka", "Gloria Hallelujah", "Gudea",
];

export function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
    link.onload = () => {
      loadedFonts.add(family);
      resolve();
    };
    link.onerror = () => resolve();
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
