"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Send,
  X,
  RefreshCw,
  User,
  Paperclip,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Tag,
  Receipt,
  PackagePlus,
  Coins,
  FileCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ActionProposal {
  id: string;
  actionType: "CREATE_VOUCHER" | "UPDATE_PRODUCT" | "RESTOCK_INGREDIENT" | "RECORD_EXPENSE" | "BATCH_RECEIPT_RESTOCK";
  title: string;
  summary: string;
  payload: any;
  status?: "PENDING" | "EXECUTING" | "EXECUTED" | "CANCELLED";
  executionResult?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  proposal?: ActionProposal | null;
}

const QUICK_PROMPTS = [
  { label: "🎟️ Buat Voucher Promo", prompt: "Bikinin voucher diskon 20% kode MATCHAWEEKEND minimal belanja 40rb kuota 30 orang buat weekend ini." },
  { label: "🏷️ Ubah Harga Menu", prompt: "Tolong ubah harga menu Matcha Latte jadi Rp 29.000." },
  { label: "💰 Analisa HPP & Resep", prompt: "Tolong tampilkan rincian HPP, modal bahan baku per cup, takaran resep, dan margin keuntungan dari menu-menu kita." },
  { label: "📦 Cek Bahan Baku", prompt: "Apakah ada bahan baku yang persediaannya menipis atau perlu restock segera?" },
  { label: "📊 Performa 30 Hari", prompt: "Bagaimana ringkasan performa penjualan toko kita dalam 30 hari terakhir?" },
];

function parseProposalFromText(text: string): { cleanText: string; proposal: ActionProposal | null } {
  const match = text.match(/<<<ACTION_PROPOSAL>>>([\s\S]*?)<<<END_ACTION_PROPOSAL>>>/);
  if (!match) return { cleanText: text, proposal: null };

  const cleanText = text.replace(/<<<ACTION_PROPOSAL>>>[\s\S]*?<<<END_ACTION_PROPOSAL>>>/, "").trim();
  try {
    const rawJson = JSON.parse(match[1].trim());
    return {
      cleanText,
      proposal: {
        id: "prop-" + Date.now(),
        actionType: rawJson.actionType,
        title: rawJson.title || "Proposal Aksi Toko",
        summary: rawJson.summary || "Perubahan data toko",
        payload: rawJson.payload || {},
        status: "PENDING",
      },
    };
  } catch (err) {
    return { cleanText: text, proposal: null };
  }
}

