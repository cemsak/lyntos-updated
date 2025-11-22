export const DASHBOARD_COLORS = {
  navy: "#0d203c",        // Pantone 289c
  blue: "#004A6E",        // Pantone 302c
  processBlue: "#0094D8", // Pantone Process Blue
  teal: "#008080",        // Pantone 321c
  green: "#95C23D",       // Pantone 376c
  yellow: "#F8CF00",      // Pantone 7405c
  orange: "#FF8C00",      // Pantone 1505c
  red: "#E94E24",         // Pantone 173c
  pink: "#FFC0CB",        // Pantone 1895c
  gray: "#dad9d7",        // Pantone 1c
  coolGray: "#575757",    // Cool Gray 11c
  white: "#ffffff",
  darkGray: "#63656a",    // Pantone 10c
};

/**
 * HEX renk kodunu RGBA'ya dönüştürür.
 * @param hex - "#123456" gibi hex renk kodu
 * @param alpha - 0 ile 1 arası şeffaflık
 * @returns "rgba(r,g,b,alpha)" formatında string
 */
export function withAlpha(hex: string, alpha: number): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
  const num = parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}