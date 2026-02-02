export default function Sidebar({ chats, onNewChat, onSelect, activeChatId }) {
  return (
    <div className="w-64 bg-[#f9f9f9] text-black p-3">
      <button
        onClick={onNewChat}
        className="w-full border border-gray-600 rounded p-2 mb-4"
      >
        + New chat
      </button>

      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSelect(chat.id)}
          className={`p-2 rounded cursor-pointer ${
            chat.id === activeChatId ? "bg-[#f9f9f9]" : "hover:bg-[#f4f4f4]"
          }`}
        >
          {chat.title}
        </div>
      ))}
    </div>
  );
}
