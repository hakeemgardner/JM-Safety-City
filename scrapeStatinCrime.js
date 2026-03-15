/**
 * Scrape Crime and Justice statistics from the Statistical Institute of Jamaica (STATIN).
 * Extracts full context: table titles, crime types, years, and values into JSON + CSV.
 * The "Major Crimes" table is loaded via ASP.NET postback; script simulates that click.
 *
 * Run: node scrapeStatinCrime.js
 * Output: statin-crime-data.json, statin-crime-data.csv
 */
import axios from "axios";
import { load } from "cheerio";
import { writeFileSync } from "fs";

const BASE_URL = "https://statinja.gov.jm";
const JUSTICE_CRIME_URL = `${BASE_URL}/Demo_SocialStats/Justice%20and%20Crime.aspx`;

// TreeView nodes for STATIN Crime and Justice tables
const MAJOR_CRIMES_NODE =
  "sCRIME AND JUSTICE TABLES\\Crime Statistics\\Other Crime Statistics\\266";
const MURDER_BY_PARISH_NODE =
  "sCRIME AND JUSTICE TABLES\\Crime Statistics\\Intentional Homicide\\20404";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: JUSTICE_CRIME_URL,
};

/** Jamaica parish approximate centroids (WGS84) for mapping. Matches src/data/jamaicaParishes.ts bounds. */
const PARISH_CENTROIDS = [
  { name: "Kingston", lat: 17.985, lng: -76.805 },
  { name: "St. Andrew", lat: 18.035, lng: -76.765 },
  { name: "St. Catherine", lat: 18.0, lng: -77.02 },
  { name: "Clarendon", lat: 17.95, lng: -77.35 },
  { name: "Manchester", lat: 17.97, lng: -77.55 },
  { name: "St. Elizabeth", lat: 18.0, lng: -77.9 },
  { name: "Westmoreland", lat: 18.19, lng: -78.1 },
  { name: "Hanover", lat: 18.35, lng: -78.2 },
  { name: "St. James", lat: 18.42, lng: -77.85 },
  { name: "Trelawny", lat: 18.37, lng: -77.6 },
  { name: "St. Ann", lat: 18.35, lng: -77.25 },
  { name: "St. Mary", lat: 18.2, lng: -76.95 },
  { name: "Portland", lat: 17.97, lng: -76.55 },
  { name: "St. Thomas", lat: 17.97, lng: -76.4 },
];
const PARISH_LOOKUP = new Map(PARISH_CENTROIDS.map((p) => [p.name.toLowerCase().trim(), p]));
// Aliases so "St Andrew", "St Andrew Jamaica", etc. match
PARISH_CENTROIDS.forEach((p) => {
  const alt = p.name.replace(/\./g, "").toLowerCase();
  if (!PARISH_LOOKUP.has(alt)) PARISH_LOOKUP.set(alt, p);
});
/** National (Jamaica) centroid for country-level totals */
const NATIONAL_POINT = { name: "National", lat: 18.0, lng: -77.2 };

function getParishLatLng(parishName) {
  if (!parishName || parishName === "National" || parishName === "Total") return NATIONAL_POINT;
  const key = parishName.toLowerCase().trim().replace(/\./g, "");
  return PARISH_LOOKUP.get(key) || PARISH_LOOKUP.get(parishName.toLowerCase().trim()) || null;
}

/**
 * Extract ASP.NET form state from HTML for postback.
 */
function getFormState(html) {
  const viewState = html.match(
    /name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]*)"/
  )?.[1];
  const viewStateGen = html.match(
    /name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]*)"/
  )?.[1];
  const eventVal = html.match(
    /name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]*)"/
  )?.[1];
  return {
    __VIEWSTATE: viewState || "",
    __VIEWSTATEGENERATOR: viewStateGen || "",
    __EVENTVALIDATION: eventVal || "",
  };
}

/**
 * POST STATIN page with TreeView node to load a specific table; return HTML.
 */
