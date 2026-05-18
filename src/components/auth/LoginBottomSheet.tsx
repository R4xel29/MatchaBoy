import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LoginBottomSheet({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleWAClick = () => {
    setLoading(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const formattedToken = `${token.substring(0,8)}-${token.substring(8,12)}-${token.substring(12,16)}-${token.substring(16,20)}-${token.substring(20,32)}`;
    const otp = Math.floor(10000 + Math.random() * 90000);
    
    let waMessage = `Hi Arus, request link untuk Masuk / Daftar ke aplikasi Arus dengan nomor WhatsApp ini dong ${formattedToken}. OTP ${otp}.`;
    
    if (typeof window !== 'undefined') {
      waMessage += ` Domain: ${window.location.origin}.`;
    }
    
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent(waMessage)}`, '_blank');
    setLoading(false);
  };

  const handleWALogin = (targetPhone?: string) => {
    setLoading(true);
    // Standard WA login flow from login page
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const formattedToken = `${token.substring(0,8)}-${token.substring(8,12)}-${token.substring(12,16)}-${token.substring(16,20)}-${token.substring(20,32)}`;
    const otp = Math.floor(10000 + Math.random() * 90000);
    
    let waMessage = `Hi Arus, request link untuk Masuk / Daftar ke aplikasi Arus dengan nomor WhatsApp ini dong ${formattedToken}. OTP ${otp}.`;
    
    if (typeof window !== 'undefined') {
      waMessage += ` Domain: ${window.location.origin}.`;
    }

    if (targetPhone) {
      let stdPhone = targetPhone.replace(/[^0-9]/g, '');
      if (stdPhone.startsWith('08')) {
        stdPhone = '62' + stdPhone.substring(1);
      } else if (stdPhone.startsWith('8')) {
        stdPhone = '62' + stdPhone;
      }
      waMessage += ` HP: ${stdPhone}.`;
    }
    
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent(waMessage)}`, '_blank');
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/profile' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl pt-2 pb-safe shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Grabber handle */}
            <div className="w-full flex justify-center mb-4">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            <div className="px-6 pb-6 pt-2">
              {!showOtherMethods ? (
                // VIEW 1: Main View (Image 1)
                <div className="space-y-4">
                  <div className="flex justify-end mb-4">
                    <button 
                      onClick={() => setShowOtherMethods(true)}
                      className="px-4 py-2 border border-[#B48A5E] text-[#B48A5E] rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#B48A5E]/5"
                    >
                      Metode Lainnya
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>

                  <button
                    onClick={handleWAClick}
                    className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-3 text-[17px]"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Masuk / Daftar Instan
                  </button>

                  <p className="text-sm text-center text-gray-500 mt-4 px-4 leading-relaxed">
                    BARU! Masuk atau Daftar instan dengan WhatsApp—<br/>tanpa ribet OTP!
                  </p>
                </div>
              ) : (
                // VIEW 2: WhatsApp Input or Google (Image 2)
                <div className="space-y-6">
                  <button 
                    onClick={() => setShowOtherMethods(false)}
                    className="px-4 py-2 border border-[#B48A5E] text-[#B48A5E] rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#B48A5E]/5 w-max"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    WhatsApp Masuk / Daftar Instan
                  </button>

                  <div className="space-y-4 mt-6">
                    <div className="flex bg-gray-50 rounded-xl overflow-hidden border border-gray-100 focus-within:border-[#B48A5E] focus-within:ring-1 focus-within:ring-[#B48A5E]/50 transition-all">
                      <div className="pl-4 pr-3 py-4 flex items-center justify-center font-bold text-gray-800 border-r border-gray-200">
                        +62
                      </div>
                      <input 
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Nomor Handphone"
                        className="flex-1 px-4 py-4 bg-transparent outline-none font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
                      />
                    </div>

                    <button
                      onClick={() => handleWALogin(phone)}
                      disabled={!phone || loading}
                      className="w-full py-4 bg-gray-200 text-gray-500 rounded-xl font-bold hover:bg-[#B48A5E] hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-gray-200 disabled:hover:text-gray-500 flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lanjut Konfirmasi"}
                    </button>
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">ATAU</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-full font-bold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Lanjutkan dengan Google
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
