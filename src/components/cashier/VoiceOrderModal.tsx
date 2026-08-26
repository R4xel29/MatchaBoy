"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, X, Loader2, CheckCircle2, Volume2, AlertCircle } from "lucide-react";

interface VoiceOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  sugarLevel: string;
  iceLevel: string;
  matchaLevel: number;
  size: string;
  sizePrice: number;
  shotName: string;
  shotCount: number;
  shotPrice: number;
  notes?: string;
}

interface ParsedVoiceOrder {
  customerName?: string | null;
  orderType?: "PICKUP" | "DINE_IN" | null;
  tableNumber?: string | null;
  items: VoiceOrderItem[];
  spokenSummary: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOrderParsed: (order: ParsedVoiceOrder) => void;
}

export function VoiceOrderModal({ isOpen, onClose, onOrderParsed }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript("");
      setErrorMessage(null);
      return;
    }

    // Auto-start listening when modal opens
    startListening();

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    setErrorMessage(null);
    setTranscript("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Browser tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau ketik manual.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + " ";
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn("[SPEECH_REC_ERROR]", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Izin akses mikrofon ditolak. Harap izinkan mikrofon di browser.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setErrorMessage("Gagal memulai mikrofon. Silakan coba lagi.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleSubmitTranscript = async (textToProcess?: string) => {
    const text = (textToProcess || transcript).trim();
    if (!text) {
      setErrorMessage("Belum ada suara yang terdengar. Silakan bicara lagi.");
      return;
    }

    stopListening();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/ai/voice-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        onOrderParsed(json.data);
        onClose();
      } else {
        setErrorMessage(json.error || "Gagal mengenali pesanan dari suara.");
      }
    } catch (err: any) {
      console.error("[VOICE_ORDER_SUBMIT_ERROR]", err);
      setErrorMessage("Terjadi kesalahan koneksi ke server AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base flex items-center gap-2">
                  <span>Pesan Suara AI (Voice POS)</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-amber-950">
                    Auto-Default
                  </span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Bicara secara alami, AI otomatis memasukkan ke keranjang kasir
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 flex flex-col items-center text-center space-y-5">
            {/* Animated Mic Indicator */}
            <div className="relative flex items-center justify-center my-2">
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute w-28 h-28 rounded-full bg-emerald-500/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute w-24 h-24 rounded-full bg-emerald-500/30"
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={isProcessing}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
                  isListening
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/40 animate-pulse"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                }`}
              >
                {isListening ? (
                  <Mic className="w-8 h-8 animate-bounce" />
                ) : (
                  <MicOff className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>

            <p className="text-xs font-bold text-slate-500">
              {isListening ? (
                <span className="text-emerald-700 font-extrabold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Mendengarkan ucapan kasir / pelanggan...
                </span>
              ) : (
                "Mikrofon dijeda. Klik tombol mic untuk mulai bicara lagi."
              )}
            </p>

            {/* Live Transcript Display Box */}
            <div className="w-full min-h-[90px] max-h-[140px] p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left overflow-y-auto">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                Teks Ucapan Terdeteksi:
              </span>
              {transcript ? (
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  "{transcript}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Contoh: "Pesan dua matcha latte less sugar sama satu croissant dine in meja empat"
                </p>
              )}
            </div>

            {/* Auto-Default Explanation Note */}
            <div className="w-full p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-left text-[11px] text-amber-900 space-y-1">
              <p className="font-extrabold flex items-center gap-1 text-amber-950">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Aturan Otomatis Default:
              </p>
              <p className="text-amber-800 leading-snug">
                Jika gula, matcha, atau extra shot tidak disebutkan, AI otomatis menetapkan: <strong>Gula Normal (Biasa)</strong>, <strong>Es Normal</strong>, <strong>Matcha Lvl 5</strong>, dan <strong>Single Shot</strong>.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => handleSubmitTranscript()}
                disabled={!transcript.trim() || isProcessing}
                className="flex-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menganalisis Pesanan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesai & Masukkan ke Keranjang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
