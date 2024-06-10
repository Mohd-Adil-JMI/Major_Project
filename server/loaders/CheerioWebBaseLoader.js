import fs from "fs";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";

const loader = new CheerioWebBaseLoader(
    "https://m3rashid.in/blogs/concurrency-vs-parallelism"
);

const docs = await loader.load();
fs.writeFileSync("test.json", JSON.stringify(docs, null, 2));