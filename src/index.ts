import * as Sentry from '@sentry/node'

import env from './config/environment/index'
Sentry.init({
  dsn: 'https://01c7dc98a8e0749f6e417433d1d60c9b@o4510017484881920.ingest.us.sentry.io/4510017487634432',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  environment: env.ENVIRONMENT,
  enableLogs: true,
})

import bodyParser from 'body-parser'
// import { RedisStore } from 'connect-redis'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import passport from 'passport'
import path from 'path'
import createMemoryStore from 'memorystore'
import 'reflect-metadata'

// import redisClient from './config/redis'
import { AppDataSource } from './data-source'
import mainRoutes from './routes'
import adminRoutes from './routes/adminRoutes'
import { getUptime } from './utils/helper'

const MemoryStore = createMemoryStore(session)
const startServer = async () => {
  const app: express.Application = express()

  // redisClient
  //   .connect()
  //   .then(() => {
  //     console.log('Redis Connection Initialized')
  //   })
  //   .catch((err) => {
  //     console.error('Error during Redis Connection', err)
  //     throw err
  //   })

  AppDataSource.initialize()
    .then(() => {
      console.log('Data Source Initialized')
    })
    .catch((err) => {
      console.error('Error during Data Source Initialization', err)
      throw err
    })

  //TODO: Configure cors and encrypt password in transit
  app.use(cors())
  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    }) as any,
  )

  app.use(passport.initialize() as any)
  app.use(passport.session())
  app.use(cookieParser())
  app.use(bodyParser.json())
  app.get('/', (_req, res) => res.send(`CARUS RECYCLING SERVER`))
  app.get('/debug-sentry', function mainHandler(_req, _res) {
    throw new Error("Test Sentry error! It's nothing to worry about!")
  })

  app.get('/health', async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const healthCheck: Record<string, any> = {
      server: 'up',
      version: 'v1',
      uptime: getUptime(),
    }

    // try {
    //   const redisPing = await redisClient.ping()
    //   healthCheck.redis = redisPing === 'PONG' ? 'up' : 'down'
    //   console.log('HealthCheck.redis:', healthCheck.redis)
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // } catch (err: any) {
    //   healthCheck.redis = 'down'
    //   console.log('HealthCheck.redis:', healthCheck.redis)
    //   console.log(`Redis health check failed: ${err.message} `, err)
    //   Sentry.captureException(err)
    // }

    try {
      const status = AppDataSource.isInitialized
      healthCheck.database = 'up'
      console.log('AppDataSource.isInitialized:', status)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      healthCheck.database = 'down'
      console.log('AppDataSource.isInitialized:', healthCheck.database)
      console.error('Error during Data Source Initialization', err)
    }

    const allHealthy = Object.values(healthCheck).every(
      (v) => v === 'up' || typeof v === 'number' || typeof v === 'string',
    )
    console.log('AllHealthy:', allHealthy)

    return res.status(allHealthy ? 200 : 503).json(healthCheck)
  })

  // app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/v1', mainRoutes)
  app.use('/v1/admin', adminRoutes)
  app.set('view engine', 'pug')
  app.set('views', path.join(__dirname + '../views'))
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`Server is running at: http://localhost:${env.PORT}`)
  })

  Sentry.setupExpressErrorHandler(app)

  server.on('listening', () => {
    const used = process.memoryUsage()
    console.log('Memory Usage:')
    console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`)
    console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`)
    console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`)
  })
}

startServer()
