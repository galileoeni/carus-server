import { Router } from 'express'

import {
  getBusinessMe,
  registerBusiness,
  verifyBusinessEmail,
} from '../controllers/auth.controller'
import {
  createBranchInvite,
  getBranchDetail,
  getBranchInvite,
  joinAsBranch,
  listBranches,
  revokeBranchInvite,
} from '../controllers/branches.controller'
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

// HQ: locations and private branch sign-up links
router.get('/branches', verifyBusiness, listBranches)
router.get('/branches/:id', verifyBusiness, getBranchDetail)
router.post('/branch-invites', verifyBusiness, createBranchInvite)
router.delete('/branch-invites/:id', verifyBusiness, revokeBranchInvite)

// Public: a branch signs up through its HQ's link
router.get('/join/:token', getBranchInvite)
router.post('/join/:token', joinAsBranch)

export default router
