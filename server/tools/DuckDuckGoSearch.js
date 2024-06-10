import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import fs from "fs";
// Instantiate the DuckDuckGoSearch tool.
const tool = new DuckDuckGoSearch({ maxResults: 5 });

// Get the results of a query by calling .invoke on the tool.
const result = await tool.invoke(
    "Number of Departments in the Fuculty of Engineering, Jamia Millia Islamia"
);

console.log(result);
fs.writeFileSync("test.json", JSON.stringify(result, null, 2));