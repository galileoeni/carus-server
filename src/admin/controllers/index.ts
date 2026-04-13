import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from '../../entities/transactions'
import {
  generalResponse,
  invalidCredentials,
  Pagination,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { UserRoleEnum } from '../../@types/user'
import { Configurations } from '../../entities/configurations'
import { Redemption, RedemptionStatus } from '../../entities/redemption'
import { Schedule } from '../../entities/schedule'
import { User } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import generateToken from '../../helpers/generateToken'
import catchController from '../../utils/catchControllerAsyncs'
import { AppDataSource } from '../../data-source'
import { notificationService } from '../../services/notification.service'
import { NotificationType } from '../../entities/notification'
import { In } from 'typeorm'

const scheduleRepository = AppDataSource.getRepository(Schedule)
const userRepository = AppDataSource.getRepository(User)
const walletRepository = AppDataSource.getRepository(Wallet)
const transactionRepository = AppDataSource.getRepository(Transaction)
const redemptionRepository = AppDataSource.getRepository(Redemption)
const configurationRepository = AppDataSource.getRepository(Configurations)

export const loginAdmin = catchController(
  async (req: Request, res: Response) => {
    const { identifier, password }: { identifier: string; password: string } =
      req.body

    //Check if both fields are passed
    if (!identifier) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please provide a username or an email address',
          ),
        )
    }
    if (!password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Password field cannot be empty',
          ),
        )
    }

    // Check if the client's identifier (username or email) is contained in the database
    const user = await userRepository.findOne({
      where: { email: identifier },
    })
    //check if user is an admin
    if (
      user?.role !== UserRoleEnum.ADMIN &&
      user?.role !== UserRoleEnum.SUPERADMIN
    ) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            invalidCredentials,
          ),
        )
    }

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            invalidCredentials,
          ),
        )
    }

    //Check if the password is a valid string and not undefined or null
    if (!user.password || typeof user.password !== 'string') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(StatusCodes.NOT_FOUND, {}, [], invalidCredentials),
        )
    }

    //Compare the client's password with the one in the db
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(StatusCodes.NOT_FOUND, {}, [], invalidCredentials),
        )
    }

    //What to do if the authentication is successful
    if (isPasswordValid && user.id) {
      const { token: refresh_token, token_expires: refresh_token_expires } =
        generateToken(user.id, 'refresh')
      const { token: access_token, token_expires: access_token_expires } =
        generateToken(user.id, 'access')
      res.status(StatusCodes.OK).json(
        generalResponse(
          StatusCodes.OK,
          {
            username: user.username,
            email: user.email,
            status: user.status,
            role: user.role,
            refresh_token: refresh_token,
            refresh_token_expires: refresh_token_expires,
            access_token: access_token,
            access_token_expires: access_token_expires,
          },
          [],
          'Admin logged in successfully',
        ),
      )
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Something went wrong',
          ),
        )
    }
  },
)

export const approveRedemption = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string

    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const redemption = await transactionalEntityManager.findOne(
          Redemption,
          {
            where: { id },
            relations: ['user', 'user.wallet'],
          },
        )

        if (!redemption) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: 'Redemption not found',
          }
        }

        if (redemption.status !== RedemptionStatus.PENDING) {
          return {
            error: true,
            status: StatusCodes.BAD_REQUEST,
            message: 'Redemption has already been processed',
          }
        }

        redemption.status = RedemptionStatus.FULFILLED
        await transactionalEntityManager.save(redemption)

        if (redemption.user) {
          const platformChargesConfig =
            await transactionalEntityManager.findOne(Configurations, {
              where: { type: 'platform_charges' },
            })
          const chargePercentage = Number(platformChargesConfig?.value || 0)
          const chargeAmount =
            (Number(redemption.points || 0) * chargePercentage) / 100

          const redemptionType =
            redemption.type === 'airtime' ? 'airtime' : 'cash'
          const transaction = new Transaction()
          transaction.type =
            redemption.type === 'airtime'
              ? TransactionType.AIRTIME
              : TransactionType.CASH
          transaction.direction = TransactionDirection.DEBIT
          transaction.amount = (redemption.points || 0) - chargeAmount
          transaction.charges = chargeAmount
          transaction.date = new Date()
          transaction.status = TransactionStatus.FULFILLED
          transaction.description = `Your request to convert ${Number(
            redemption.points || 0,
          ).toFixed(
            2,
          )} points to ${redemptionType} was approved and you've been credited.`
          transaction.user = redemption.user
          transaction.wallet = redemption.user.wallet || undefined
          await transactionalEntityManager.save(transaction)

          await notificationService.createNotification(
            redemption.user,
            'Redemption Approved',
            `Your request to convert ${Number(redemption.points || 0).toFixed(
              2,
            )} points was approved.`,
            NotificationType.TRANSACTION_SUCCESS,
            transactionalEntityManager,
          )
        }
        return { error: false }
      },
    )

    if (result.error) {
      const statusCode = result.status ?? StatusCodes.INTERNAL_SERVER_ERROR
      return res
        .status(statusCode)
        .json(
          generalResponse(statusCode, {}, [], result.message ?? 'An error occurred'),
        )
    }

    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, {}, [], 'Redemption approved'))
  },
)

