"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Bot, Send, X, RefreshCw, ChevronDown, MessageSquare, TrendingUp, Package, Lightbulb, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "📊 Performa 30 Hari", prompt: "Bagaimana ringkasan performa penjualan toko kita dalam 30 hari terakhir?" },
  { label: "🍵 Menu Laris vs Sepi", prompt: "Menu apa yang paling laris dan menu mana yang penjualannya paling sepi?" },
  { label: "💡 Ide Promo Akhir Pekan", prompt: "Beri saya 2 ide promo bundling menarik untuk akhir pekan ini guna mendongkrak omzet." },
  { label: "📦 Cek Bahan Baku", prompt: "Apakah ada bahan baku yang persediaannya menipis atau perlu restock segera?" },
];

export function AdminAIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Halo Bos! 🍵 Saya **Asisten Toko Matchaboy**. Ada yang bisa saya bantu analisa mengenai penjualan, performa menu, stok bahan, atau ide promosi hari ini?",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Maaf Bos, terjadi kendala: ${data.error || "Gagal memproses jawaban."}`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "⚠️ Gagal terhubung ke server asisten. Silakan coba lagi.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Riwayat percakapan telah dibersihkan. Ada data toko yang ingin ditanyakan lagi, Bos?",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper format simple markdown text
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, lineIdx) => {
      // Bold rendering
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return (
        <p key={lineIdx} className={line.trim() === "" ? "h-2" : "min-h-[1.2rem] leading-relaxed"}>
          {parts.map((part, pIdx) => {
            if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("*") && part.endsWith("*"))) {
              const clean = part.replace(/^\*+|\*+$/g, "");
              return <strong key={pIdx} className="font-extrabold text-foreground">{clean}</strong>;
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          type="button"
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 border border-white/30 cursor-pointer group"
          title="Buka Asisten AI Toko"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          </div>
          <span className="font-heading tracking-tight">Asisten Toko AI</span>
        </motion.button>
      )}

      {/* Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-700 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                  <Bot className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-sm flex items-center gap-1.5">
                    <span>Asisten Toko Matchaboy</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-400/30 text-amber-200 border border-amber-300/40">
                      Gemini 3.6
                    </span>
                  </h3>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online • Analisis Data Real-time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Bersihkan Percakapan"
                  className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Tutup Asisten"
                  className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-xs font-bold ${
                      msg.role === "user"
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[82%] p-3.5 rounded-2xl shadow-sm space-y-1 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-tr-none font-medium"
                        : "bg-white text-slate-800 border border-slate-200/70 rounded-tl-none font-normal"
                    }`}
                  >
                    <div className="text-[12px] whitespace-pre-wrap leading-relaxed">
                      {renderFormattedText(msg.content)}
                    </div>
                    <p
                      className={`text-[9px] text-right font-medium mt-1 ${
                        msg.role === "user" ? "text-amber-100" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200/70 shadow-sm flex items-center gap-2 text-slate-500">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span className="text-[11px] font-semibold">Sedang menganalisis data toko...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Carousel */}
            <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 border border-slate-200 text-[10px] font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-150 flex items-center gap-2">
              <input
                type="text"
                placeholder="Tanyakan performa toko, menu, atau ide promo..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
