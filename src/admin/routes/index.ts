import { Router } from 'express'

import {
  acceptSchedule,
  cancelSchedule,
  fulfillSchedule,
  getAllAccounts,
  getAllSchedules,
  getAllTransactions,
  getDashboardData,
  getTotalWalletAmount,
  loginAdmin,
  approveRedemption,
  declineRedemption,
  getAllRedemptions,
} from '../controllers'
import {
  assignAdmin,
  createAdmin,
  removeAdmin,
} from '../controllers/admin-account.controller'
import {
  getDonation,
  getDonations,
} from '../controllers/admin-donation.controller'
import {
  toggleUserStatus,
  viewComplaints,
} from '../controllers/admin-management.controller'
import adminConfigurationRoutes from '../../configurations/routes/adminRoutes'
import verifyAdmin from '../../helpers/verifyAdmin'

const router = Router()

router.post('/login', loginAdmin)

router.get('/dashboard', verifyAdmin, getDashboardData)

// Admin Management Routes
router.post('/create-admin', verifyAdmin, createAdmin)
router.patch('/assign-admin/:id', verifyAdmin, assignAdmin)
router.patch('/remove-admin/:id', verifyAdmin, removeAdmin)
router.patch('/toggle-user-status/:id', verifyAdmin, toggleUserStatus)

router.put('/schedule/accept/:id', verifyAdmin, acceptSchedule)
router.put('/schedule/cancel/:id', verifyAdmin, cancelSchedule)
router.post('/schedule/fulfill/:id', verifyAdmin, fulfillSchedule)
router.get('/schedules', verifyAdmin, getAllSchedules)
router.get('/accounts', verifyAdmin, getAllAccounts)
router.get('/total-wallet-amount', verifyAdmin, getTotalWalletAmount)
router.get('/donations', verifyAdmin, getDonations)
router.get('/donations/:id', verifyAdmin, getDonation)
router.get('/complaints', verifyAdmin, viewComplaints)
router.get('/transactions', verifyAdmin, getAllTransactions)
router.use('/configurations', verifyAdmin, adminConfigurationRoutes)

router.get('/redemptions', verifyAdmin, getAllRedemptions)
router.put('/redemptions/approve/:id', verifyAdmin, approveRedemption)
router.put('/redemptions/decline/:id', verifyAdmin, declineRedemption)

export default router
