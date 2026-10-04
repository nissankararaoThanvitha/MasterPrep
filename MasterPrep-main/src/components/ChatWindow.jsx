import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatWindow({
  messages,
  input,
  setInput,
  sendMessage,
  loading,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div
                key={i}
                className="ml-auto max-w-[85%] sm:max-w-[70%] bg-gray-100 text-black px-4 py-3 rounded-xl text-sm"
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ) : (
              <div
                key={i}
                className="mr-auto max-w-full sm:max-w-[85%] text-gray-900 text-sm leading-7 break-words"
              >
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="text-gray-400 text-sm italic">
              AI is typing…
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT BAR (FIXED) */}
      <div className="border-t bg-white px-3 sm:px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">

          {/* Input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask your doubt..."
            className="flex-1 min-w-0 px-4 py-3 text-black bg-white border border-gray-300 rounded-lg outline-none focus:border-gray-400"
          />

          {/* Send */}
          <button
            onClick={sendMessage}
            className="bg-[#303030] px-4 py-3 rounded-lg text-white"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
}
