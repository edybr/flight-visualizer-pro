import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description?: string;
  /** Lista de palavras-chave separadas por vírgula ou array de strings. */
  keywords?: string | string[];
  /** Caminho relativo (ex: /app). Usado para canonical e og:url. */
  path?: string;
  /** Se true, instrui crawlers a não indexar (áreas privadas/admin). */
  noindex?: boolean;
  image?: string;
}

const SITE_NAME = "Flight Visualizer Pro";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Aplica título e metadados de SEO à página atual de forma declarativa.
 * Mantém o app preparado para indexação, Open Graph e canonical URLs.
 */
export function useSeo({ title, description, keywords, path, noindex, image }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
    document.title = fullTitle;

    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    if (keywords) {
      const kw = Array.isArray(keywords) ? keywords.join(", ") : keywords;
      setMeta("name", "keywords", kw);
    }

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:card", "summary_large_image");

    if (image) {
      setMeta("property", "og:image", image);
      setMeta("name", "twitter:image", image);
    }

    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    if (typeof window !== "undefined") {
      const url = `${window.location.origin}${path ?? window.location.pathname}`;
      setLink("canonical", url);
      setMeta("property", "og:url", url);
    }
  }, [title, description, keywords, path, noindex, image]);
}