async function fetchTableByNode(eventArgument) {
  const getRes = await axios.get(JUSTICE_CRIME_URL, {
    headers: HEADERS,
    timeout: 20000,
    maxRedirects: 5,
  });
  const html = getRes.data;
  const form = getFormState(html);
  const params = new URLSearchParams({
    __EVENTTARGET: "ctl00$ContentPlaceHolder1$TreeView1",
    __EVENTARGUMENT: eventArgument,
    ...form,
  });
  const postRes = await axios.post(JUSTICE_CRIME_URL, params.toString(), {
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 20000,
    maxRedirects: 0,
    validateStatus: (s) => s === 200,
  });
  return postRes.data;
}

async function fetchMajorCrimesTableHtml() {
  return fetchTableByNode(MAJOR_CRIMES_NODE);
}

/**
 * Extract data tables from STATIN page HTML.
 * @param {CheerioAPI} $
 * @param {{ parishTable?: boolean, tableTitle?: string }} opts - parishTable: first column is parish name; tableTitle: override title
 */
function extractTables($, opts = {}) {
  const { parishTable = false, tableTitle } = opts;
  const tables = [];
  $("table").each((tableIndex, tableEl) => {
    const $table = $(tableEl);
    if ($table.find("table").length > 0) return;
    const inTree =
      $table.closest("[id*='TreeView'], [class*='TreeView']").length > 0;
    const headerRow = $table.find("tr").first();
    const firstRowCells = headerRow.find("th, td");
    if (firstRowCells.length < 2) return;

    const headers = [];
    firstRowCells.each((_, el) => headers.push($(el).text().trim()));

    const rows = [];
    $table.find("tr").slice(1).each((_, tr) => {
      const $tr = $(tr);
      const cells = $tr.find("td");
      if (cells.length < 2) return;
      const label = $(cells[0]).text().trim();
      const values = {};
      cells.slice(1).each((j, td) => {
        const key = headers[j] != null && headers[j] !== "" ? headers[j] : `Col_${j}`;
        const raw = $(td).text().trim().replace(/,/g, "");
        const num = Number(raw);
        values[key] = Number.isNaN(num) ? raw : num;
      });
      if (label) rows.push({ label, values });
    });

    if (inTree) return;
    const hasNumeric = rows.some((r) =>
      Object.values(r.values).some(
        (v) => typeof v === "number" && v > 0 && v < 1e7
      )
    );
    if (rows.length >= 2 && hasNumeric) {
      tables.push({
        title: tableTitle || "Major Crimes / Crimes Reported",
        headers,
        rows,
        isParishTable: parishTable,
      });
    }
  });
  return tables;
}

/** Static fallback: Major Crimes Reported (STATIN) from official table, with full context. */
const STATIN_MAJOR_CRIMES_FALLBACK = {
  source: "Statistical Institute of Jamaica",
  section: "Crime and Justice",
  table_title: "Major Crimes / Crimes Reported",
  description:
    "Number of major crimes reported by type and year. Table: Major Crimes, Crimes Reported.",
  headers: ["2018", "2019", "2020", "2021", "2022", "2023"],
  rows: [
    { label: "Murder", values: { 2018: 1287, 2019: 1339, 2020: 1333, 2021: 1479, 2022: 1513, 2023: 1399 } },
    { label: "Shooting", values: { 2018: 1171, 2019: 1253, 2020: 1276, 2021: 1265, 2022: 1172, 2023: 1109 } },
    { label: "Rape", values: { 2018: 525, 2019: 545, 2020: 479, 2021: 498, 2022: 507, 2023: 475 } },
    { label: "Aggravated Assault", values: { 2018: 384, 2019: 392, 2020: 402, 2021: 355, 2022: 343, 2023: 350 } },
    { label: "Robbery", values: { 2018: 1100, 2019: 1217, 2020: 992, 2021: 774, 2022: 921, 2023: 798 } },
    { label: "Break-ins", values: { 2018: 1189, 2019: 1242, 2020: 1016, 2021: 909, 2022: 999, 2023: 885 } },
    { label: "Larceny", values: { 2018: 151, 2019: 143, 2020: 97, 2021: 100, 2022: 70, 2023: 488 } },
    { label: "Total", values: { 2018: 5807, 2019: 6131, 2020: 5595, 2021: 5380, 2022: 5525, 2023: 5504 } },
  ],
};

