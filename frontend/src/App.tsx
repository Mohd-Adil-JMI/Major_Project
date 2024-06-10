import Chat from "./components/Chat";
import Sources from "./components/Sources";
function App() {
  return (
    <div className="container h-svh mx-auto relative">
      <h1 className="text-4xl font-semibold">Custom Chatbot Builder</h1>
      <Sources />
      <Chat />
    </div>
  );
}

export default App;
