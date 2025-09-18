"use client";

import { TypographyH2, TypographyP } from "@/components/ui/typography";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

/* ---- Types & type guards for the /api/chat payload ---- */
interface ChatSuccess {
  response: string;
}
interface ChatError {
  error: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function hasStringProp<K extends string>(obj: unknown, key: K): obj is Record<K, string> {
  return isRecord(obj) && typeof obj[key] === "string";
}
function isChatSuccess(data: unknown): data is ChatSuccess {
  return hasStringProp(data, "response");
}
function isChatError(data: unknown): data is ChatError {
  return hasStringProp(data, "error");
}

export default function SpeciesChatbot() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-resize textarea
  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Auto-scroll when content changes
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatLog, isLoading]);

  // Convert UI chat log -> API history format
  function toApiHistory(
    log: { role: "user" | "bot"; content: string }[],
  ): { role: "user" | "assistant"; content: string }[] {
    return log.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
  }

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");

    // Add user message to chat log
    setChatLog((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: toApiHistory(chatLog),
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const msg = isChatError(data) ? data.error : "Failed to get response";
        throw new Error(msg);
      }
      if (!isChatSuccess(data)) {
        throw new Error("Malformed response from server");
      }

      setChatLog((prev) => [...prev, { role: "bot", content: data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatLog((prev) => [
        ...prev,
        { role: "bot", content: "Sorry, I'm having trouble right now. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <>
      <TypographyH2>Species Chatbot</TypographyH2>
      <div className="mt-4 flex gap-4">
        <div className="mt-4 rounded-lg bg-foreground p-4 text-background">
          <TypographyP>
            The Species Chatbot is a specialized assistant that answers questions about animals and species…
          </TypographyP>
          <TypographyP>
            Try asking: &quot;What do snow leopards eat?&quot;, &quot;Where do penguins live?&quot;, or &quot;Are tigers
            endangered?&quot;
          </TypographyP>
        </div>
      </div>

      {/* Chat UI */}
      <div className="mx-auto mt-6">
        <div
          ref={chatContainerRef}
          className="h-[400px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted p-4"
        >
          {chatLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start chatting about a species!</p>
          ) : (
            chatLog.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${
                    msg.role === "user"
                      ? "rounded-br-none bg-primary text-primary-foreground"
                      : "rounded-bl-none border border-border bg-foreground text-primary-foreground"
                  }`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-none border border-border bg-foreground p-3 text-sm text-primary-foreground">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Thinking...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="mt-4 flex flex-col items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyPress={handleKeyPress}
            rows={1}
            placeholder="Ask about a species..."
            className="w-full resize-none overflow-hidden rounded border border-border bg-background p-2 text-sm text-foreground focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!message.trim() || isLoading}
            className="mt-2 rounded bg-primary px-4 py-2 text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Thinking..." : "Enter"}
          </button>
        </div>
      </div>
    </>
  );
}
