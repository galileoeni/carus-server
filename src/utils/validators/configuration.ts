import Joi from 'joi'

export const updateConfigurationSchema = Joi.object({
  // The admin dashboard sends numbers for numeric settings; stored as text
  value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
})
