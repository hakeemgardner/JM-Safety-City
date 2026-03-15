import axios from "axios";
import { load } from "cheerio";
import { writeFileSync } from "fs";

async function scrapeCrimeData() {
  const url = "https://statinja.gov.jm/Demo_SocialStats/Justice%20and%20Crime.aspx";

  const { data } = await axios.get(url);

  const $ = load(data);

  const articles = [];

  $("article").each((i, el) => {
    const title = $(el).find("h2").text().trim();
    const link = $(el).find("a").attr("href");
    const date = $(el).find(".date").text().trim();

    articles.push({
      title,
      date,
      link
    });
  });

  writeFileSync(
    "crime-data.json",
    JSON.stringify(articles, null, 2)
  );

  console.log("Saved JSON file");
}

scrapeCrimeData();