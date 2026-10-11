import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ApiUrl from "../components/ApiUrl";
import { authFetch } from "../components/authFetch";
import { useDialog } from "../components/DialogProvider";
import "./Chatbot.css";

const API_URL = ApiUrl();

const Chatbot = ({
  chatMessage_h2 = "How can I help you today?",
  chatMessage_p = "Ask me anything about your studies.",
  chatDisclaimer = "SmartAI can make mistakes. Check important information.",
}) => {
  const navigate = useNavigate();

  const { confirm: confirmDialog, prompt: promptDialog, toast } = useDialog();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Conversation states
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  // Sidebar states
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatMessagesRef = useRef(null);
  const textareaRef = useRef(null);

  // true = keep following new text; false = the user scrolled up to read
  const shouldStickRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const username = localStorage.getItem("username");

  // Checks how far the user is from the bottom
  const updateScrollButton = () => {
    const el = chatMessagesRef.current;

    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    shouldStickRef.current = distanceFromBottom < 150;
    setShowScrollButton(distanceFromBottom > 150);
  };

  // Scroll smoothly to the last message (arrow button)
  const scrollToBottom = () => {
    const el = chatMessagesRef.current;

    if (!el) return;

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // AUTO-SCROLL: whenever messages change, follow the newest text
  useEffect(() => {
    const el = chatMessagesRef.current;

    if (!el) return;

    if (shouldStickRef.current) {
      el.scrollTop = el.scrollHeight;
    }

    updateScrollButton();
  }, [messages, loading]);

  // Make the textarea grow with its content
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [message]);

  // CHECK LOGIN + LOAD CONVERSATIONS
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    loadConversations();
  }, []);

  // LOAD CONVERSATION LIST (sidebar)
  const loadConversations = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/conversations`);

      const data = await response.json();

      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  // OPEN A CONVERSATION (loads all its messages)
  const openConversation = async (conversationId) => {
    if (loading) return;

    if (conversationId === activeConversationId) {
      setSidebarOpen(false);
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/api/conversations/${conversationId}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load conversation");
      }

      shouldStickRef.current = true; // start at the latest message

      setMessages(
        data.conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      );

      setActiveConversationId(conversationId);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to open conversation:", error);
      toast("Could not open that chat", "error");
    }
  };

  // SEND MESSAGE (the reply streams in word by word)
  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    shouldStickRef.current = true;

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await authFetch(`${API_URL}/api/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: userMessage,
          conversationId: activeConversationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Chatbot request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let replyStarted = false;

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Each piece from the server ends with a blank line
        const events = buffer.split("\n\n");
        buffer = events.pop();

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;

          const data = JSON.parse(event.slice(6));

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.token) {
            if (!replyStarted) {
              // First words: create the AI message
              replyStarted = true;

              setMessages((previous) => [
                ...previous,
                { role: "assistant", content: data.token },
              ]);
            } else {
              // Later words: add them to the end of the AI message
              setMessages((previous) => {
                const updated = [...previous];
                const last = updated[updated.length - 1];

                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.token,
                };

                return updated;
              });
            }
          }

          if (data.done && data.conversationId) {
            setActiveConversationId(data.conversationId);
          }
        }
      }

      // Refresh the sidebar (new title / new order)
      await loadConversations();
    } catch (error) {
      console.error("Chatbot error:", error);

      const text =
        error instanceof TypeError
          ? "Failed to connect to the AI."
          : error.message || "Failed to connect to the AI.";

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `❌ ${text}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // COPY A REPLY
  const copyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast("Reply copied to clipboard");
    } catch (error) {
      console.error("Copy error:", error);
      toast("Could not copy. Please try again.", "error");
    }
  };

  // ENTER TO SEND
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // NEW CHAT
  const newChat = () => {
    setMessages([]);
    setMessage("");
    setActiveConversationId(null);
    setSidebarOpen(false);
  };

  // RENAME CONVERSATION
  const renameConversation = async (conversation) => {
    const newTitle = await promptDialog({
      title: "Rename chat",
      defaultValue: conversation.title,
      confirmText: "Save",
    });

    if (
      !newTitle ||
      !newTitle.trim() ||
      newTitle.trim() === conversation.title
    ) {
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/api/conversations/${conversation._id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({ title: newTitle.trim() }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to rename conversation");
      }

      await loadConversations();
      toast("Chat renamed");
    } catch (error) {
      console.error("Rename error:", error);
      toast("Could not rename the chat", "error");
    }
  };

  // DELETE CONVERSATION
  const deleteConversation = async (conversation) => {
    const confirmed = await confirmDialog({
      title: "Delete this chat?",
      message: "This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    });

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `${API_URL}/api/conversations/${conversation._id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // If the open chat was deleted, go back to an empty chat
      if (conversation._id === activeConversationId) {
        setMessages([]);
        setActiveConversationId(null);
      }

      await loadConversations();
      toast("Chat deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast("Could not delete the chat", "error");
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user");

    navigate("/login");
  };

  // SEARCH CONVERSATIONS
  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Show the typing dots only while we wait for the first words
  const waitingForReply =
    loading && messages[messages.length - 1]?.role === "user";

  return (
    <div className="chatbot-page">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="chat-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside className={`chatbot-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* SIDEBAR LOGO */}
        <div className="chat-sidebar-logo">
          <div className="sidebar-logo-icon">✦</div>

          <div>
            <h2>SmartAI</h2>
            <span>AI Study Assistant</span>
          </div>

          <button
            className="chat-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* SEARCH */}
        <div className="chat-search-box">
          <span>🔎</span>

          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* NAVIGATION */}
        <div className="chat-sidebar-navigation">
          <button
            className="chat-sidebar-button"
            onClick={() => {
              navigate("/summary");
              setSidebarOpen(false);
            }}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            className="chat-sidebar-button new-chat-sidebar"
            onClick={newChat}
          >
            <span>✦</span>
            <span>New Chat</span>
          </button>
        </div>

        {/* CHAT COUNT */}
        <div className="chat-history-title">
          <span>Chat History</span>

          <span className="chat-count">{conversations.length}</span>
        </div>

        {/* CONVERSATION LIST */}
        <div className="chat-history-list">
          {filteredConversations.length === 0 ? (
            <p className="no-chat-history">
              {searchTerm ? "No matching chats" : "No chat history yet"}
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation._id}
                className={`chat-history-row ${
                  conversation._id === activeConversationId ? "active-chat" : ""
                }`}
              >
                <button
                  className="chat-history-item"
                  onClick={() => openConversation(conversation._id)}
                >
                  <span className="history-icon">💬</span>

                  <span className="history-question">{conversation.title}</span>
                </button>

                <div className="chat-history-actions">
                  <button
                    title="Rename"
                    onClick={() => renameConversation(conversation)}
                  >
                    ✏️
                  </button>

                  <button
                    title="Delete"
                    onClick={() => deleteConversation(conversation)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* SIDEBAR BOTTOM */}
        <div className="chat-sidebar-bottom">
          <div className="chat-user-info">
            <div className="chat-user-avatar">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>

            <div className="chat-user-name">
              <strong>{username}</strong>
              <span>Student</span>
            </div>
          </div>

          <button className="chat-logout-button" onClick={logout}>
            ⇥ Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="chat-main">
        {/* TOP BAR */}
        <header className="chatbot-topbar">
          {/* MOBILE MENU */}
          <button
            className="chat-mobile-menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <h2>✦ SmartAI</h2>

          <div className="chat-topbar-space"></div>
        </header>

        {/* CHAT AREA */}
        <main className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-avatar">✦</div>

            <div>
              <h1>SmartAI Assistant</h1>

              <p>Welcome back, {username} 👋</p>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="chat-messages-wrapper">
            <div
              className="chat-messages"
              ref={chatMessagesRef}
              onScroll={updateScrollButton}
            >
              {messages.length === 0 && !loading && (
                <div className="empty-chat">
                  <div className="large-ai-icon">✦</div>

                  <h2>{chatMessage_h2}</h2>

                  <p>{chatMessage_p}</p>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-message ${
                    msg.role === "user" ? "user-message" : "ai-message"
                  }`}
                >
                  <div className="message-avatar">
                    {msg.role === "user" ? "👤" : "✦"}
                  </div>

                  <div className="message-content">
                    {msg.role === "assistant" ? (
                      <>
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* COPY BUTTON (hidden while this reply is still arriving) */}
                        {!(loading && index === messages.length - 1) && (
                          <button
                            className="copy-reply-btn"
                            onClick={() => copyMessage(msg.content)}
                          >
                            📋 Copy
                          </button>
                        )}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* TYPING ANIMATION */}
              {waitingForReply && (
                <div className="chat-message ai-message">
                  <div className="message-avatar">✦</div>

                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>

            {showScrollButton && (
              <button
                className="scroll-bottom-btn"
                onClick={scrollToBottom}
                aria-label="Scroll to latest message"
              >
                ↓
              </button>
            )}
          </div>

          {/* INPUT */}
          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SmartAI anything..."
              rows="1"
            />

            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="send-chat-btn"
            >
              ↑
            </button>
          </div>

          <p className="chat-disclaimer">{chatDisclaimer}</p>
        </main>
      </div>
    </div>
  );
};

export default Chatbot;