export const declineRedemption = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string

    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const redemption = await transactionalEntityManager.findOne(
          Redemption,
          {
            where: { id },
            relations: ['user', 'user.wallet'],
          },
        )

        if (!redemption) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: 'Redemption not found',
          }
        }

        if (redemption.status !== RedemptionStatus.PENDING) {
          return {
            error: true,
            status: StatusCodes.BAD_REQUEST,
            message: 'Redemption has already been processed',
          }
        }

        redemption.status = RedemptionStatus.CANCELLED
        await transactionalEntityManager.save(redemption)

        if (redemption.user) {
          const user = redemption.user as User
          const wallet = await transactionalEntityManager.findOne(Wallet, {
            where: { user: { id: user.id } },
          })
          if (wallet) {
            wallet.points = (wallet.points ?? 0) + (redemption.points ?? 0)
            await transactionalEntityManager.save(wallet)

            // Create transaction record for decline
            const redemptionType =
              redemption.type === 'airtime' ? 'airtime' : 'cash'
            const transaction = new Transaction()
            transaction.type =
              redemption.type === 'airtime'
                ? TransactionType.AIRTIME
                : TransactionType.CASH
            transaction.direction = TransactionDirection.DEBIT
            transaction.amount = redemption.points || 0
            transaction.charges = 0
            transaction.date = new Date()
            transaction.status = TransactionStatus.CANCELLED
            transaction.description = `Your request to convert ${Number(
              redemption.points || 0,
            ).toFixed(
              2,
            )} points to ${redemptionType} was declined. Points have been refunded to your wallet.`
            transaction.user = user
            transaction.wallet = wallet
            await transactionalEntityManager.save(transaction)
          }

          await notificationService.createNotification(
            redemption.user,
            'Redemption Declined',
            `Your request to convert ${Number(redemption.points || 0).toFixed(
              2,
            )} points was declined and points have been refunded.`,
            NotificationType.TRANSACTION_FAILED,
            transactionalEntityManager,
          )
        }
        return { error: false }
      },
    )

    if (result.error) {
      const statusCode = result.status ?? StatusCodes.INTERNAL_SERVER_ERROR
      return res
        .status(statusCode)
        .json(
          generalResponse(statusCode, {}, [], result.message ?? 'An error occurred'),
        )
    }

    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, {}, [], 'Redemption declined'))
  },
)

export const getAllTransactions = catchController(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10
    const [transactions, totalCount] = await transactionRepository.findAndCount(
      {
        relations: ['user', 'wallet'],
        skip: (page - 1) * pageSize,
        take: pageSize,
      },
    )
    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })

    const pagination: Pagination = {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      pageSize: Number(pageSize),
      totalCount,
    }

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        transactions.map((transaction) => {
          const nairaAmount =
            (transaction.wallet?.points || 0) *
            parseFloat(pointToNaira?.value || '0')
          return {
            id: transaction.id,
            amount: transaction.amount,
            charges: transaction.charges,
            status: transaction.status,
            type: transaction.type,
            user: {
              id: transaction.user?.id,
              email: transaction.user?.email,
            },
            wallet: {
              id: transaction.wallet?.id,
              naira_amount: nairaAmount,
            },
          }
        }),
        [],
        returnSuccess,
        pagination,
      ),
    )
  },
)

