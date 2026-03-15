/**
 * Process JCF crime articles: fetch page, extract text, analyze with Gemini, return structured JSON.
 * Requires GEMINI_API_KEY or VITE_GEMINI_API_KEY in the environment.
 * Run: node processCrimeArticle.js   (processes crime-data.json and writes crime-data.csv)
 */
import axios from "axios";
import { load } from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCRNFPWJHLYu2R6oPdA2ZrnLgn6DbeqJIw";
// Newer model for new API users; fallback: gemini-1.5-pro or gemini-pro
const GEMINI_MODEL = "gemini-2.5-flash";

const EXTRACT_SCHEMA = {
  crime_type: "string (murder, shooting, robbery, firearm offence, etc)",
  location: "string",
  date: "YYYY or YYYY-MM-DD if available",
  summary: "short 2–3 sentence description of the crime",
  people_involved: ["names if available"],
  sentence_or_outcome: "court outcome if mentioned",
};

const PROMPT = `You are analyzing a Jamaica Constabulary Force (JCF) news article about a crime or court outcome.

Extract structured information and return ONLY a single valid JSON object (no markdown, no code fence, no extra text) in this exact shape:

{
  "crime_type": "<string: murder, shooting, robbery, firearm offence, ammunition, etc. Infer from the text>",
  "location": "<string: parish, town, area, or Jamaica if unspecified>",
  "date": "<YYYY or YYYY-MM-DD if available; otherwise empty string>",
  "summary": "<2–3 sentence concise description of what happened>",
  "people_involved": ["<array of names if mentioned; empty array if none>"],
  "sentence_or_outcome": "<court outcome, sentence, or resolution if mentioned; otherwise empty string>"
}

Rules:
- Infer crime_type from the article (e.g. murder, shooting, robbery, firearm/ammunition offence).
- Extract or estimate the date if possible; use YYYY or YYYY-MM-DD; leave "" if unknown.
- Keep summary concise (2–3 sentences).
- Return only valid JSON, no other text.`;

/**
 * Fetches the article page and extracts main body text (paragraphs inside article content).
 * @param {string} url - Article URL
 * @returns {Promise<string>} - Concatenated paragraph text
 */
async function fetchAndExtractArticleText(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JCF-CrimeBot/1.0)" },
    timeout: 15000,
  });
  const $ = load(data);

  const selectors = [
    "article .entry-content p",
    "article .post-content p",
    ".entry-content p",
    ".post-content p",
    "article .content p",
    "main article p",
    "article p",
  ];

  let text = "";
  for (const sel of selectors) {
    const paragraphs = $(sel);
    if (paragraphs.length) {
      paragraphs.each((_, el) => {
        text += $(el).text().trim() + "\n";
      });
      break;
    }
  }

  if (!text.trim()) {
    const allParagraphs = $("article p, .entry-content p, .post-content p, main p");
    allParagraphs.each((_, el) => {
      text += $(el).text().trim() + "\n";
    });
  }

  return text.trim() || $("body").text().trim().slice(0, 15000);
}

/**
 * Sends extracted article text to Gemini and returns structured crime JSON.
 * @param {string} articleText - Plain text of the article
 * @param {string} [title] - Article title for context
 * @returns {Promise<object>} - Structured crime info
 */
