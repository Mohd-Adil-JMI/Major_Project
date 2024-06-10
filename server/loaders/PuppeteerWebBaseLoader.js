import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import fs from "fs";
const loader = new PuppeteerWebBaseLoader(
    "https://comp-engg.vercel.app/",
    {
        launchOptions: {
            headless: true,
        },
        gotoOptions: {
            waitUntil: "networkidle0"
        },
        async evaluate(page, browser) {
            const result = await page.evaluate(() => {
                return [...document.querySelectorAll('a')].map(a => a.href)
            });
            await browser.close();
            return result;
        },
    }
);
let urls = await loader.load();
urls = urls[0].pageContent.split(',')

urls.forEach(async (url, index) => {
    console.log(url);
    // use 1 second timeout
    setTimeout(() => {
        console.log('Timeout');
    }, 1000);
    const pageLoader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true,
        },
        gotoOptions: {
            waitUntil: "networkidle0"
        },
        async evaluate(page, browser) {
            const result = await page.evaluate(() => {
                return {
                    title: document.title,
                    content: document.body.innerText
                }
            });
            await browser.close();
            return result;
        },
    });
    const doc = await pageLoader.load();
    console.log(doc);
    fs.writeFileSync(`${index}.json`, JSON.stringify(doc, null, 2));
}
);
// const docs = await Promise.all(urls.map(async (url) => {
//     console.log(url);
//     const pageLoader = new PuppeteerWebBaseLoader(url, {
//         launchOptions: {
//             headless: true,
//         },
//         gotoOptions: {
//             waitUntil: "networkidle0"
//         },
//         async evaluate(page, browser) {
//             const result = await page.evaluate(() => {
//                 return {
//                     title: document.title,
//                     content: document.body.innerText
//                 }
//             });
//             await browser.close();
//             return result;
//         },
//     });
//     return pageLoader.load();
// }));
// fs.writeFileSync("computer_engineering.json", JSON.stringify(docs, null, 2));