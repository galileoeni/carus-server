import { AppDataSource } from '../data-source'
import { Notification, NotificationType } from '../entities/notification'
import { User } from '../entities/user'
import { socketService } from './socket.service'

class NotificationService {
  private notificationRepository = AppDataSource.getRepository(Notification)

  public async createNotification(
    user: User | undefined,
    title: string,
    message: string,
    type: NotificationType,
    manager?: any,
  ): Promise<Notification> {
    const notification = new Notification()
    notification.title = title
    notification.message = message
    notification.type = type
    if (user) {
      notification.user = user
    }

    const savedNotification = await (manager
      ? manager.getRepository(Notification)
      : this.notificationRepository
    ).save(notification)

    if (user && user.id) {
      socketService.emitToUser(user.id, 'notification', savedNotification)
      if (user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, title, message)
      }
    } else {
      socketService.emitToAll('notification', savedNotification)
      await this.broadcastPushNotification(title, message)
    }

    return savedNotification
  }

  public async sendBroadcastNotification(
    title: string,
    message: string,
  ): Promise<void> {
    await this.createNotification(undefined, title, message, NotificationType.ANNOUNCEMENT)
  }

  // Placeholder for push notification logic (e.g., using firebase-admin)
  private async sendPushNotification(token: string, title: string, message: string) {
    console.log(`Sending push notification to token: ${token}`)
    console.log(`Title: ${title}, Message: ${message}`)
  }

  private async broadcastPushNotification(title: string, message: string) {
    console.log(`Broadcasting push notification to all devices`)
    console.log(`Title: ${title}, Message: ${message}`)
  }
}

export const notificationService = new NotificationService()
