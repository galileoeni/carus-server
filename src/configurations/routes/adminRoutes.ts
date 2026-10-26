import { Router } from 'express'

import {
  createConfiguration,
  getConfigurationByType,
  getPointToNaira,
  setPointToNaira,
  updateConfiguration,
} from '../controllers'
import verifyAdmin from '../../helpers/verifyAdmin'

const router = Router()

router.post('/', verifyAdmin, createConfiguration)
router.put('/:type', verifyAdmin, updateConfiguration)
router.get('/point-to-naira', verifyAdmin, getPointToNaira)
router.post('/point-to-naira', verifyAdmin, setPointToNaira)
// After the fixed paths above so it doesn't shadow them
router.get('/:type', verifyAdmin, getConfigurationByType)

export default router
