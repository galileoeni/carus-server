import { Router } from 'express'

import accountRoutes from '../account/routes'
import adminRoutes from '../admin/routes'
import authRoutes from '../auth/routes'
import configurationRoutes from '../configurations/routes'
import contactRoutes from '../contact/routes'
import donationRoutes from '../donation/routes'
import redemptionRoutes from '../redemption/routes'
import scheduleRoutes from '../schedule/routes'
import transactionRoutes from '../transactions/routes'
import walletRoutes from '../wallet/routes'
import chatbotRoutes from '../chatbot/routes/chatbot.routes'

const router = Router()

router.use('/redeem', redemptionRoutes)
router.use('/donation', donationRoutes)
router.use('/account', accountRoutes)
router.use('/auth', authRoutes)
router.use('/schedule', scheduleRoutes)
router.use('/admin', adminRoutes)
router.use('/transactions', transactionRoutes)
router.use('/wallet', walletRoutes)
router.use('/configurations', configurationRoutes)
router.use('/contact', contactRoutes)
router.use('/chatbot', chatbotRoutes)

export default router
