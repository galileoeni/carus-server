import { isUUID } from 'class-validator'
import crypto from 'crypto'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

import { AppDataSource } from '../../data-source'
import { Contribution } from '../../entities/contribution'
import { Donation } from '../../entities/donation'
import {
  DonationPayment,
  DonationPaymentStatus,
} from '../../entities/donationPayment'
import { User } from '../../entities/user'
import { donationNotFound, generalResponse } from '../../helpers/constants'
import { paystack, PaystackTransaction } from '../../services/paystack'
import catchController from '../../utils/catchControllerAsyncs'
import { formatJoiError } from '../../utils/helper'
import { cashDonationSchema } from '../../utils/validators/donation'

const paymentNotFound = 'Payment not found'

// Donors don't need to be logged in, but if they are we link the donation
// to their account. An invalid or expired token just means "guest".
const optionalUser = async (req: Request): Promise<User | null> => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(
      header.split(' ')[1],
      process.env.JWT_SECRET as string,
    ) as { id: string; type?: string }
    if (decoded.type && decoded.type !== 'access') return null
    return await AppDataSource.getRepository(User).findOne({
      where: { id: decoded.id },
    })
  } catch {
    return null
  }
}

// Records a Paystack result against our payment. Safe to call more than once
// for the same reference (callback page and webhook can both arrive).
export const completePayment = async (
  reference: string,
  tx: PaystackTransaction,
): Promise<DonationPayment | null> =>
  AppDataSource.transaction(async (manager) => {
    const locked = await manager.findOne(DonationPayment, {
      where: { reference },
      lock: { mode: 'pessimistic_write' },
    })
    if (!locked || locked.status === DonationPaymentStatus.SUCCESS) {
      return locked
    }

    const payment = (await manager.findOne(DonationPayment, {
      where: { id: locked.id },
      relations: ['donation', 'user'],
    })) as DonationPayment

    const expectedKobo = Math.round(Number(payment.amount) * 100)
    const paid =
      tx.status === 'success' &&
      tx.currency === 'NGN' &&
      Number(tx.amount) === expectedKobo

    if (paid) {
      const contribution = new Contribution()
      contribution.amount = Number(payment.amount)
      contribution.source = 'cash'
      contribution.donation = payment.donation
      if (payment.user) contribution.user = payment.user
      await manager.save(contribution)

      payment.status = DonationPaymentStatus.SUCCESS
      payment.contribution = contribution
      payment.channel = tx.channel ?? null
      payment.paidAt = tx.paid_at ? new Date(tx.paid_at) : new Date()
    } else if (tx.status === 'success' || tx.status === 'failed') {
      // 'success' with the wrong amount/currency is treated as failed
      if (tx.status === 'success') {
        console.error(
          `Paystack amount mismatch for ${reference}: got ${tx.amount} ${tx.currency}, expected ${expectedKobo} NGN`,
        )
      }
      payment.status = DonationPaymentStatus.FAILED
    }
    // Other statuses (abandoned, ongoing...) stay pending

    return manager.save(payment)
  })

export const initiateCashDonation = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const { error } = cashDonationSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const campaign = isUUID(id)
      ? await AppDataSource.getRepository(Donation).findOne({ where: { id } })
      : null
    if (!campaign) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], donationNotFound))
    }
    if (
      campaign.status !== 'active' ||
      new Date(campaign.duration as Date) <= new Date()
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'This project is no longer accepting donations',
          ),
        )
    }
    if (!paystack.isConfigured()) {
      return res
        .status(StatusCodes.SERVICE_UNAVAILABLE)
        .json(
          generalResponse(
            StatusCodes.SERVICE_UNAVAILABLE,
            {},
            [],
            'Card and bank payments are not available yet',
          ),
        )
    }

    const { name, email, amount } = req.body
    const paymentRepo = AppDataSource.getRepository(DonationPayment)
    const payment = paymentRepo.create({
      reference: `CARUS-DON-${crypto.randomUUID()}`,
      amount,
      donorName: name.trim(),
      donorEmail: email.trim().toLowerCase(),
      donation: campaign,
      user: await optionalUser(req),
    })
    await paymentRepo.save(payment)

    try {
      const checkout = await paystack.initializeTransaction({
        email: payment.donorEmail as string,
        amountKobo: Math.round(amount * 100),
        reference: payment.reference as string,
        callbackUrl: `${process.env.FRONTEND_URL}/donations/thank-you`,
        metadata: {
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          donor_name: payment.donorName,
        },
      })
      return res.status(StatusCodes.CREATED).json(
        generalResponse(
          StatusCodes.CREATED,
          {
            authorizationUrl: checkout.authorization_url,
            reference: payment.reference,
          },
          [],
          'Redirecting to payment',
        ),
      )
    } catch (err) {
      console.error('Paystack initialize failed', err)
      payment.status = DonationPaymentStatus.FAILED
      await paymentRepo.save(payment)
      return res
        .status(StatusCodes.BAD_GATEWAY)
        .json(
          generalResponse(
            StatusCodes.BAD_GATEWAY,
            {},
            [],
            'Could not start the payment. Please try again.',
          ),
        )
    }
  },
)

// Called by the thank-you page after Paystack redirects back
export const verifyCashDonation = catchController(
  async (req: Request, res: Response) => {
    const reference = req.params.reference as string
    let payment = await AppDataSource.getRepository(DonationPayment).findOne({
      where: { reference },
      relations: ['donation'],
    })
    if (!payment) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], paymentNotFound))
    }

    if (
      payment.status === DonationPaymentStatus.PENDING &&
      paystack.isConfigured()
    ) {
      try {
        const tx = await paystack.verifyTransaction(reference)
        const updated = await completePayment(reference, tx)
        if (updated) payment = { ...updated, donation: payment.donation }
      } catch (err) {
        console.error('Paystack verify failed', err)
      }
    }

    return res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          reference: payment.reference,
          status: payment.status,
          amount: Number(payment.amount),
          donorName: payment.donorName,
          campaign: {
            id: payment.donation?.id,
            title: payment.donation?.title,
          },
        },
        [],
        'Success',
      ),
    )
  },
)

// Paystack calls this server-to-server, so payments are recorded even if the
// donor closes the browser before returning to the site.
export const paystackWebhook = async (req: Request, res: Response) => {
  if (
    !req.rawBody ||
    !paystack.isValidSignature(
      req.rawBody,
      req.headers['x-paystack-signature'] as string | undefined,
    )
  ) {
    return res.sendStatus(StatusCodes.UNAUTHORIZED)
  }

  const { event, data } = req.body ?? {}
  if (
    (event === 'charge.success' || event === 'charge.failed') &&
    typeof data?.reference === 'string' &&
    data.reference.startsWith('CARUS-DON-')
  ) {
    try {
      await completePayment(data.reference, data)
    } catch (err) {
      console.error('Paystack webhook processing failed', err)
      return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR) // Paystack retries
    }
  }
  return res.sendStatus(StatusCodes.OK)
}
