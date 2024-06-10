import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { ChatAnthropic } from '@langchain/anthropic';
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import {
  RunnableSequence,
  RunnableMap,
  RunnableBranch,
  RunnableLambda,
} from "@langchain/core/runnables";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { JsonMarkdownStructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import fs from 'fs';

console.log(__dirname)
const pdfFilter = (req, file, cb) => {
  if (file.mimetype.includes("pdf")) {
    cb(null, true);
  } else {
    cb("Please upload only pdf file.", false);
  }
}

var storage = multer.diskStorage({ // multer storage
  destination: (req, file, cb) => {
    cb(null, __dirname + "/rag_documents/"); // upload file to server/rag_documents
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
});

const uploadPDF = multer({ storage: storage, fileFilter: pdfFilter });

const app = express();
const PORT = process.env.PORT;
app.use(express.json());
app.use(express.raw({ type: 'text/event-stream' }));
app.use(cors());

const HEADERS_STREAM = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'text/event-stream;charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};
const llm = new ChatAnthropic({
  modelName: "claude-3-sonnet-20240229",
  temperature: 0,
  streaming: true,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});
const input_folder_path = './rag_documents'
const doc_chunk_size = 1000
const doc_chunk_overlap = 200
const num_retrievals = 4
const embedding_function = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});
//const loader = new DirectoryLoader(input_folder_path, {
//   ".pdf": (path) => new PDFLoader(path),
// })
// const docs = await loader.load()
// const text_splitter = new RecursiveCharacterTextSplitter({
//   chunkSize: doc_chunk_size, chunkOverlap: doc_chunk_overlap
// })
// const chunks = await text_splitter.splitDocuments(docs)
// console.log(loader, docs, chunks)
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
})
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME)
const pineconeStore = new PineconeStore(embedding_function, { pineconeIndex })
// await pineconeStore.addDocuments(chunks)

const RESPONSE_TEMPLATE = `You are a helpful assintant to answer based on the information provided as context.
Using the provided context, answer the user's question to the best of your ability using the resources provided.
Generate a comprehensive and informative answer.
Use an unbiased and journalistic tone.
Do not repeat text.
Do not mention about the context.
If there is nothing in the context relevant to the question at hand, just say "Sorry, I don't know the answer of this question." Don't try to make up an answer.
If possible use bullet points in your answer for readability.
Anything between the following \`context\`  html blocks is retrieved from a knowledge bank, not part of the conversation with the user.

<context>
{context}
<context/>

REMEMBER: If there is no relevant information within the context, just say "Sorry, I don't know the answer of this question." Don't try to make up an answer.
Anything between the preceding 'context' html blocks is retrieved from a knowledge bank, not part of the conversation with the user.Also do not mention about the context.`;

const REPHRASE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:`;

const getRetriever = async () => {
  return pineconeStore.asRetriever({ k: 4 });
};

const createRetrieverChain = (llm, retriever) => {
  const CONDENSE_QUESTION_PROMPT =
    PromptTemplate.fromTemplate(REPHRASE_TEMPLATE);
  const condenseQuestionChain = RunnableSequence.from([
    CONDENSE_QUESTION_PROMPT,
    llm,
    new StringOutputParser(),
  ]).withConfig({
    runName: "CondenseQuestion",
  });
  const hasHistoryCheckFn = RunnableLambda.from(
    (input) => input.chat_history.length > 0,
  ).withConfig({ runName: "HasChatHistoryCheck" });
  const conversationChain = condenseQuestionChain.pipe(retriever).withConfig({
    runName: "RetrievalChainWithHistory",
  });
  const basicRetrievalChain = RunnableLambda.from(
    (input) => input.question,
  )
    .withConfig({
      runName: "Itemgetter:question",
    })
    .pipe(retriever)
    .withConfig({ runName: "RetrievalChainWithNoHistory" });

  return RunnableBranch.from([
    [hasHistoryCheckFn, conversationChain],
    basicRetrievalChain,
  ]).withConfig({
    runName: "FindDocs",
  });
};

const formatDocs = (docs) => {
  return docs
    .map((doc, i) => `<doc id='${i}'>${doc.pageContent}</doc>`)
    .join("\n");
};

const formatChatHistoryAsString = (history) => {
  return history
    .map((message) => `${message._getType()}: ${message.content}`)
    .join("\n");
};

const serializeHistory = (input) => {
  const chatHistory = input.chat_history || [];
  const convertedChatHistory = [];
  for (const message of chatHistory) {
    if (message.human !== undefined) {
      convertedChatHistory.push(new HumanMessage({ content: message.human }));
    }
    if (message["ai"] !== undefined) {
      convertedChatHistory.push(new AIMessage({ content: message.ai }));
    }
  }
  return convertedChatHistory;
};

const createChain = (llm, retriever) => {
  const retrieverChain = createRetrieverChain(llm, retriever);
  const context = RunnableMap.from({
    context: RunnableSequence.from([
      ({ question, chat_history }) => ({
        question,
        chat_history: formatChatHistoryAsString(chat_history),
      }),
      retrieverChain,
      RunnableLambda.from(formatDocs).withConfig({
        runName: "FormatDocumentChunks",
      }),
    ]),
    question: RunnableLambda.from(
      (input) => input.question,
    ).withConfig({
      runName: "Itemgetter:question",
    }),
    chat_history: RunnableLambda.from(
      (input) => input.chat_history,
    ).withConfig({
      runName: "Itemgetter:chat_history",
    }),
  }).withConfig({ tags: ["RetrieveDocs"] });
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", RESPONSE_TEMPLATE],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
  ]);

  const responseSynthesizerChain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser(),
  ]).withConfig({
    tags: ["GenerateResponse"],
  });
  return RunnableSequence.from([
    {
      question: RunnableLambda.from(
        (input) => input.question,
      ).withConfig({
        runName: "Itemgetter:question",
      }),
      chat_history: RunnableLambda.from(serializeHistory).withConfig({
        runName: "SerializeHistory",
      }),
    },
    context,
    responseSynthesizerChain,
  ]);
};

app.post('/anthropic/ask', async (req, res) => {
  const { input } = req.body
  console.log(input);
  const retriever = await getRetriever();
  const chain = createChain(llm, retriever);
  res.writeHead(200, HEADERS_STREAM);
  const stream = await chain.stream(input);
  console.log(stream);
  for await (const data of stream) {
    // console.log(data);
    res.write(data);
  }
  res.end();
})

app.post('/upload/pdf', uploadPDF.single('file'), async (req, res) => {
  const { file } = req;
  console.log(file);
  const loader = new PDFLoader(file.path);
  const docs = await loader.load();
  const text_splitter = new RecursiveCharacterTextSplitter({
    chunkSize: doc_chunk_size, chunkOverlap: doc_chunk_overlap
  })
  const chunks = await text_splitter.splitDocuments(docs)
  const ids = await pineconeStore.addDocuments(chunks)
  let sources = JSON.parse(fs.readFileSync("./db/documents.json"));
  const newSources = [...sources, { name: file.originalname, ids }];
  sources = newSources.map((source) => (source.name));
  fs.writeFileSync("./db/documents.json", JSON.stringify(newSources));
  res.status(200).json({ message: 'File uploaded successfully', sources });
});

app.get('/sources', async (req, res) => {
  let sources = JSON.parse(fs.readFileSync("./db/documents.json"));
  sources = sources.map((source) => (source.name));
  res.status(200).json(sources);
});
app.get('*', (req, res) => {
  res.status(200).json({ message: 'I am alive' });
});
app.listen(PORT, () => {
  console.log(`App Listening at http://localhost:${PORT}`);
});