export const getDashboardData = catchController(
  async (req: Request, res: Response) => {
    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })
    
    // Get last 6 months labels
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      return d.toLocaleString('default', { month: 'short' })
    }).reverse()

    const [
      userCount,
      scheduleCount,
      totalWalletPoints,
      totalConversions,
      registrationTrendsRaw,
      pickupFrequencyRaw,
      pointsTrendsRaw,
      redemptionMethodsRaw,
      wasteCompositionRaw,
    ] = await Promise.all([
      userRepository.count({ where: { role: UserRoleEnum.USER } }),
      scheduleRepository.count(),
      walletRepository
        .createQueryBuilder('wallet')
        .select('SUM(wallet.points)', 'totalWalletPoints')
        .getRawOne(),
      redemptionRepository.count({
        where: { status: RedemptionStatus.FULFILLED },
      }),
      userRepository.query(`
        SELECT 
          TO_CHAR(date_trunc('day', "createdAt"), 'Mon DD') AS date,
          COUNT(*) AS individual,
          0 AS business
        FROM users
        WHERE role = 'user' AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date_trunc('day', "createdAt")
        ORDER BY date_trunc('day', "createdAt")
      `),
      scheduleRepository.query(`
        SELECT 
          TO_CHAR(date_trunc('week', "date"), 'Mon DD') AS week,
          COUNT(*) AS count
        FROM schedule
        WHERE category = 'pickup' AND "date" >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY date_trunc('week', "date")
        ORDER BY date_trunc('week', "date")
      `),
      transactionRepository.query(`
        SELECT 
          TO_CHAR(date_trunc('month', "date"), 'Mon') AS name,
          COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) AS issuance,
          COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0) AS redemption
        FROM transaction
        WHERE "date" >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY date_trunc('month', "date")
        ORDER BY date_trunc('month', "date")
      `),
      transactionRepository.query(`
        SELECT 
          type AS method,
          SUM(amount) AS amount
        FROM transaction
        WHERE direction = 'debit' AND type IN ('airtime', 'cash', 'giftcard')
        GROUP BY type
      `),
      scheduleRepository.query(`
        SELECT 
          category AS name,
          COUNT(*) AS value
        FROM schedule
        GROUP BY category
      `),
    ])

    const pToN = parseFloat(pointToNaira?.value || '0')
    const totalWalletAmount = (totalWalletPoints.totalWalletPoints || 0) * pToN

    // Format new datasets
    const registrationTrends = registrationTrendsRaw.map((t: any) => ({
      date: t.date,
      individual: parseInt(t.individual, 10),
      business: parseInt(t.business, 10),
    }))

    const pickupFrequency = pickupFrequencyRaw.map((t: any) => ({
      week: t.week,
      count: parseInt(t.count, 10),
    }))

    // Ensure last 6 months have entries in pointsTrends
    const pointsTrends = last6Months.map((month) => {
      const pt = pointsTrendsRaw.find((t: any) => t.name === month)
      const nairaIssuance = parseFloat(pt?.issuance || '0')
      const nairaRedemption = parseFloat(pt?.redemption || '0')
      // convert to points roughly using pointToNaira, or just show as Naira value. The chart says "Points Issuance vs Redemption", so we convert to points by dividing by pToN. Points = amount / pToN? No, amount = points / conversionRate? In earlier code: nairaAmount = points / conversionRate. So points = nairaAmount * conversionRate. But wait, pointToNaira is e.g. 1 point = 0.5 naira? No, conversionRate = Number(config.value). nairaAmount = points / conversionRate. So Points = NairaAmount * conversionRate
      return {
        name: month,
        issuance: pToN ? nairaIssuance * pToN : 0,
        redemption: pToN ? nairaRedemption * pToN : 0,
      }
    })

    const allMethods = ['airtime', 'cash', 'giftcard']
    const redemptionMethods = allMethods.map((method) => {
      const rm = redemptionMethodsRaw.find((t: any) => t.method === method)
      return {
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount: parseFloat(rm?.amount || '0'),
      }
    })

    const wasteComposition = wasteCompositionRaw.map((t: any) => ({
      name: t.name
        ? t.name.charAt(0).toUpperCase() + t.name.slice(1)
        : 'Unknown',
      value: parseInt(t.value, 10),
    }))

    const dashboardData = {
      userCount,
      scheduleCount,
      totalWalletAmount: totalWalletAmount || 0,
      totalConversions,
      pointToNaira: Number(pointToNaira?.value || 0),
      chartData: [], // keep empty or remove if not needed, we'll just send empty to not break interface yet
      registrationTrends,
      pickupFrequency,
      pointsTrends,
      redemptionMethods,
      wasteComposition,
    }

    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, dashboardData, [], returnSuccess))
  },
)

