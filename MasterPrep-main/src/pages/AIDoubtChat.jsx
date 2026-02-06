import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

import { auth } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { db } from "../firebase";

const BACKEND = "https://masterprep-3.onrender.com";  // <-- YOUR LIVE BACKEND

export default function AIDoubtChat() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------------- AUTO LOGIN ----------------
  useEffect(() => {
    const login = async () => {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    };
    login();
  }, []);

  // ---------------- LOAD CHATS ----------------
  useEffect(() => {
    const loadChats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDocs(
        collection(db, "users", user.uid, "chats")
      );

      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setChats(loaded);

      if (loaded.length > 0 && !activeChatId) {
        setActiveChatId(loaded[0].id);
      }
    };

    loadChats();
  }, [activeChatId]);

  // ---------------- CHAT TITLE GENERATOR ----------------
  const generateTitle = (text) => {
    return text
      .split(" ")
      .slice(0, 6)
      .join(" ")
      .replace(/[^a-zA-Z0-9 ]/g, "");
  };

  // ---------------- CREATE NEW CHAT ----------------
  const newChat = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const chatRef = await addDoc(
      collection(db, "users", user.uid, "chats"),
      {
        title: "New Chat",
        createdAt: serverTimestamp(),
        messages: [],
      }
    );

    const newChatObj = {
      id: chatRef.id,
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [newChatObj, ...prev]);
    setActiveChatId(chatRef.id);
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async () => {
    if (!input.trim() || !activeChatId) return;

    const user = auth.currentUser;
    if (!user) return;

    const chatRef = doc(db, "users", user.uid, "chats", activeChatId);

    const userMsg = {
      role: "user",
      text: input,
      timestamp: new Date(),
    };

    setInput("");
    setLoading(true);

    // Save user message in Firestore
    await updateDoc(chatRef, {
      messages: arrayUnion(userMsg),
    });

    // Update UI instantly
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, userMsg] }
          : chat
      )
    );

    // Rename chat if first message
    const currentChat = chats.find((c) => c.id === activeChatId);
    if (currentChat && currentChat.title === "New Chat") {
      const newTitle = generateTitle(userMsg.text);

      await updateDoc(chatRef, { title: newTitle });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? { ...chat, title: newTitle }
            : chat
        )
      );
    }

    // ----------- CALL DEPLOYED BACKEND -----------
    let aiText = "⚠️ Error contacting AI";

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.text }),
      });

      const data = await res.json();
      aiText = data.answer || JSON.stringify(data);
    } catch (err) {
      console.error("Ask error:", err);
    }

    const aiMsg = {
      role: "ai",
      text: aiText,
      timestamp: new Date(),
    };

    // Save AI message
    await updateDoc(chatRef, {
      messages: arrayUnion(aiMsg),
    });

    // Update UI
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, aiMsg] }
          : chat
      )
    );

    setLoading(false);
  };

  const activeChat =
    chats.find((c) => c.id === activeChatId) || null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#2f3142]">
      <Sidebar
        chats={chats}
        onNewChat={newChat}
        onSelect={(id) => setActiveChatId(id)}
        activeChatId={activeChatId}
      />

      <ChatWindow
        messages={activeChat ? activeChat.messages : []}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        loading={loading}
      />
    </div>
  );
}
