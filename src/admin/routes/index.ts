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
  getAllUsers,
  getAllAdmins,
  getUserById,
} from '../controllers'
import {
  assignAdmin,
  createAdmin,
  removeAdmin,
  promoteToMasterAdmin,
  demoteToBaseAdmin,
  deactivateUser,
  manualPayment,
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
import verifyMasterAdmin from '../../helpers/verifyMasterAdmin'
import notificationRoutes from './notification.routes'

const router = Router()

router.post('/login', loginAdmin)

router.get('/dashboard', verifyAdmin, getDashboardData)

// Admin Management Routes
router.post('/create-admin', verifyAdmin, createAdmin)
router.patch('/assign-admin/:id', verifyAdmin, assignAdmin)
router.patch('/remove-admin/:id', verifyAdmin, removeAdmin)
router.patch('/toggle-user-status/:id', verifyAdmin, toggleUserStatus)

// Master Admin Only Routes
router.patch('/admins/:id/promote-to-master', verifyMasterAdmin, promoteToMasterAdmin) // Promote to master admin
router.patch('/admins/:id/demote-to-base', verifyMasterAdmin, demoteToBaseAdmin) // Demote to base admin
router.delete('/admins/:id', verifyMasterAdmin, removeAdmin) // Delete admin (master only)

router.put('/schedule/accept/:id', verifyAdmin, acceptSchedule)
router.put('/schedule/cancel/:id', verifyAdmin, cancelSchedule)
router.post('/schedule/fulfill/:id', verifyAdmin, fulfillSchedule)
router.get('/schedules', verifyAdmin, getAllSchedules)
router.get('/accounts', verifyAdmin, getAllAccounts)
router.get('/users', verifyAdmin, getAllUsers)
router.get('/users/:id', verifyAdmin, getUserById)
router.post('/users/:id/payment', verifyAdmin, manualPayment)
router.delete('/users/:id', verifyAdmin, deactivateUser)
router.get('/admins', verifyAdmin, getAllAdmins)
router.get('/total-wallet-amount', verifyAdmin, getTotalWalletAmount)
router.get('/donations', verifyAdmin, getDonations)
router.get('/donations/:id', verifyAdmin, getDonation)
router.get('/complaints', verifyAdmin, viewComplaints)
router.get('/transactions', verifyAdmin, getAllTransactions)
router.use('/configurations', verifyAdmin, adminConfigurationRoutes)

router.get('/redemptions', verifyAdmin, getAllRedemptions)
router.put('/redemptions/approve/:id', verifyAdmin, approveRedemption)
router.put('/redemptions/decline/:id', verifyAdmin, declineRedemption)
router.use('/notifications', notificationRoutes)

export default router