export const acceptSchedule = catchController(
  async (req: Request, res: Response) => {
    const { id } = req.params

    // Ensure id is a single string
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid ID format' })
    }

    const existingSchedule = await scheduleRepository.findOne({
      where: { id: id }, // TypeScript is happy now because 'id' is strictly a string
    })
    if (!existingSchedule) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(StatusCodes.NOT_FOUND, {}, [], 'invalid schedule'),
        )
    }

    if (
      existingSchedule.status === 'accepted' ||
      existingSchedule.status === 'cancelled' ||
      existingSchedule.status === 'fulfilled'
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Schedule has already been accepted, cancelled, or fulfilled',
          ),
        )
    }

    // const transaction = await transactionRepository.findOne({
    //     relations: {
    //         schedule: true
    //     },
    //     where: {
    //         schedule: {
    //             id: existingSchedule.id
    //         }
    //     }
    // })

    // if (!transaction) {
    //     return res.status(StatusCodes.NOT_FOUND).json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'transaction not found'));
    // }

    // transaction.status = 'accepted'
    // await transactionRepository.save(transaction)

    existingSchedule.status = 'accepted'
    await scheduleRepository.save(existingSchedule)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          `Schedule has been accepted, awaiting ${existingSchedule.category} `,
        ),
      )
  },
)

export const cancelSchedule = catchController(
  async (req: Request, res: Response) => {
    const { id } = req.params

    // Ensure id is a single string
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid ID format' })
    }
    const existingSchedule = await scheduleRepository.findOne({
      where: { id: id },
    })

    if (!existingSchedule) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(StatusCodes.NOT_FOUND, {}, [], 'Invalid schedule id'),
        )
    }

    if (
      existingSchedule.status === 'cancelled' ||
      existingSchedule.status === 'fulfilled' ||
      existingSchedule.status === 'missed'
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Schedule has already been cancelled, or fulfilled',
          ),
        )
    }

    // const transaction = await transactionRepository.findOne({
    //     relations: {
    //         schedule: true
    //     },
    //     where: {
    //         schedule: {
    //             id: existingSchedule.id
    //         }
    //     }
    // })

    // if (!transaction) {
    //     return res.status(StatusCodes.NOT_FOUND).json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'transaction not found'));
    // }

    // transaction.status = 'cancelled'
    // await transactionRepository.save(transaction)

    existingSchedule.status = 'missed'
    await scheduleRepository.save(existingSchedule)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(StatusCodes.OK, {}, [], `schedule has been cancelled `),
      )
  },
)

export const fulfillSchedule = catchController(
  async (req: Request, res: Response) => {
    //fetch schedule id from parameters
    const { id } = req.params

    // Ensure id is a single string
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid ID format' })
    }

    const { material_amount, material } = req.body

    const parsedMaterialAmount = parseInt(material_amount, 10)
    //check if material amount and materials are passed
    if (!material_amount) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please provide a material amount',
          ),
        )
    }
    if (!material) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please provide a material',
          ),
        )
    }

    if (material !== 'plastic') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            'no configuration was set for this material',
          ),
        )
    }

    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const point_to_plastic = await transactionalEntityManager.findOne(
          Configurations,
          {
            where: { type: 'point_to_plastic' },
          },
        )

        if (!point_to_plastic?.value) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: 'configuration not found',
          }
        }

        const parsedPointToPlastic = Number(point_to_plastic.value)

        const point_to_naira = await transactionalEntityManager.findOne(
          Configurations,
          {
            where: { type: 'point_to_naira' },
          },
        )

        if (!point_to_naira?.value) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: 'configuration not found',
          }
        }

        const parsedPointToNaira = Number(point_to_naira.value)

        //find schedule with the scheduleId
        const existingSchedule = await transactionalEntityManager.findOne(
          Schedule,
          {
            where: { id: id },
          },
        )

        if (!existingSchedule) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: 'invalid schedule id',
          }
        }

        //find user with the schedule
        const user = await transactionalEntityManager.findOne(User, {
          relations: {
            orders: true,
          },
          where: {
            orders: {
              id: existingSchedule.id,
            },
          },
        })

        if (!user) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: userNotFound,
          }
        }

        //ensure that the schedule has been accepted first
        if (existingSchedule.status !== 'accepted') {
          return {
            error: true,
            status: StatusCodes.BAD_REQUEST,
            message: 'schedule has not been accepted, it cannot be fulfilled',
          }
        }

        // find the user's corresponding wallet
        const wallet = await transactionalEntityManager.findOne(Wallet, {
          where: {
            user: {
              id: user.id,
            },
          },
          lock: { mode: 'pessimistic_write' },
        })

        if (!wallet) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: 'wallet not found',
          }
        }

        const calculatedPoints = Number(
          Number(parsedMaterialAmount) * Number(parsedPointToPlastic),
        )

        wallet.points = Number(wallet.points || 0) + calculatedPoints

        const calculatedNairaAmount =
          Number(calculatedPoints) / Number(parsedPointToNaira)

        await transactionalEntityManager.save(wallet)

        const transaction = new Transaction()
        transaction.user = user
        transaction.date = new Date(Date.now())
        transaction.type =
          existingSchedule.category === 'pickup'
            ? TransactionType.PICKUP
            : TransactionType.DROPOFF
        transaction.direction = TransactionDirection.CREDIT
        transaction.wallet = wallet
        transaction.schedule = existingSchedule
        transaction.amount = calculatedNairaAmount
        transaction.charges = 0
        transaction.status = TransactionStatus.COMPLETED

        await transactionalEntityManager.save(transaction)

        existingSchedule.status = 'completed'
        existingSchedule.amount = calculatedNairaAmount

        await transactionalEntityManager.save(existingSchedule)

        await notificationService.createNotification(
          user,
          'Points Earned!',
          `You have earned ${calculatedPoints} points from your ${existingSchedule.category}.`,
          NotificationType.POINTS_EARNED,
          transactionalEntityManager,
        )

        return { error: false, amount: calculatedNairaAmount }
      },
    )

    if (result.error) {
      const statusCode = result.status ?? StatusCodes.INTERNAL_SERVER_ERROR
      return res
        .status(statusCode)
        .json(
          generalResponse(
            statusCode,
            '',
            [],
            result.message ?? 'An error occurred',
          ),
        )
    }

    return res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {},
        [],
        `Schedule has been completed, user's wallet will be credited with ₦${result.amount?.toLocaleString()}`,
      ),
    )
  },
)

