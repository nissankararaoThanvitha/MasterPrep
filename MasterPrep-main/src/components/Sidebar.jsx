export default function Sidebar({ chats, onNewChat, onSelect, activeChatId }) {
  return (
    <div className="w-64 h-full bg-[#f7f7f8] border-r border-gray-200 flex flex-col">

      {/* NEW CHAT BUTTON */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full bg-white border border-gray-300 rounded-lg p-2
                     hover:bg-gray-100 transition text-sm font-medium"
        >
          + New Chat
        </button>
      </div>

      {/* CHAT LIST */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`p-2 rounded-lg cursor-pointer text-sm transition truncate
              ${
                chat.id === activeChatId
                  ? "bg-gray-300 font-semibold"     // ACTIVE CHAT
                  : "hover:bg-gray-200"
              }`}
          >
            {chat.title || "New Chat"}
          </div>
        ))}
      </div>

    </div>
  );
}