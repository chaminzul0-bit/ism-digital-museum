
// Vercel serverless function (ESM — package.json "type": "module")
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";


const SOURCES = [
  {
    url: "https://www.ufe.edu.mn/",
    category: "news",
  },
  {
    url: "https://training.ufe.edu.mn/",
    category: "course",
  },
  {
    url: "https://www.ufe.edu.mn/workCenterDetail/189",
    category: "department",
  },
  {
    url: "https://www.ufe.edu.mn/widgetDetail/1956",
    category: "news",
  },
  {
    url: "https://www.ufe.edu.mn/c/26/i/217?groupName=sustainable-development",
    category: "research",
  },
];

const ALLOWED_HOSTS = [
  "ufe.edu.mn",
  "www.ufe.edu.mn",
  "training.ufe.edu.mn",
];

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

async function readPage(source) {
  const url = new URL(source.url);

  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    throw new Error("Эх сурвалжийн домэйн зөвшөөрөгдөөгүй");
  }

  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "ISM-Digital-Museum/1.0",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, noscript").remove();

  const title = cleanText(
    $('meta[property="og:title"]').attr("content") ||
    $("title").first().text() ||
    $("h1").first().text()
  );

  const description = cleanText(
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $("main p").first().text() ||
    $("p").first().text()
  );

  const content = cleanText(
    $("main").text() || $("article").text() || $("body").text()
  ).slice(0, 12000);

  if (!title) {
    throw new Error("Хуудасны гарчиг олдсонгүй");
  }

  return {
    title,
    category: source.category,
    summary: description || content.slice(0, 500),
    content: {
      text: content,
    },
    source_url: source.url,
    source_name: "UFE",
    fetched_at: new Date().toISOString(),
    status: "pending",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST хүсэлт шаардлагатай" });
  }

  if (
    !process.env.IMPORT_SECRET ||
    req.headers.authorization !== `Bearer ${process.env.IMPORT_SECRET}`
  ) {
    return res.status(401).json({ error: "Зөвшөөрөлгүй хүсэлт" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error: "Supabase серверийн тохиргоо дутуу байна",
    });
  }

  // service role key зөвхөн серверт (Vercel env) — frontend-д хэзээ ч орохгүй
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const results = [];

  for (const source of SOURCES) {
    try {
      const item = await readPage(source);

      const { error } = await supabase
        .from("import_items")
        .upsert(item, {
          onConflict: "source_url",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      results.push({
        url: source.url,
        status: "success",
      });
    } catch (error) {
      results.push({
        url: source.url,
        status: "failed",
        error: error.message,
      });
    }
  }

  return res.status(200).json({
    message: "Импортын ажиллагаа дууслаа",
    results,
  });
}
