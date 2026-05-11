import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AppDataSource } from '../../data-source'
import { Donation } from '../../entities/donation'
import {
  donationNotFound,
  generalResponse,
  returnSuccess,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import { formatJoiError } from '../../utils/helper'
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '../../utils/validators/donation'

const donationIdFromSql = 'donation.id'

export const createCampaign = catchController(
  async (req: Request, res: Response) => {
    const { error } = createCampaignSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            error.message,
            details,
            message,
          ),
        )
    }

    const { title, description, target, duration } = req.body

    const donationRepository = AppDataSource.getRepository(Donation)
    const newCampaign = new Donation()
    newCampaign.title = title
    newCampaign.description = description
    newCampaign.target = target
    newCampaign.duration = duration
    if (req.file) {
      const fileStr = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString('base64')}`
      const uploadResult = await uploadToCloudinary(fileStr, 'campaigns')
      if (uploadResult) {
        newCampaign.image = uploadResult.secure_url
      }
    }
    await donationRepository.save(newCampaign)

    res
      .status(StatusCodes.CREATED)
      .json(
        generalResponse(StatusCodes.CREATED, newCampaign, [], returnSuccess),
      )
  },
)

export const updateCampaign = catchController(
  async (req: Request, res: Response) => {
    const id  = req.params.id as string
    const { error } = updateCampaignSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            error.message,
            details,
            message,
          ),
        )
    }

    const donationRepository = AppDataSource.getRepository(Donation)
    const campaign = await donationRepository.findOne({ where: { id } })
    if (!campaign) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], donationNotFound))
    }

    Object.assign(campaign, req.body)
    if (req.file) {
      if (campaign.image) {
        const publicId = campaign.image.split('/').pop()?.split('.')[0]
        if (publicId) {
          await deleteFromCloudinary(`campaigns/${publicId}`)
        }
      }
      const fileStr = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString('base64')}`
      const uploadResult = await uploadToCloudinary(fileStr, 'campaigns')
      if (uploadResult) {
        campaign.image = uploadResult.secure_url
      }
    }

    await donationRepository.save(campaign)

    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, campaign, [], returnSuccess))
  },
)

export const deleteCampaign = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const donationRepository = AppDataSource.getRepository(Donation)
    const campaign = await donationRepository.findOne({ where: { id } })
    if (!campaign) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], donationNotFound))
    }

    if (campaign.image) {
      const publicId = campaign.image.split('/').pop()?.split('.')[0]
      if (publicId) {
        await deleteFromCloudinary(`campaigns/${publicId}`)
      }
    }
    await donationRepository.remove(campaign)
    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, {}, [], returnSuccess))
  },
)

export const getCampaigns = catchController(
  async (req: Request, res: Response) => {
    const donationRepository = AppDataSource.getRepository(Donation)

    const campaigns = await donationRepository
      .createQueryBuilder('donation')
      .select([
        donationIdFromSql,
        'donation.title',
        'donation.description',
        'donation.target',
        'donation.duration',
        'donation.image',
        'donation.createdAt',
        'donation.updatedAt',
      ])
      .addSelect('COALESCE(SUM(contribution.amount), 0)', 'amountRaised')
      .addSelect('COUNT(DISTINCT contribution.userId)', 'numberOfDonors')
      .leftJoin('donation.contributions', 'contribution')
      .groupBy(donationIdFromSql)
      .getRawMany()

    const formattedCampaigns = campaigns.map((campaign) => ({
      id: campaign.donation_id,
      title: campaign.donation_title,
      description: campaign.donation_description,
      target: campaign.donation_target,
      duration: campaign.donation_duration,
      image: campaign.donation_image,
      createdAt: campaign.donation_created_at,
      updatedAt: campaign.donation_updated_at,
      amountRaised: Number(campaign.amountRaised),
      numberOfDonors: Number(campaign.numberOfDonors),
    }))

    res
      .status(StatusCodes.OK)
      .json(
        generalResponse(StatusCodes.OK, formattedCampaigns, [], returnSuccess),
      )
  },
)

export const getCampaign = catchController(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const donationRepository = AppDataSource.getRepository(Donation)

    const campaign = await donationRepository
      .createQueryBuilder('donation')
      .select([
        donationIdFromSql,
        'donation.title',
        'donation.description',
        'donation.target',
        'donation.duration',
        'donation.image',
        'donation.createdAt',
        'donation.updatedAt',
      ])
      .addSelect('COALESCE(SUM(contribution.amount), 0)', 'amountRaised')
      .addSelect('COUNT(DISTINCT contribution.userId)', 'numberOfDonors')
      .leftJoin('donation.contributions', 'contribution')
      .where('donation.id = :id', { id })
      .groupBy(donationIdFromSql)
      .getRawOne()

    if (!campaign) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], donationNotFound))
    }

    // Get contributions for this campaign
    const contributions = await donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.contributions', 'contribution')
      .leftJoinAndSelect('contribution.user', 'user')
      .where('donation.id = :id', { id })
      .getOne()

    const formattedContributions = contributions?.contributions?.map(contribution => ({
      id: contribution.id,
      amount: contribution.amount,
      createdAt: contribution.createdAt,
      user: contribution.user ? {
        id: contribution.user.id,
        first_name: contribution.user.first_name,
        last_name: contribution.user.last_name,
        email: contribution.user.email,
      } : null
    })) || []

    const formattedCampaign = {
      id: campaign.donation_id,
      title: campaign.donation_title,
      description: campaign.donation_description,
      target: campaign.donation_target,
      duration: campaign.donation_duration,
      image: campaign.donation_image,
      createdAt: campaign.donation_created_at,
      updatedAt: campaign.donation_updated_at,
      amountRaised: Number(campaign.amountRaised),
      numberOfDonors: Number(campaign.numberOfDonors),
      contributions: formattedContributions,
    }

    res
      .status(StatusCodes.OK)
      .json(
        generalResponse(StatusCodes.OK, formattedCampaign, [], returnSuccess),
      )
  },
)
