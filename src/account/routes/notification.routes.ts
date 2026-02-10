import { Router } from 'express'
import { getNotifications, markAsRead, updateFcmToken } from '../controllers/notification.controller'
import verifyToken from '../../helpers/verifyToken'

const router = Router()

router.get('/', verifyToken, getNotifications)
router.patch('/:id/read', verifyToken, markAsRead)
router.post('/token', verifyToken, updateFcmToken)

export default router