export function AdminAIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Halo Bos! 🍵 Saya **Asisten Toko Matchaboy (Autonomous Operator)**.\n\nSaya bisa **menganalisa data bisnis**, **mengecek resep & HPP modal**, **membuat voucher**, **mengubah harga/status menu**, hingga **membaca foto struk belanja supplier (Level 1 & 2)**.\n\nSetiap aksi perubahan data akan selalu saya konfirmasikan ke Bos terlebih dahulu sebelum dieksekusi. Ada yang bisa saya bantu?",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("matchaboy_ai_chat_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.warn("Failed to load chat history from localStorage:", err);
    }
  }, []);

  // Auto-save chat history to localStorage on changes
  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].id !== "welcome")) {
      try {
        localStorage.setItem("matchaboy_ai_chat_history", JSON.stringify(messages));
      } catch (err) {
        console.warn("Failed to save chat history to localStorage:", err);
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setSelectedImage({
        data: base64Data,
        mimeType: file.type || "image/jpeg",
        preview: result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if ((!text && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    const currentTimestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text || (currentImage ? "Tolong analisa foto struk belanja terlampir ini." : ""),
      timestamp: currentTimestamp,
      imageUrl: currentImage?.preview,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();

    // Pre-insert empty assistant message container
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: currentTimestamp,
      },
    ]);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          image: currentImage ? { mimeType: currentImage.mimeType, data: currentImage.data } : undefined,
        }),
      });

      if (!res.ok) {
        let errMessage = "Gagal memproses jawaban.";
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `⚠️ Maaf Bos, terjadi kendala: ${errMessage}` }
              : m
          )
        );
        return;
      }

      if (!res.body) {
        throw new Error("No response stream body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedRawContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedRawContent += chunk;

        // Parse any action proposal block
        const { cleanText, proposal } = parseProposalFromText(streamedRawContent);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: cleanText,
                  proposal: proposal || m.proposal,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "⚠️ Gagal terhubung ke server asisten. Silakan coba lagi." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (msgId: string, proposal: ActionProposal) => {
    // Set state to EXECUTING
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.proposal ? { ...m, proposal: { ...m.proposal, status: "EXECUTING" } } : m
      )
    );

    try {
      const res = await fetch("/api/admin/ai/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: proposal.actionType,
          payload: proposal.payload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.proposal
              ? {
                  ...m,
                  proposal: {
                    ...m.proposal,
                    status: "EXECUTED",
                    executionResult: data.message || "Aksi berhasil dieksekusi ke database toko!",
                  },
                }
              : m
          )
        );
      } else {
        alert(data.error || "Gagal mengeksekusi aksi.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.proposal ? { ...m, proposal: { ...m.proposal, status: "PENDING" } } : m
          )
        );
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi saat mengeksekusi aksi.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.proposal ? { ...m, proposal: { ...m.proposal, status: "PENDING" } } : m
        )
      );
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.proposal
          ? {
              ...m,
              proposal: {
                ...m.proposal,
                status: "CANCELLED",
                executionResult: "Aksi dibatalkan oleh Bos.",
              },
            }
          : m
      )
    );
  };

  const handleClearChat = () => {
    try {
      localStorage.removeItem("matchaboy_ai_chat_history");
    } catch (_) {}
    setMessages([
      {
        id: "welcome-reset-" + Date.now(),
        role: "assistant",
        content: "Riwayat percakapan telah dibersihkan. Ada data toko yang ingin dianalisa atau aksi yang ingin dieksekusi, Bos?",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper format clean markdown text (eliminates raw ###, ---, and dangling *)
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((rawLine, lineIdx) => {
      let line = rawLine.trim();

      // Empty line
      if (!line) {
        return <div key={lineIdx} className="h-1.5" />;
      }

      // Horizontal Divider --- or ***
      if (line === "---" || line === "***" || line === "___") {
        return <div key={lineIdx} className="border-t border-slate-200/80 my-2" />;
      }

      // Header lines starting with ### or ## or #
      const isHeader = /^#{1,4}\s+/.test(line);
      if (isHeader) {
        const cleanHeader = line.replace(/^#{1,4}\s+/, "").replace(/^\*+|\*+$/g, "");
        return (
          <div
            key={lineIdx}
            className="my-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 font-heading font-extrabold text-slate-900 text-[12px] flex items-center gap-1.5 shadow-sm"
          >
            <span>{cleanHeader}</span>
          </div>
        );
      }

      // Bullet points (* or - or •)
      const isBullet = /^[\*\-\•]\s+/.test(line);
      if (isBullet) {
        line = line.replace(/^[\*\-\•]\s+/, "");
      }

      // Numbered items (1. or 2.)
      const isNumbered = /^\d+\.\s+/.test(line);

      // Clean up any dangling asterisks like "Harga Jual:*" -> "Harga Jual:"
      const cleanedLine = line.replace(/:\*/g, ":");

      // Split bold segments (**bold** or *bold*)
      const parts = cleanedLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

      return (
        <div
          key={lineIdx}
          className={`leading-relaxed text-[12px] ${
            isBullet ? "flex items-start gap-2 pl-2 my-0.5" : isNumbered ? "font-semibold my-1" : "my-0.5"
          }`}
        >
          {isBullet && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
          )}
          <p className="flex-1">
            {parts.map((part, pIdx) => {
              if (
                (part.startsWith("**") && part.endsWith("**")) ||
                (part.startsWith("*") && part.endsWith("*"))
              ) {
                const clean = part.replace(/^\*+|\*+$/g, "");
                return (
                  <strong key={pIdx} className="font-extrabold text-slate-900">
                    {clean}
                  </strong>
                );
              }
              return <span key={pIdx}>{part.replace(/\*/g, "")}</span>;
            })}
          </p>
        </div>
      );
    });
  };

  return (
    <>
      {/* Hidden File Input for Image/Receipt Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImagePick}
        accept="image/*"
        className="hidden"
      />

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
            className="fixed bottom-6 right-6 z-50 w-[94vw] sm:w-[440px] h-[600px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden"
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
                      Co-Pilot 3.6
                    </span>
                  </h3>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online • Action Calling & Vision Active
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
                    className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm space-y-2.5 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-tr-none font-medium"
                        : "bg-white text-slate-800 border border-slate-200/70 rounded-tl-none font-normal"
                    }`}
                  >
                    {/* Uploaded image thumbnail if any */}
                    {msg.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/20 shadow-sm max-w-[200px]">
                        <img src={msg.imageUrl} alt="Lampiran Struk" className="w-full h-auto object-cover max-h-[140px]" />
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="text-[12px] whitespace-pre-wrap leading-relaxed">
                      {!msg.content && msg.role === "assistant" && !msg.proposal ? (
                        <div className="flex items-center gap-2 py-1 text-slate-400">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span className="text-[11px] font-semibold text-slate-500">Menganalisis data & menyusun aksi...</span>
                        </div>
                      ) : (
                        renderFormattedText(msg.content)
                      )}
                    </div>

                    {/* ── ACTION PROPOSAL CONFIRMATION BOX (Antigravity Style) ── */}
                    {msg.proposal && (
                      <div className="mt-2.5 p-3.5 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 to-amber-50/60 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded-lg bg-emerald-500 text-white shadow-xs">
                              <FileCheck className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950">
                              Proposal Aksi (Konfirmasi Bos)
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              msg.proposal.status === "EXECUTED"
                                ? "bg-emerald-200 text-emerald-900"
                                : msg.proposal.status === "CANCELLED"
                                ? "bg-rose-100 text-rose-800"
                                : msg.proposal.status === "EXECUTING"
                                ? "bg-amber-200 text-amber-900 animate-pulse"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {msg.proposal.status === "EXECUTED"
                              ? "✅ Selesai"
                              : msg.proposal.status === "CANCELLED"
                              ? "❌ Dibatalkan"
                              : msg.proposal.status === "EXECUTING"
                              ? "⏳ Memproses..."
                              : "Perlu Persetujuan"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-slate-900">{msg.proposal.title}</p>
                          <p className="text-[11px] text-slate-600 leading-snug">{msg.proposal.summary}</p>
                        </div>

                        {/* Payload summary badge grid */}
                        <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-[11px] space-y-1 font-mono text-slate-700">
                          {Object.entries(msg.proposal.payload).map(([k, v]) => {
                            if (typeof v === "object" && v !== null) {
                              return (
                                <div key={k} className="flex justify-between gap-2 border-b border-slate-100 pb-0.5">
                                  <span className="font-semibold text-slate-500">{k}:</span>
                                  <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">{JSON.stringify(v)}</span>
                                </div>
                              );
                            }
                            return (
                              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 pb-0.5 last:border-0 last:pb-0">
                                <span className="font-semibold text-slate-500">{k}:</span>
                                <span className="font-bold text-slate-900 text-right">{String(v)}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Interactive Buttons */}
                        {msg.proposal.status === "PENDING" && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleExecuteAction(msg.id, msg.proposal!)}
                              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Konfirmasi & Eksekusi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAction(msg.id)}
                              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Batal</span>
                            </button>
                          </div>
                        )}

                        {/* Executed Result Banner */}
                        {msg.proposal.status === "EXECUTED" && (
                          <div className="p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-[11px] font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>{msg.proposal.executionResult}</span>
                          </div>
                        )}

                        {/* Cancelled Banner */}
                        {msg.proposal.status === "CANCELLED" && (
                          <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-semibold flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Aksi dibatalkan oleh Bos. Tidak ada perubahan data di sistem.</span>
                          </div>
                        )}
                      </div>
                    )}

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

            {/* Image Preview Chip if selected */}
            {selectedImage && (
              <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={selectedImage.preview} alt="Preview" className="w-7 h-7 rounded-lg object-cover border border-slate-300" />
                  <span className="text-[11px] font-bold text-slate-700">Foto Struk / Gambar Terlampir</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Bar with Attachment */}
            <div className="p-3 bg-white border-t border-slate-150 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Unggah Foto Struk / Nota Belanja"
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={selectedImage ? "Ketik instruksi struk (opsional)..." : "Ketik instruksi aksi atau pertanyaan toko..."}
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
                disabled={(!input.trim() && !selectedImage) || isLoading}
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
