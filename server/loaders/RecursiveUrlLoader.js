import { compile } from "html-to-text";
import { RecursiveUrlLoader } from "langchain/document_loaders/web/recursive_url";
import fs from "fs";

const url = "https://m3rashid.in/blogs/concurrency-vs-parallelism";

const compiledConvert = compile({ wordwrap: 130 }); // returns (text: string) => string;

const loader = new RecursiveUrlLoader(url, {
    extractor: compiledConvert,
    maxDepth: 1,
});

const docs = await loader.load();
fs.writeFileSync("test.json", JSON.stringify(docs, null, 2));