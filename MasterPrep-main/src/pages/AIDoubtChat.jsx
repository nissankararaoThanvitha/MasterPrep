import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { apiFetch } from "../api";

export default function AIDoubtChat() {
  const [chats, setChats] = useState([]); // [{id, title, updated_at}]
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]); // messages of the active chat
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChats, setShowChats] = useState(false); // phone: chat-list drawer
  // A chat we just created is known to be empty, so don't fetch it:
  // that fetch could land after the first message and wipe it from view.
  const freshChatId = useRef(null);
  const activeRef = useRef(null); // latest activeChatId, for async callbacks
  useEffect(() => {
    activeRef.current = activeChatId;
  }, [activeChatId]);

  // ---------------- LOAD CHAT LIST ----------------
  useEffect(() => {
    apiFetch("/chats").then((list) => {
      setChats(list);
      if (list.length > 0) setActiveChatId(list[0].id);
    });
  }, []);

  // ---------------- LOAD ACTIVE CHAT ----------------
  useEffect(() => {
    if (!activeChatId || activeChatId === freshChatId.current) return;

    let cancelled = false; // ignore a slow response after switching chats
    apiFetch(`/chats/${activeChatId}`).then((chat) => {
      if (!cancelled) setMessages(chat.messages);
    });
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // ---------------- CREATE NEW CHAT ----------------
  const newChat = async () => {
    const chat = await apiFetch("/chats", { method: "POST" });
    freshChatId.current = chat.id;
    setChats((prev) => [chat, ...prev]);
    setMessages([]);
    setActiveChatId(chat.id);
    return chat.id;
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Typing before ever creating a chat starts one automatically
    const chatId = activeChatId ?? (await newChat());

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      // The server saves both messages and names the chat on its first message
      const res = await apiFetch(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      if (activeRef.current === chatId) {
        setMessages((prev) => [...prev, res.ai_message]);
      }
      setChats((prev) => [
        { ...prev.find((c) => c.id === chatId), title: res.title },
        ...prev.filter((c) => c.id !== chatId),
      ]);
    } catch (err) {
      if (activeRef.current === chatId) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: `⚠️ ${err.message || "Error contacting AI"}` },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectChat = (id) => {
    setShowChats(false);
    if (id === activeChatId) return;
    freshChatId.current = null;
    setLoading(false);
    setActiveChatId(id);
  };

  const sidebar = (
    <Sidebar
      chats={chats}
      onNewChat={() => {
        setShowChats(false);
        newChat();
      }}
      onSelect={selectChat}
      activeChatId={activeChatId}
    />
  );

  const activeTitle = chats.find((c) => c.id === activeChatId)?.title || "New Chat";

  return (
  // fills the screen below the 56px (h-14) navbar
  <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">

    {/* SIDEBAR: always visible from md up */}
    <div className="hidden md:flex">{sidebar}</div>

    {/* SIDEBAR: drawer on phones */}
    {showChats && (
      <div className="md:hidden fixed inset-0 z-40 flex">
        <div className="h-full shadow-xl">{sidebar}</div>
        <button
          aria-label="Close chat list"
          onClick={() => setShowChats(false)}
          className="flex-1 bg-black/40"
        />
      </div>
    )}

    {/* CHAT AREA */}
    <div className="flex flex-col flex-1 min-w-0 h-full bg-white">
      {/* phone header: open the chat list */}
      <div className="md:hidden flex items-center gap-3 px-3 py-2 border-b">
        <button
          onClick={() => setShowChats(true)}
          className="px-3 py-1.5 rounded-lg border text-sm"
        >
          ☰ Chats
        </button>
        <span className="text-sm font-medium truncate">{activeTitle}</span>
      </div>

      <ChatWindow
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        loading={loading}
      />
    </div>

  </div>
);
}
