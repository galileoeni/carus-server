import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { CityEnum, RegionEnum } from '../../@types/user'
import { AppDataSource } from '../../data-source'
import { Configurations } from '../../entities/configurations'
import { generalResponse, returnSuccess } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'
import { formatJoiError } from '../../utils/helper'
import { updateConfigurationSchema } from '../../utils/validators/configuration'

const configurationRepository = AppDataSource.getRepository(Configurations)

export const createConfiguration = catchController(
  async (req: Request, res: Response) => {
    const { type, value } = req.body

    const requiredFields = ['type', 'value']

    if (requiredFields.some((field) => !req.body[field])) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please make sure that you pass all the required fields',
          ),
        )
    }

    const newConfiguration = configurationRepository.create({
      type: type,
      value: value,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    })

    await configurationRepository.save(newConfiguration)

    return res
      .status(StatusCodes.CREATED)
      .json(
        generalResponse(
          StatusCodes.CREATED,
          {},
          [],
          `New configuration ${type} has been created`,
        ),
      )
  },
)

export const getConfigurations = catchController(
  async (req: Request, res: Response) => {
    const configurations = await configurationRepository.find()

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        configurations.map((configuration) => ({
          name: configuration.type,
          value: configuration.value,
        })),
        [],
        returnSuccess,
      ),
    )
  },
)

export const getLocationDetails = catchController(
  async (req: Request, res: Response) => {
    const regionList = Object.values(RegionEnum)
    const cityList = Object.values(CityEnum)

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          regions: regionList,
          lga: cityList,
        },
        [],
        returnSuccess,
      ),
    )
  },
)

export const updateConfiguration = catchController(
  async (req: Request, res: Response) => {
    const type = req.params.type as string
    const { error } = updateConfigurationSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const { value } = req.body

    let configuration = await configurationRepository.findOne({
      where: { type },
    })

    if (configuration) {
      configuration.value = value
    } else {
      configuration = configurationRepository.create({
        type: type,
        value: value,
      })
    }

    await configurationRepository.save(configuration)

    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, configuration, [], returnSuccess))
  },
)

export const getPointToNaira = catchController(
  async (req: Request, res: Response) => {
    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })
    if (!pointToNaira) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            'Point to naira not yet set!',
          ),
        )
    }
    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, pointToNaira, [], returnSuccess))
  },
)

export const setPointToNaira = catchController(
  async (req: Request, res: Response) => {
    const { value } = req.body

    if (value === undefined || value === null || String(value).trim() === '') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please provide a value',
          ),
        )
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric) || numeric <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Value must be a number greater than 0',
          ),
        )
    }

    let configuration = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })

    if (configuration) {
      configuration.value = String(numeric)
    } else {
      configuration = configurationRepository.create({
        type: 'point_to_naira',
        value: String(numeric),
        createdAt: new Date(Date.now()),
        updatedAt: new Date(Date.now()),
      })
    }

    await configurationRepository.save(configuration)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          configuration,
          [],
          'Point to naira value set successfully',
        ),
      )
  },
)
