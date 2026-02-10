import { Router } from 'express'
import { sendPushNotification } from '../controllers/notification.controller'
import verifyAdmin from '../../helpers/verifyAdmin'

const router = Router()

router.post('/push', verifyAdmin, sendPushNotification)

export default router
