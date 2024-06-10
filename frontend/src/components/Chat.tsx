import React, { useEffect, useRef, useState } from "react";
import { IoChatbubbleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import { LuSend } from "react-icons/lu";
// import Balancer from "react-wrap-balancer";
const BotMessage = ({ message }: { message: string }) => {
  return (
    <div className="chat chat-start">
      <p className="chat-bubble bg-base-100 text-neutral">{message}</p>
    </div>
  );
};
const UserMessage = ({ message }: { message: string }) => {
  return (
    <div className="chat chat-end">
      <p className="chat-bubble bg-[#b375f0] text-base-100">{message}</p>
    </div>
  );
};

enum SENDER {
  BOT = "ai",
  USER = "human",
}
interface Message {
  sender: SENDER;
  message: string;
}
function App() {
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<
    { human: string; ai: string }[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
  }

  useEffect(() => {
    console.log(messages.length);
    if (messages.length > 0) {
      ref.current?.scrollTo(0, ref.current?.scrollHeight);
      // ref.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length]);

  async function handleSubmit() {
    if (message) {
      setMessages((prev) => [
        ...prev,
        { sender: SENDER.USER, message: message },
      ]);
      setMessage("");
      const stream = await fetch("http://localhost:3000/anthropic/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { question: message, chat_history: chatHistory },
        }),
      });
      setMessages((prev) => [...prev, { sender: SENDER.BOT, message: "" }]);
      console.log(stream);
      let answer = "";
      const reader = stream
        .body!.pipeThrough(new TextDecoderStream())
        .getReader();
      while (true) {
        let { value, done } = await reader.read();
        if (done) break;
        answer += value;
        console.log(value);
        setMessages((prev) => [
          ...prev.slice(0, prev.length - 1),
          {
            sender: SENDER.BOT,
            message: prev[prev.length - 1].message + value,
          },
        ]);
      }
      setChatHistory((prev) => [...prev, { human: message, ai: answer }]);
    }
  }
  function handleActive() {
    setActive(!active);
  }
  return (
    <div>
      {active && (
        <div className="artboard phone-3 bg-[#fbe5ff] overflow-hidden absolute bottom-4 right-4 rounded-lg shadow-sm">
          <button
            onClick={handleActive}
            className="btn btn-circle btn-sm btn-outline absolute top-4 right-4"
          >
            <RxCross2 className="w-6 h-6" />
          </button>
          <div className="w-full h-full flex flex-col">
            <h1 className="font-semibold p-3 text-3xl border-b border-neutral">
              Chatbot
            </h1>
            <div className="flex-1 overflow-y-auto my-4 text-sm" ref={ref}>
              {messages.map((message, index) =>
                message.sender === SENDER.BOT ? (
                  <BotMessage key={index} message={message.message} />
                ) : (
                  <UserMessage key={index} message={message.message} />
                )
              )}
            </div>
            {/* <div ref={ref}></div> */}
            <form className="flex relative gap-3 p-3 items-end">
              <textarea
                className="textarea flex-1 max-h-48 resize-y overflow-y-auto"
                name="message"
                placeholder="Enter your message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                autoFocus={true}
                onChange={handleChange}
                value={message}
              ></textarea>
              <button
                className="btn-sm absolute bottom-4 right-4"
                onClick={handleSubmit}
              >
                <LuSend />
              </button>
            </form>
          </div>
        </div>
      )}
      {!active && (
        <button
          onClick={handleActive}
          className="btn btn-circle btn-outline absolute bottom-4 right-4"
        >
          <IoChatbubbleOutline className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default App;
