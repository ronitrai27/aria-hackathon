"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X, Sparkles, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const [messages, setMessages] = useState<{ sender: "user" | "agent"; text: string }[]>([
    { sender: "agent", text: "Hey! I'm your Twin AI agent. I'm trained on your life, not the internet. How can I help you today?" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll visibility logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Threshold: only start showing the popup if user has scrolled past 150px
      if (currentScrollY > 150) {
        if (currentScrollY > lastScrollY) {
          // Scrolling down -> show the popup
          setIsVisible(true);
        } else {
          // Scrolling up -> hide the popup
          setIsVisible(false);
        }
      } else {
        // At the very top -> hide the popup
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Scroll to bottom of message list on new message
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputValue("");
    setIsTyping(true);

    // Simulate Agent response
    setTimeout(() => {
      let responseText = "I am trained on your unique habits, emails, and preferences to act as your personal operating system. Let's build something great!";
      const lowerText = text.toLowerCase();

      if (lowerText.includes("work") || lowerText.includes("how")) {
        responseText = "I securely connect to your apps, calendar, and documents to automate workflows, sort emails, and help you focus on what matters most.";
      } else if (lowerText.includes("book") || lowerText.includes("call") || lowerText.includes("contact")) {
        responseText = "I'd love to help with that! Click the 'Book a call' button in the upper-right corner of the website, or let me know your email and I will pass it to the team.";
      } else if (lowerText.includes("use case") || lowerText.includes("features")) {
        responseText = "My top features include auto-drafting responses, smart task scheduling, research synthesis, and executive summaries of your daily notifications.";
      } else if (lowerText.includes("ex")) {
        responseText = "Haha! Unlike your ex, I actually listen, learn from your preferences, and never forget the small details.";
      }

      setMessages((prev) => [...prev, { sender: "agent", text: responseText }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (actionText: string) => {
    handleSendMessage(actionText);
  };

  return (
    <>
      {/* 1. Floating Trigger Button (Group for hover effects) */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 group",
          "w-14 h-14 rounded-full bg-indigo-600 shadow-[0_8px_30px_rgba(99,102,241,0.3)]",
          "flex items-center justify-center cursor-pointer transition-all duration-300 ease-out",
          "hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]",
          "border-0 outline-none focus:outline-none focus:ring-0 active:outline-none",
          // Scroll and open state visibility
          !isOpen && isVisible
            ? "translate-x-0 opacity-100 scale-100"
            : "translate-x-32 opacity-0 scale-75 pointer-events-none"
        )}
        style={{ border: "none", outline: "none" }}
      >
        {/* Hover message bubble (slides out from behind the button to the left) */}
        <div
          className={cn(
            "absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap",
            "bg-white border border-indigo-100 text-[11px] font-medium text-slate-800 px-3.5 py-2 rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.1)]",
            "opacity-0 translate-x-4 pointer-events-none transition-all duration-300 ease-out",
            "group-hover:opacity-100 group-hover:translate-x-0"
          )}
        >
          Need help? Try asking
          {/* Small tail pointing to the trigger button */}
          <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-r border-t border-indigo-100 rotate-45" />
        </div>

        <div className="relative w-8 h-8 flex items-center justify-center">
          <img
            src="/logo.svg"
            alt="Agent Logo"
            className="w-8 h-8 rounded-lg object-contain transition-transform duration-500 ease-in-out group-hover:rotate-[360deg]"
          />
        </div>
      </button>

      {/* 2. Expanded Chat Box */}
      <div
        className={cn(
          "fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50",
          "w-[360px] h-[520px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-6rem)]",
          "bg-white/95 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-[0_12px_45px_rgba(99,102,241,0.15)]",
          "flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-out",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="Agent Logo"
                className="w-7 h-7 rounded-md object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-white">Twin AI</span>
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-medium border border-white/10">
                  Agent
                </span>
              </div>
              <p className="text-[10px] text-indigo-100">Interactive Assistant</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer border-0 outline-none focus:outline-none"
            style={{ border: "none", outline: "none" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2.5 max-w-[85%] text-xs leading-relaxed",
                msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                  msg.sender === "user"
                    ? "bg-indigo-50 border-indigo-100 text-indigo-600"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                )}
              >
                {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={cn(
                  "p-3 rounded-2xl shadow-sm",
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-100"
                    : "bg-slate-100/90 border border-slate-200/50 text-slate-800 rounded-tl-none"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-2.5 mr-auto max-w-[85%] text-xs">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-slate-100 border border-slate-200 text-slate-600">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100/90 border border-slate-200/50 text-slate-500 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {/* Quick Action Suggestion Chips */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-col gap-1.5">
            <button
              onClick={() => handleQuickAction("🧠 What can you do?")}
              className="text-[11px] text-left px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 text-indigo-700 transition-all duration-200 flex items-center justify-between group cursor-pointer shadow-sm shadow-indigo-50/55 outline-none focus:outline-none"
            >
              <span>🧠 What can you do?</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => handleQuickAction("⚙️ How do you work?")}
              className="text-[11px] text-left px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 text-indigo-700 transition-all duration-200 flex items-center justify-between group cursor-pointer shadow-sm shadow-indigo-50/55 outline-none focus:outline-none"
            >
              <span>⚙️ How do you work?</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => handleQuickAction("📅 Book a strategy call")}
              className="text-[11px] text-left px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 text-indigo-700 transition-all duration-200 flex items-center justify-between group cursor-pointer shadow-sm shadow-indigo-50/55 outline-none focus:outline-none"
            >
              <span>📅 Book a strategy call</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}

        {/* Footer Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-indigo-200/70 focus:outline-none focus:bg-white/15 focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2 rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-white text-white transition-all duration-200 cursor-pointer shadow-sm border-0 outline-none focus:outline-none"
            style={{ border: "none", outline: "none" }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </>
  );
}
