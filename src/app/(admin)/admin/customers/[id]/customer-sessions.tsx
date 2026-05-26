'use client'

import { useState, useTransition, useEffect } from 'react'
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  Globe, 
  Trash2, 
  LogOut, 
  ShieldAlert, 
  Clock,
  Sparkles,
  MapPin
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { revokeSessionAction, revokeAllSessionsAction, getIpLocationAction } from '@/app/actions/admin'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Session {
  id: string
  sessionToken: string
  expires: Date
  userAgent: string | null
  ipAddress: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  lastActive: Date
  createdAt: Date
}

interface CustomerSessionsProps {
  sessions: Session[]
  userId: string
}

export default function CustomerSessions({ sessions, userId }: CustomerSessionsProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [locations, setLocations] = useState<Record<string, string>>({})

  useEffect(() => {
    sessions.forEach(async (session) => {
      if (session.ipAddress && !locations[session.id]) {
        try {
          const res = await getIpLocationAction(session.ipAddress)
          if (res.success && res.location) {
            setLocations(prev => ({ ...prev, [session.id]: res.location }))
          } else {
            setLocations(prev => ({ ...prev, [session.id]: 'Lokasi tidak diketahui' }))
          }
        } catch (e) {
          console.error(e)
          setLocations(prev => ({ ...prev, [session.id]: 'Gagal memuat lokasi' }))
        }
      }
    })
  }, [sessions])
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const handleRevokeSession = async (sessionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Putuskan Sesi',
      message: 'Apakah Anda yakin ingin memutuskan sesi perangkat ini? Pengguna akan langsung dikeluarkan dari perangkat tersebut.',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setLoadingSessionId(sessionId)
        setMessage(null)

        startTransition(async () => {
          try {
            const result = await revokeSessionAction(sessionId, userId)
            if (result.success) {
              setMessage({ type: 'success', text: 'Sesi perangkat berhasil diputuskan!' })
            } else {
              setMessage({ type: 'error', text: result.error || 'Gagal memutuskan sesi' })
            }
          } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' })
          } finally {
            setLoadingSessionId(null)
          }
        })
      }
    })
  }

  const handleRevokeAll = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Putuskan Semua Sesi',
      message: 'Apakah Anda yakin ingin memutuskan SELURUH sesi perangkat untuk pengguna ini? Pengguna akan keluar dari semua perangkat aktif.',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setLoadingAll(true)
        setMessage(null)

        startTransition(async () => {
          try {
            const result = await revokeAllSessionsAction(userId)
            if (result.success) {
              setMessage({ type: 'success', text: 'Seluruh sesi perangkat berhasil diputuskan!' })
            } else {
              setMessage({ type: 'error', text: result.error || 'Gagal memutuskan seluruh sesi' })
            }
          } catch (err) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' })
          } finally {
            setLoadingAll(false)
          }
        })
      }
    })
  }

  const getDeviceIcon = (deviceType: string | null) => {
    const type = deviceType?.toLowerCase() || ''
    if (type === 'mobile') return <Smartphone className="w-5 h-5 text-brand-600" />
    if (type === 'tablet') return <Tablet className="w-5 h-5 text-brand-600" />
    return <Laptop className="w-5 h-5 text-brand-600" />
  }

  return (
    <div className="bg-white rounded-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100 shadow-sm relative group overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-tr from-brand-400/10 to-brand-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <Laptop className="w-5 h-5 text-brand-600 relative z-10 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base tracking-tight flex items-center gap-1.5">
              Perangkat & Sesi Login
              <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
            </h3>
            <p className="text-xs text-muted-foreground">Daftar perangkat yang aktif mengakses akun ini</p>
          </div>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleRevokeAll}
            disabled={isPending || loadingAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-2xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {loadingAll ? 'Memproses...' : 'Keluarkan dari Semua Perangkat'}
          </button>
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border-green-100' 
            : 'bg-red-50 text-red-700 border-red-100'
        } animate-fade-in`}>
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-3xl bg-gray-50/30">
            <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground mb-1">Tidak Ada Sesi Aktif</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Pengguna saat ini tidak terhubung di perangkat manapun atau sesi telah kedaluwarsa.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {sessions.map((session, index) => {
              const isLoading = loadingSessionId === session.id
              const lastActiveDist = formatDistanceToNow(new Date(session.lastActive), { 
                addSuffix: true, 
                locale: localeId 
              })

              return (
                <div 
                  key={session.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 ${
                    index === 0 ? 'pt-0' : ''
                  } ${
                    index === sessions.length - 1 ? 'pb-0' : ''
                  } group hover:bg-muted/10 rounded-2xl px-2 -mx-2 transition-colors duration-200`}
                >
                  <div className="flex items-start gap-4">
                    {/* Device Icon Circle */}
                    <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center shadow-sm shrink-0 border border-border/30 group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors duration-300">
                      {getDeviceIcon(session.deviceType)}
                    </div>

                    {/* Device & Browser Info */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-foreground">
                          {session.browser || 'Browser'} di {session.os || 'Perangkat'}
                        </h4>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 tracking-wider">
                          {session.deviceType || 'Desktop'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          IP: {session.ipAddress || 'Unknown IP'}
                        </span>
                        {session.ipAddress && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline-block"></span>
                            <span className="flex items-center gap-1 text-brand-700">
                              <MapPin className="w-3.5 h-3.5 text-brand-500" />
                              {locations[session.id] || 'Mencari lokasi...'}
                            </span>
                          </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline-block"></span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Aktif {lastActiveDist}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        Pertama login: {format(new Date(session.createdAt), "d MMM yyyy, HH:mm", { locale: localeId })}
                      </p>
                    </div>
                  </div>

                  {/* Revoke Button */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={isPending || isLoading}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-border/50 text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-100 disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer group-hover:border-border"
                      title="Putuskan Sesi Perangkat"
                    >
                      <Trash2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
