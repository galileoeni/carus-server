import { Router } from 'express'

import {
  getConfigurations,
  getImpact,
  getLocationDetails,
  getPointToNaira,
} from '../controllers'
import verifyToken from '../../helpers/verifyToken'

const router = Router()

router.get('/impact', getImpact)
router.get('/', verifyToken, getConfigurations)
router.get('/point-to-naira', verifyToken, getPointToNaira)
router.get('/location', verifyToken, getLocationDetails)

export default router