/**
 * Build a flat list of records with full context including parish and lat/lng.
 */
function toRecordList(tables, meta) {
  const records = [];
  for (const table of tables) {
    const isParishTable = table.isParishTable === true;
    for (const row of table.rows) {
      const loc = isParishTable
        ? getParishLatLng(row.label)
        : NATIONAL_POINT;
      const parish = loc ? loc.name : "National";
      const lat = loc ? loc.lat : NATIONAL_POINT.lat;
      const lng = loc ? loc.lng : NATIONAL_POINT.lng;
      for (const [year, value] of Object.entries(row.values)) {
        records.push({
          source: meta.source,
          section: meta.section,
          url: meta.url,
          table_title: table.title,
          crime_type: isParishTable ? table.title.replace(/ by Parish.*/i, "") : row.label,
          parish,
          lat,
          lng,
          year: year,
          value,
        });
      }
    }
  }
  return records;
}

function csvEscape(value) {
  const s = String(value ?? "").replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

const CSV_HEADERS = ["source", "section", "table_title", "crime_type", "parish", "lat", "lng", "year", "value"];

function writeCsv(records, filepath) {
  const rows = records.map((r) =>
    CSV_HEADERS.map((h) => csvEscape(r[h])).join(",")
  );
  writeFileSync(filepath, [CSV_HEADERS.join(","), ...rows].join("\n"), "utf8");
  console.log(`Wrote ${records.length} records to ${filepath}`);
}

async function main() {
  const meta = {
    source: "Statistical Institute of Jamaica",
    section: "Crime and Justice",
    url: JUSTICE_CRIME_URL,
    scraped_at: new Date().toISOString(),
  };

  let tables = [];
  try {
    console.log("Fetching STATIN Crime and Justice...");
    const html = await fetchMajorCrimesTableHtml();
    const $ = load(html);
    tables = extractTables($);
  } catch (e) {
    console.warn("Live fetch failed, using fallback data:", e.message);
  }

  if (tables.length === 0) {
    console.log("Using fallback: Major Crimes table (STATIN).");
    tables = [
      {
        title: STATIN_MAJOR_CRIMES_FALLBACK.table_title,
        headers: STATIN_MAJOR_CRIMES_FALLBACK.headers,
        rows: STATIN_MAJOR_CRIMES_FALLBACK.rows,
        isParishTable: false,
      },
    ];
  }

  // Fetch parish-level table: Victims of Murder by Parish
  try {
    const murderByParishHtml = await fetchTableByNode(MURDER_BY_PARISH_NODE);
    const $parish = load(murderByParishHtml);
    const parishTables = extractTables($parish, {
      parishTable: true,
      tableTitle: "Victims of Murder by Parish",
    });
    for (const t of parishTables) tables.push(t);
  } catch (e) {
    console.warn("Could not fetch Murder by Parish table:", e.message);
  }

  // If no parish-level data yet, add a placeholder table (parish names + centroid lat/lng) so output includes parishes
  const hasParishTable = tables.some((t) => t.isParishTable);
  if (!hasParishTable) {
    const parishRows = PARISH_CENTROIDS.map((p) => ({
      label: p.name,
      values: { "2023": 0 },
    }));
    tables.push({
      title: "Victims of Murder by Parish (parish reference)",
      headers: ["2023"],
      rows: parishRows,
      isParishTable: true,
    });
    console.log("Added parish reference table (parish names + lat/lng; values from STATIN when available).");
  }

  const output = {
    ...meta,
    description:
      "Crime and Justice statistics with parish and lat/lng. National totals use parish 'National'; parish-level tables include parish name and centroid coordinates.",
    parish_centroids: PARISH_CENTROIDS,
    national_point: NATIONAL_POINT,
    tables: tables.map((t) => ({
      title: t.title,
      headers: t.headers,
      rows: t.rows,
      isParishTable: t.isParishTable,
    })),
  };

  const records = toRecordList(tables, meta);
  output.records = records;

  const jsonPath = "statin-crime-data.json";
  writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote full data to ${jsonPath} (${tables.length} table(s))`);

  const csvPath = "statin-crime-data.csv";
  writeCsv(records, csvPath);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
