import { Router } from 'express'

import {
  changeSignupEmail,
  completeGoogleSignupProfile,
  confirmForgotPassword,
  createUser,
  forgotPassword,
  getAccessToken,
  googleAuth,
  loginUser,
  resendOtp,
  resetPassword,
  verifyUserEmail,
} from '../controllers'

const router = Router()

router.post('/register-user', createUser)
router.post('/login-user', loginUser)
router.post('/verify-user', verifyUserEmail)
router.post('/resend-verification-otp', resendOtp)
router.post('/change-signup-email', changeSignupEmail)
router.post('/forgot-password', forgotPassword)
router.post('/forgot-password/confirm', confirmForgotPassword)
router.post('/password/reset', resetPassword)
router.post('/refresh-token', getAccessToken)
router.post('/google', googleAuth)
router.post('/google-signup/complete', completeGoogleSignupProfile)

export default router
