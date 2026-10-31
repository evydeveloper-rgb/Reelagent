// Pull copy, brand colors, logo and imagery from a website.
// Uses Firecrawl (screenshot + brand extraction) when FIRECRAWL_API_KEY is set, otherwise plain HTML.

export type SiteInfo = {
  url: string;
  title: string;
  description: string;
  text: string;
  colors: string[];
  logoUrl: string | null;
  imageUrls: string[]; // best first
};

const MAX_TEXT = 8000;

export async function scrapeSite(rawUrl: string): Promise<SiteInfo> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      return await firecrawl(url);
    } catch (e) {
      console.warn("firecrawl failed, falling back to fetch", e);
    }
  }
  return await plainFetch(url);
}

async function firecrawl(url: string): Promise<SiteInfo> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "images", "branding", { type: "screenshot", fullPage: false }],
      onlyMainContent: false,
    }),
  });
  if (!res.ok) throw new Error(`firecrawl ${res.status}: ${await res.text()}`);
  // Response shape is loosely typed on purpose; every field is optional.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = (await res.json()).data ?? {};
  const meta = d.metadata ?? {};
  const branding = d.branding ?? {};
  const colors = Object.values(branding.colors ?? {}).filter(
    (c): c is string => typeof c === "string" && c.startsWith("#"),
  );
  const images = [
    d.screenshot,
    meta.ogImage ?? meta["og:image"],
    branding.images?.ogImage,
    ...(Array.isArray(d.images) ? d.images : []),
  ].filter((u): u is string => typeof u === "string" && /^https?:/.test(u));
  return {
    url,
    title: meta.title ?? meta.ogTitle ?? "",
    description: meta.description ?? meta.ogDescription ?? "",
    text: String(d.markdown ?? "").slice(0, MAX_TEXT),
    colors,
    logoUrl: branding.images?.logo ?? branding.logo ?? null,
    imageUrls: dedupe(images).slice(0, 12),
  };
}

async function plainFetch(url: string): Promise<SiteInfo> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ReelAgent/1.0)" } });
  const html = await res.text();
  const meta = (name: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)`, "i"))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i"))?.[1];
  const abs = (u: string) => {
    try {
      return new URL(u, url).toString();
    } catch {
      return null;
    }
  };

  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const icon = html.match(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*href=["']([^"']+)/i)?.[1];
  const logo = imgs.find((s) => /logo/i.test(s)) ?? icon;
  const text = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const theme = meta("theme-color");

  return {
    url,
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? meta("og:title") ?? "",
    description: meta("description") ?? meta("og:description") ?? "",
    text: text.slice(0, MAX_TEXT),
    colors: theme ? [theme] : [],
    logoUrl: logo ? abs(logo) : null,
    imageUrls: dedupe(
      [meta("og:image"), meta("twitter:image"), ...imgs.filter((s) => !/logo|icon|sprite|pixel|\.svg/i.test(s))]
        .filter((u): u is string => !!u)
        .map(abs)
        .filter((u): u is string => !!u),
    ).slice(0, 12),
  };
}

function dedupe(xs: string[]) {
  return [...new Set(xs)];
}
