"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";

type Message = {
  id: string;
  role: Role;
  content: string;
};

const starterPrompts = [
  "How can you help me plan my day?",
  "What's a quick dinner idea tonight?",
  "Give me a productivity tip.",
  "Teach me something new in 2 sentences."
];

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([{
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Hi! I'm your helpful chatbot. Ask me anything—ideas, explanations, or friendly chit-chat."
  }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canSend = input.trim().length > 0 && !pending;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const suggestionPills = useMemo(
    () =>
      starterPrompts.map((prompt) => (
        <button
          key={prompt}
          className="suggestion"
          onClick={() => setInput(prompt)}
          disabled={pending}
          type="button"
        >
          {prompt}
        </button>
      )),
    [pending]
  );

  async function sendMessage() {
    if (!canSend) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim()
    };

    const optimisticState = [...messages, userMessage];
    setMessages(optimisticState);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: optimisticState })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data: { reply: string } = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply
        }
      ]);
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I hit a snag: ${fallback}. Mind trying again?`
        }
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="page">
      <div className="chat-shell">
        <header className="chat-header">
          <div className="chat-title">Agentic Chatbot</div>
          <div className="chat-status">
            {pending ? "Thinking…" : "Ready"}
          </div>
        </header>

        <div className="chat-content" ref={containerRef}>
          {messages.map((message) => (
            <div key={message.id} className={`bubble ${message.role}`}>
              <div className="bubble-role">
                {message.role === "assistant" ? "Bot" : "You"}
              </div>
              <div className="bubble-body">{message.content}</div>
            </div>
          ))}
        </div>

        <div className="composer">
          <label className="composer-label" htmlFor="chat-input">
            Ask or say anything
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            className="composer-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) {
                  void sendMessage();
                }
              }
            }}
            placeholder="Write your message…"
            rows={3}
            disabled={pending}
          />
          <div className="composer-actions">
            <button
              className="send-button"
              onClick={() => void sendMessage()}
              disabled={!canSend}
              type="button"
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>

        <div className="suggestions">
          <div className="suggestions-title">Try asking:</div>
          <div className="suggestions-grid">{suggestionPills}</div>
        </div>
      </div>
    </main>
  );
}
