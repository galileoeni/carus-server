import { Router } from 'express'

import {
  getBusinessMe,
  registerBusiness,
  verifyBusinessEmail,
} from '../controllers/auth.controller'
import { getBusinessData } from '../controllers/data.controller'
import {
  cancelBusinessPickup,
  getBusinessSchedule,
  requestQuickPickup,
} from '../controllers/schedule.controller'
import { loginBusiness } from '../../auth/controllers/login.controller'
import verifyBusiness from '../../helpers/verifyBusiness'

// Mounted at /v1/business. Resending the code and password reset use the
// shared /v1/auth routes.
const router = Router()

router.post('/auth/register', registerBusiness)
router.post('/auth/verify', verifyBusinessEmail)
router.post('/auth/login', loginBusiness)

router.get('/me', verifyBusiness, getBusinessMe)

router.get('/schedule', verifyBusiness, getBusinessSchedule)
router.post('/pickups', verifyBusiness, requestQuickPickup)
router.post('/pickups/:id/cancel', verifyBusiness, cancelBusinessPickup)

router.get('/data', verifyBusiness, getBusinessData)

export default router
