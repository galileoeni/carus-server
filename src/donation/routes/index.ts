import { Router } from 'express'

import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaigns,
  getPublicCampaign,
  getPublicCampaigns,
  updateCampaign,
} from '../controllers/campaignController'
import { createContribution } from '../controllers/contributionController'
import {
  initiateCashDonation,
  paystackWebhook,
  verifyCashDonation,
} from '../controllers/paymentController'
import verifyAdmin from '../../helpers/verifyAdmin'
import verifyToken from '../../helpers/verifyToken'
import upload from '../../utils/multer'

const router = Router()
const campaignPath = '/campaigns'
const campaignIdPath = '/campaigns/:id'

// Public routes
router.get('/public/campaigns', getPublicCampaigns)
router.get('/public/campaigns/:id', getPublicCampaign)
router.post('/public/campaigns/:id/pay', initiateCashDonation)
router.get('/public/payments/:reference', verifyCashDonation)
router.post('/paystack/webhook', paystackWebhook)

// User routes
router.get(campaignPath, verifyToken, getCampaigns)
router.get(campaignIdPath, verifyToken, getCampaign)
router.post('/contribute', verifyToken, createContribution)

// Admin routes
router.get(campaignPath, verifyAdmin, getCampaigns)
router.get(campaignIdPath, verifyAdmin, getCampaign)
router.post(campaignPath, verifyAdmin, upload.single('image'), createCampaign)
router.put(campaignIdPath, verifyAdmin, upload.single('image'), updateCampaign)
router.delete(campaignIdPath, verifyAdmin, deleteCampaign)

export default router
