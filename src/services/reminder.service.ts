import cron from 'node-cron'
import { Between, In } from 'typeorm'
import { AppDataSource } from '../data-source'
import { Schedule } from '../entities/schedule'
import { notificationService } from './notification.service'
import { NotificationType } from '../entities/notification'

class ReminderService {
  private scheduleRepository = AppDataSource.getRepository(Schedule)

  public init() {
    // Run every day at 8:00 AM
    cron.schedule('0 8 * * *', () => {
      console.log('Running daily schedule reminders...')
      this.checkReminders()
    })
  }

  public async checkReminders() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(today.getDate() + 7)

    const oneDayFromNow = new Date(today)
    oneDayFromNow.setDate(today.getDate() + 1)

    // Check for 7 days away
    await this.sendRemindersForDate(sevenDaysFromNow, '7 days')
    // Check for 1 day away
    await this.sendRemindersForDate(oneDayFromNow, '1 day')
    // Check for today
    await this.sendRemindersForDate(today, 'today')
  }

  private async sendRemindersForDate(targetDate: Date, timeLabel: string) {
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const schedules = await this.scheduleRepository.find({
      where: {
        date: Between(startOfDay, endOfDay),
        status: In(['pending', 'accepted']),
      },
      relations: ['user'],
    })

    for (const schedule of schedules) {
      if (schedule.user) {
        const message = timeLabel === 'today'
          ? `Your ${schedule.category} is scheduled for today at ${schedule.address}.`
          : `Your ${schedule.category} is scheduled for ${timeLabel} from now (${schedule.date?.toDateString()}) at ${schedule.address}.`

        await notificationService.createNotification(
          schedule.user,
          'Schedule Reminder',
          message,
          NotificationType.REMINDER,
        )
      }
    }
  }
}

export const reminderService = new ReminderService()
