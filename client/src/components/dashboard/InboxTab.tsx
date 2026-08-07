import { Loader2, MessageSquare, Send } from "lucide-react";
import type { LogEntry } from "./types";

interface InboxTabProps {
  conversations: LogEntry[];
  isLoading: boolean;
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  messageInput: string;
  onChangeMessageInput: (text: string) => void;
  onSendMessage: (recipientId: string, text: string) => void;
  isSendingMessage: boolean;
}

export function InboxTab({
  conversations,
  isLoading,
  selectedConversation,
  onSelectConversation,
  messageInput,
  onChangeMessageInput,
  onSendMessage,
  isSendingMessage,
}: InboxTabProps) {
  const groupedConversations = conversations.reduce((acc, log) => {
    if (!log.dmSenderId) return acc;
    if (!acc[log.dmSenderId]) acc[log.dmSenderId] = [];
    acc[log.dmSenderId].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const conversationSenders = Object.keys(groupedConversations).sort((a, b) => {
    const lastA = groupedConversations[a][groupedConversations[a].length - 1].createdAt;
    const lastB = groupedConversations[b][groupedConversations[b].length - 1].createdAt;
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#111111] dark:text-white">Inbox</h2>
          <p className="mt-1 text-[13px] text-[#71717a] dark:text-[#a1a1aa]">View and reply to direct messages.</p>
        </div>
      </div>

      <div className="flex h-[600px] overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#111114]">
        {/* Sidebar */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-black/[0.05] dark:border-white/[0.05]">
          <div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.05]">
            <p className="text-[13px] font-semibold text-[#111111] dark:text-white">Conversations</p>
            <p className="mt-0.5 text-[11px] text-[#a1a1aa]">{conversationSenders.length} threads</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 size={20} className="animate-spin text-[#a1a1aa]" />
              </div>
            ) : conversationSenders.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-[#a1a1aa]">No conversations yet.</div>
            ) : (
              conversationSenders.map((senderId) => {
                const lastMessage = groupedConversations[senderId][groupedConversations[senderId].length - 1];
                const isSelected = selectedConversation === senderId;
                return (
                  <button
                    key={senderId}
                    onClick={() => onSelectConversation(senderId)}
                    className={`w-full border-b border-black/[0.04] px-5 py-4 text-left transition hover:bg-[#fafafb] dark:border-white/[0.04] dark:hover:bg-white/5 ${
                      isSelected ? "bg-violet-50 dark:bg-violet-950/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[11px] font-bold text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]">
                        {senderId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#111111] dark:text-white">{senderId}</p>
                        <p className="truncate text-[12px] text-[#a1a1aa]">{lastMessage.dmText}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex flex-1 flex-col">
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f4f5] text-[11px] font-bold text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]">
                  {selectedConversation.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#111111] dark:text-white">{selectedConversation}</p>
                  <p className="text-[11px] text-[#a1a1aa]">Instagram Direct Message</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {groupedConversations[selectedConversation].map((log) => {
                  const isOutgoing = log.action === "SEND_DM" || log.action === "DM_AUTO_REPLY";
                  return (
                    <div key={log._id} className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-[16px] px-4 py-2.5 text-[13px] leading-[1.5] ${
                          isOutgoing
                            ? "rounded-br-sm text-white"
                            : "rounded-bl-sm bg-[#f4f4f5] text-[#111111] dark:bg-white/10 dark:text-white"
                        }`}
                        style={isOutgoing ? { background: "linear-gradient(135deg, #7c3aed, #ec4899)" } : {}}
                      >
                        {log.dmText}
                      </div>
                      <span className="mt-1 px-1 text-[10px] text-[#a1a1aa]">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {log.action === "DM_AUTO_REPLY" && " · Auto"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-black/[0.05] p-4 dark:border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => onChangeMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && messageInput.trim()) {
                        onSendMessage(selectedConversation, messageInput);
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 rounded-full border border-black/[0.08] bg-[#fafafb] px-4 py-2.5 text-[13px] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 dark:border-white/[0.1] dark:bg-white/5 dark:text-white dark:focus:border-violet-500"
                  />
                  <button
                    onClick={() => {
                      if (messageInput.trim()) {
                        onSendMessage(selectedConversation, messageInput);
                      }
                    }}
                    disabled={isSendingMessage || !messageInput.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                  >
                    {isSendingMessage ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#a1a1aa]">
              <MessageSquare size={36} strokeWidth={1.5} />
              <p className="text-[13px]">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