async function analyzeWithGemini(articleText, title = "") {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY or VITE_GEMINI_API_KEY in environment");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const input = title ? `Article title: ${title}\n\nArticle text:\n${articleText}` : articleText;
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\n---\n\n${input}` }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  });

  const response = result.response;
  if (!response || !response.text) {
    throw new Error("Gemini returned no text");
  }

  const raw = response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;
  return JSON.parse(jsonStr);
}

/**
 * Processes a JCF crime article: fetches page, extracts content, and returns structured crime data via Gemini.
 * @param {object} article - { title: string, date: string, link: string }
 * @returns {Promise<object>} - { crime_type, location, date, summary, people_involved, sentence_or_outcome }
 */
export async function processCrimeArticle(article) {
  const { title = "", link } = article || {};
  if (!link) {
    throw new Error("article.link is required");
  }

  const articleText = await fetchAndExtractArticleText(link);
  if (!articleText) {
    return {
      crime_type: "",
      location: "",
      date: article.date || "",
      summary: "",
      people_involved: [],
      sentence_or_outcome: "",
      _raw: { title, link, extracted_length: 0 },
    };
  }

  const structured = await analyzeWithGemini(articleText, title);
  return {
    crime_type: structured.crime_type ?? "",
    location: structured.location ?? "",
    date: structured.date ?? article.date ?? "",
    summary: structured.summary ?? "",
    people_involved: Array.isArray(structured.people_involved) ? structured.people_involved : [],
    sentence_or_outcome: structured.sentence_or_outcome ?? "",
    _raw: { title, link, extracted_length: articleText.length },
  };
}

/** Escape a value for CSV (wrap in quotes if contains comma, newline, or quote). */
function csvEscape(value) {
  const s = String(value ?? "").replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

/**
 * Process multiple articles and return an array of structured results.
 * @param {object[]} articles - Array of { title, date, link }
 * @param {number} [delayMs] - Delay between each Gemini call to avoid rate limits (default 1500)
 * @returns {Promise<object[]>}
 */
export async function processAllArticles(articles, delayMs = 1500) {
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`[${i + 1}/${articles.length}] ${article.title || article.link}`);
    try {
      const out = await processCrimeArticle(article);
      results.push(out);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      results.push({
        crime_type: "",
        location: "",
        date: article.date ?? "",
        summary: "",
        people_involved: [],
        sentence_or_outcome: "",
        _raw: { title: article.title, link: article.link, error: err.message },
      });
    }
    if (i < articles.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

/**
 * Write structured crime results to a CSV file.
 * @param {object[]} results - Array of objects from processCrimeArticle
 * @param {string} filepath - Output path (e.g. "crime-data.csv")
 */
export function writeResultsToCsv(results, filepath = "crime-data.csv") {
  const headers = [
    "crime_type",
    "location",
    "date",
    "summary",
    "people_involved",
    "sentence_or_outcome",
    "title",
    "link",
  ];
  const rows = results.map((r) => {
    const people = Array.isArray(r.people_involved) ? r.people_involved.join("; ") : "";
    const title = r._raw?.title ?? "";
    const link = r._raw?.link ?? "";
    return [
      csvEscape(r.crime_type),
      csvEscape(r.location),
      csvEscape(r.date),
      csvEscape(r.summary),
      csvEscape(people),
      csvEscape(r.sentence_or_outcome),
      csvEscape(title),
      csvEscape(link),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  writeFileSync(filepath, csv, "utf8");
  console.log(`Wrote ${results.length} rows to ${filepath}`);
}

/**
 * Write structured crime results to a JSON file.
 * @param {object[]} results - Array of objects from processCrimeArticle
 * @param {string} filepath - Output path (e.g. "crime-data-processed.json")
 */
export function writeResultsToJson(results, filepath = "crime-data-processed.json") {
  writeFileSync(filepath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Wrote ${results.length} rows to ${filepath}`);
}

async function main() {
  const inputPath = "crime-data.json";
  const csvPath = "crime-data.csv";
  const jsonPath = "crime-data-processed.json";
  let articles;
  try {
    const raw = readFileSync(inputPath, "utf8");
    articles = JSON.parse(raw);
  } catch (err) {
    console.error(`Could not read ${inputPath}:`, err.message);
    process.exit(1);
  }
  if (!Array.isArray(articles) || articles.length === 0) {
    console.error("No articles in crime-data.json");
    process.exit(1);
  }
  console.log(`Processing ${articles.length} articles...\n`);
  const results = await processAllArticles(articles);
  writeResultsToCsv(results, csvPath);
  writeResultsToJson(results, jsonPath);
}

// Run when executed directly: node processCrimeArticle.js
if (process.argv[1]?.includes("processCrimeArticle")) {
  main();
}
