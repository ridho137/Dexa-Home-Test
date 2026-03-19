import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useToast } from '../components/toast/useToast'
import { getAccessToken } from './auth-session'

type AdminNotificationPayload = {
  type: 'EMPLOYEE_UPDATED' | 'EMPLOYEE_PASSWORD_CHANGED'
  actorUserId: string
  actorEmail?: string
  actorRole?: string
  createdAtIso?: string
  occurredAtIso?: string
  meta?: Record<string, unknown>
}

function messageFromPayload(payload: AdminNotificationPayload): string {
  const actor = payload.actorEmail ?? payload.actorUserId
  if (payload.type === 'EMPLOYEE_UPDATED') {
    return `${actor} updated employee profile.`
  }
  if (payload.type === 'EMPLOYEE_PASSWORD_CHANGED') {
    return `${actor} changed employee password.`
  }
  return `${actor} sent an admin notification.`
}

export function useAdminNotifications() {
  const { pushToast } = useToast()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    const wsUrl = import.meta.env.VITE_NOTIFICATION_WS_URL ?? 'ws://localhost:3030'

    if (!token) return

    // Connect to `/admin` namespace.
    const socket = io(`${wsUrl}/admin`, {
      auth: { token },
      transports: ['websocket'],
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('admin:notification', (payload: AdminNotificationPayload) => {
      pushToast({ tone: 'adminNotification', message: messageFromPayload(payload) })
    })

    socket.on('connect_error', (err) => {
      // Avoid spamming toasts; just log-ish behaviour.
      pushToast({ tone: 'error500', message: `WS connection failed: ${err instanceof Error ? err.message : 'unknown error'}` })
    })

    return () => {
      socket.off('admin:notification')
      socket.off('connect_error')
      socket.disconnect()
      socketRef.current = null
    }
  }, [pushToast])
}