export const getAllSchedules = catchController(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10
    const [schedules, totalCount] = await scheduleRepository.findAndCount({
      relations: {
        user: true,
        transaction: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const pagination: Pagination = {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      pageSize: Number(pageSize),
      totalCount,
    }

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        schedules.map((schedule) => ({
          id: schedule.id,
          address: schedule.address,
          amount: schedule.amount,
          category: schedule.category,
          container_amount: schedule.container_amount,
          date: schedule.date,
          material: schedule.material,
          material_amount: schedule.material_amount,
          schedule_date: schedule.schedule_date,
          status: schedule.status,
          transaction_id: schedule.transaction?.id,
          user_id: schedule.user?.id,
          user_email: schedule.user?.email,
          user_phone: schedule.user?.phone,
        })),
        [],
        returnSuccess,
        pagination,
      ),
    )
  },
)

export * from './donation.controller'

export const getAllRedemptions = catchController(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10
    const [redemptions, totalCount] = await redemptionRepository.findAndCount({
      relations: ['user'],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const pagination: Pagination = {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      pageSize: Number(pageSize),
      totalCount,
    }

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        redemptions.map((redemption) => ({
          id: redemption.id,
          points: redemption.points,
          status: redemption.status,
          type: redemption.type,
          user: {
            id: redemption.user?.id,
            email: redemption.user?.email,
          },
        })),
        [],
        returnSuccess,
        pagination,
      ),
    )
  },
)

export const getAllAccounts = catchController(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10
    const [users, totalCount] = await userRepository.findAndCount({
      relations: {
        wallet: true,
      },
      where: {
        role: In([UserRoleEnum.USER, UserRoleEnum.ADMIN]),
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const pagination: Pagination = {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      pageSize: Number(pageSize),
      totalCount,
    }

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        users.map((user) => ({
          id: user.id,
          google_id: user.googleId,
          address: `${user.address} ${user.city} ${user.region}`,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          dob: user.dob,
          gender: user.gender,
          phone: user.phone,
          status: user.status,
          role: user.role,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
          wallet: user.wallet,
        })),
        [],
        returnSuccess,
        pagination,
      ),
    )
  },
)

export const getTotalWalletAmount = catchController(
  async (req: Request, res: Response) => {
    const wallets = await walletRepository.find()
    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })

    const totalPoints = wallets.reduce((acc, wallet) => {
      return acc + Number(wallet.points)
    }, 0)
    const totalAmount = totalPoints * parseFloat(pointToNaira?.value || '0')

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          total_naira_amount: totalAmount,
        },
        [],
        returnSuccess,
      ),
    )
  },
)
