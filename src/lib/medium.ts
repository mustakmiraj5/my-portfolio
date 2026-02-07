import { XMLParser } from "fast-xml-parser";

export type BlogPost = {
  title: string;
  link: string;
  date: string;
  read: string;
};

const MEDIUM_FEED_URL = "https://medium.com/feed/@msmiraj8";

const formatDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const estimateReadTime = (content?: string) => {
  if (!content) return "4 min read";
  const words = content.replace(/<[^>]+>/g, "").trim().split(/\s+/).length;
  const minutes = Math.max(3, Math.round(words / 220));
  return `${minutes} min read`;
};

export const fetchMediumPosts = async (): Promise<BlogPost[]> => {
  try {
    const response = await fetch(MEDIUM_FEED_URL, { cache: "no-store" });
    if (!response.ok) return [];
    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);
    const items = data?.rss?.channel?.item ?? [];
    const list = Array.isArray(items) ? items : [items];
    return list.slice(0, 4).map((item: any) => ({
      title: item.title ?? "Untitled",
      link: item.link ?? "#",
      date: formatDate(item.pubDate ?? ""),
      read: estimateReadTime(item["content:encoded"] ?? ""),
    }));
  } catch {
    return [];
  }
};
