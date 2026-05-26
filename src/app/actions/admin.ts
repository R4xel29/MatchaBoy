'use server'

import { prisma } from '@/lib/prisma'
import { auth, signIn } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/admin-logger'
import crypto from 'crypto'

export async function updateUserRole(userId: string, newRole: string) {
  const session = await auth()
  
  // Basic security check: Only ADMIN can change roles
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  // Prevent admin from removing their own admin privileges easily if they are the last admin
  // (Optional, but good practice. For now, we'll just prevent changing their own role via this simple check)
  if (session.user.id === userId) {
     return { success: false, error: 'Cannot change your own role.' }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      details: `Mengubah hak akses pengguna menjadi ${newRole}`
    });

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Failed to update role:', error)
    return { success: false, error: 'Failed to update user role' }
  }
}

export async function impersonateUserAction(targetUserId: string) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  if (session.user.id === targetUserId) {
    return { success: false, error: 'Cannot impersonate yourself' }
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { success: false, error: 'Server misconfiguration: MISSING_SECRET' };

  const timestamp = Date.now().toString();
  const signature = crypto
       .createHmac('sha256', secret)
       .update(`${targetUserId}:${timestamp}`)
       .digest('hex');

  await logAdminAction({
      userId: session.user.id,
      action: 'LOGIN',
      entity: 'USER',
      entityId: targetUserId,
      details: `Masuk sebagai pengguna lain (Impersonate)`
  });

  await signIn('impersonate', {
      userId: targetUserId,
      timestamp,
      signature,
      redirectTo: '/profile'
  });
}

export async function revokeSessionAction(sessionId: string, targetUserId: string) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!targetSession || targetSession.userId !== targetUserId) {
      return { success: false, error: 'Session not found' }
    }

    await prisma.session.delete({
      where: { id: sessionId }
    })

    await logAdminAction({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'USER',
      entityId: targetUserId,
      details: `Memutuskan sesi perangkat (${targetSession.deviceType || 'Unknown'} - ${targetSession.os || 'Unknown'}) milik pengguna`
    });

    revalidatePath(`/admin/customers/${targetUserId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to revoke session:', error)
    return { success: false, error: 'Failed to revoke session' }
  }
}

export async function revokeAllSessionsAction(targetUserId: string) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const result = await prisma.session.deleteMany({
      where: { userId: targetUserId }
    })

    await logAdminAction({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'USER',
      entityId: targetUserId,
      details: `Mengeluarkan pengguna dari seluruh perangkat (${result.count} sesi dihapus)`
    });

    revalidatePath(`/admin/customers/${targetUserId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to revoke all sessions:', error)
    return { success: false, error: 'Failed to revoke all sessions' }
  }
}

export async function getIpLocationAction(ip: string) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized', location: '' }
  }

  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { success: true, location: 'Localhost / Jaringan Lokal' }
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`, { next: { revalidate: 86400 } })
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success') {
        const city = data.city || ''
        const region = data.regionName || ''
        const country = data.country || ''
        const parts = [city, region, country].filter(Boolean)
        return { success: true, location: parts.join(', ') }
      }
    }
  } catch (error) {
    console.error('Failed to get IP location:', error)
  }

  // Fallback to ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { next: { revalidate: 86400 } })
    if (res.ok) {
      const data = await res.json()
      if (!data.error) {
        const city = data.city || ''
        const region = data.region || ''
        const country = data.country_name || ''
        const parts = [city, region, country].filter(Boolean)
        return { success: true, location: parts.join(', ') }
      }
    }
  } catch (error) {
    console.error('Failed to get IP location fallback:', error)
  }

  return { success: false, location: 'Lokasi tidak diketahui' }
}


