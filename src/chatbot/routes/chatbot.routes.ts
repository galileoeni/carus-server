import { Router } from 'express'
import { sendMessage, sendFeedback, clearChatHistory } from '../controllers/chatbot.controller'

const router = Router()

// Public endpoints - no authentication required
router.post('/message', sendMessage)
router.post('/feedback', sendFeedback)
router.delete('/history/:sessionId', clearChatHistory)

export default router