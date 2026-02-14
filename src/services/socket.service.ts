import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import env from '../config/environment'

class SocketService {
  private io: SocketIOServer | null = null
  private userSockets: Map<string, string> = new Map()
  private socketToUser: Map<string, string> = new Map()

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
          const decoded = jwt.verify(token, env.AUTH.JWT_SECRET) as {
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
}

export const socketService = new SocketService()
