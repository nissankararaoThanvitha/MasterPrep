import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatWindow({
  messages,
  input,
  setInput,
  sendMessage,
  loading,
}) {
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const uploadFile = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch("https://masterprep-5.onrender.com/upload", {
        method: "POST",
        body: formData,
      });
      alert("✅ File uploaded successfully");
    } catch {
      alert("❌ File upload failed");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-white">

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-5">

          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div
                key={i}
                className="ml-auto max-w-[70%] bg-gray-100 text-black px-4 py-3 rounded-xl text-sm"
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ) : (
              <div
                key={i}
                className="mr-auto max-w-[85%] text-gray-900 text-sm leading-7"
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
      <div className="sticky bottom-0 border-t bg-white px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">

          {/* Upload */}
          <button
            onClick={() => fileRef.current.click()}
            className="text-gray-400 hover:text-black text-xl transition"
          >
            📎
          </button>

          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept=".pdf,.txt,.png,.jpg,.jpeg"
            onChange={(e) => uploadFile(e.target.files[0])}
          />

          {/* Input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask your doubt from notes or generally..."
            className="flex-1 px-4 py-3 text-black bg-white border border-gray-300 rounded-lg outline-none focus:border-gray-400"
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
