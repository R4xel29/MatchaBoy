'use client'

import { useState } from 'react'
import { updateUserRole } from '@/app/actions/admin'

export default function RoleSelect({ userId, currentRole }: { userId: string, currentRole: string }) {
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value
    setRole(newRole)
    setLoading(true)
    setError('')

    const result = await updateUserRole(userId, newRole)
    
    if (!result.success) {
      setRole(currentRole) // Revert on failure
      setError(result.error || 'Failed to update')
    }
    
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <select 
        value={role} 
        onChange={handleRoleChange} 
        disabled={loading}
        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-[#B48A5E] focus:border-[#B48A5E] disabled:opacity-50"
      >
        <option value="CUSTOMER">Customer</option>
        <option value="CASHIER">Cashier</option>
        <option value="ADMIN">Admin</option>
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
      {loading && <span className="text-xs text-gray-500">Updating...</span>}
    </div>
  )
}
