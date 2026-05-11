import { Router } from 'express'
import { sendPushNotification } from '../controllers/notification.controller'
import {
  sendNotificationToUser,
  sendPickupNotification,
  sendScheduleUpdateNotification,
} from '../controllers/individual-notification.controller'
import verifyAdmin from '../../helpers/verifyAdmin'

const router = Router()

router.post('/push', verifyAdmin, sendPushNotification)
router.post('/send-to-user', verifyAdmin, sendNotificationToUser)
router.post('/send-pickup', verifyAdmin, sendPickupNotification)
router.post('/send-schedule-update', verifyAdmin, sendScheduleUpdateNotification)

export default router
