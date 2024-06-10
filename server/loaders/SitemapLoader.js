import { SitemapLoader } from "langchain/document_loaders/web/sitemap";
import fs from "fs";
const loader = new SitemapLoader("https://comp-engg.vercel.app/");

const sitemap = await loader.parseSitemap();
console.log(sitemap);
fs.writeFileSync("sitemap.json", JSON.stringify(sitemap, null, 2));