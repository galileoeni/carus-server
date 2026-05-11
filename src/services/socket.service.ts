import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import env from '../config/environment'

class SocketService {
  private io: SocketIOServer | null = null
  private userSockets: Map<string, string> = new Map()
  private socketToUser: Map<string, string> = new Map()
  private adminRoom = 'admins'

  public init(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.ALLOWED_ORIGINS
          ? env.ALLOWED_ORIGINS.split(',')
          : 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    })

    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id)

      socket.on('authenticate', (token: string) => {
        try {
          const decoded = jwt.verify(token, env.AUTH.JWT_SECRET as string) as {
            id: string
          }
          const userId = decoded.id
          this.userSockets.set(userId, socket.id);
          this.socketToUser.set(socket.id, userId);
          console.log(`User ${userId} authenticated with socket ${socket.id}`)
          socket.emit('authenticated', { success: true })
        } catch (error) {
          console.error('Socket authentication failed:', error)
          socket.emit('authenticated', {
            success: false,
            message: 'Invalid token',
          })
        }
      })

      socket.on('admin:join', (token: string) => {
        try {
          const decoded = jwt.verify(token, env.AUTH.JWT_SECRET as string) as {
            id: string
            role: string
          }

          // Check if user is admin
          if (decoded.role === 'admin' || decoded.role === 'superadmin') {
            socket.join(this.adminRoom)
            console.log(`Admin ${decoded.id} joined admin room`)
            socket.emit('admin:joined', { success: true })
          } else {
            socket.emit('admin:joined', {
              success: false,
              message: 'Not authorized as admin',
            })
          }
        } catch (error) {
          console.error('Admin join failed:', error)
          socket.emit('admin:joined', {
            success: false,
            message: 'Invalid token',
          })
        }
      })

      socket.on('admin:leave', () => {
        socket.leave(this.adminRoom)
        console.log(`Socket ${socket.id} left admin room`)
      })

      socket.on('disconnect', () => {
        for (const [userId, socketId] of this.userSockets.entries()) {
          if (socketId === socket.id) {
            this.userSockets.delete(userId)
            console.log(`User ${userId} disconnected`)
            break
          }
        }
      })
    })
  }

  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return

    const socketId = this.userSockets.get(userId)
    if (socketId) {
      this.io.to(socketId).emit(event, data)
    }
  }

  public emitToAll(event: string, data: any): void {
    if (!this.io) return
    this.io.emit(event, data)
  }

  public emitToAdmins(event: string, data: any): void {
    if (!this.io) return
    this.io.to(this.adminRoom).emit(event, data)
  }

  public emitUserUpdated(userId: string, userData: any): void {
    this.emitToAdmins('admin:user-updated', {
      userId,
      userData,
      timestamp: new Date().toISOString(),
    })
  }

  public emitScheduleUpdated(scheduleId: string, scheduleData: any): void {
    this.emitToAdmins('admin:schedule-updated', {
      scheduleId,
      scheduleData,
      timestamp: new Date().toISOString(),
    })
  }

  public emitRedemptionUpdated(redemptionId: string, redemptionData: any): void {
    this.emitToAdmins('admin:redemption-updated', {
      redemptionId,
      redemptionData,
      timestamp: new Date().toISOString(),
    })
  }

  public emitTransactionCreated(transactionId: string, transactionData: any): void {
    this.emitToAdmins('admin:transaction-created', {
      transactionId,
      transactionData,
      timestamp: new Date().toISOString(),
    })
  }

  public emitNotificationSent(notificationData: any): void {
    this.emitToAdmins('admin:notification-sent', {
      notificationData,
      timestamp: new Date().toISOString(),
    })
  }
}

export const socketService = new SocketService()
