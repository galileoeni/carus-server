import Joi from 'joi'

import { MaterialEnum } from '../../@types/schedule'
import { BusinessIndustryEnum } from '../../entities/businessProfile'
import { passwordRegex } from '../../helpers/constants'

// Lagos LGAs, same list as the frontend (components/lagosLGAs.ts)
export const LAGOS_LGAS = [
  'Agege',
  'Ajeromi-Ifelodun',
  'Alimosho',
  'Amuwo-Odofin',
  'Apapa',
  'Badagry',
  'Epe',
  'Eti-Osa',
  'Ibeju-Lekki',
  'Ifako-Ijaiye',
  'Ikeja',
  'Ikorodu',
  'Kosofe',
  'Lagos Island',
  'Lagos Mainland',
  'Mushin',
  'Ojo',
  'Oshodi-Isolo',
  'Shomolu',
  'Surulere',
]

export const registerBusinessSchema = Joi.object({
  // Company
  companyName: Joi.string().trim().min(2).max(120).required(),
  industry: Joi.string()
    .valid(...Object.values(BusinessIndustryEnum))
    .required(),
  cacNumber: Joi.string().trim().max(30).allow('', null),
  address: Joi.string().trim().min(5).max(250).required(),
  city: Joi.string()
    .valid(...LAGOS_LGAS)
    .required(),
  wasteTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(MaterialEnum)))
    .min(1)
    .unique()
    .required(),
  estimatedMonthlyKg: Joi.number().integer().min(0).max(10000000).allow(null),

  // Contact person (also the login)
  first_name: Joi.string().trim().min(1).max(60).required(),
  last_name: Joi.string().trim().min(1).max(60).required(),
  contactRole: Joi.string().trim().max(60).allow('', null),
  // Same rule as customer sign-up: format only, any domain ending
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required(),
  phone: Joi.string().trim().min(5).max(20).required(),
  country_code: Joi.string().trim().max(6).required(),
  password: Joi.string().pattern(passwordRegex).required().messages({
    'string.pattern.base':
      'Password must be at least 8 characters with an uppercase and a lowercase letter',
  }),
})
