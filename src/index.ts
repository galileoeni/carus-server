import * as Sentry from '@sentry/node'

import env from './config/environment/index'
Sentry.init({
  dsn: env.SENTRY_DSN,
  sendDefaultPii: true,
  environment: env.ENVIRONMENT,
  enableLogs: true,
})

import bodyParser from 'body-parser'
import { RedisStore } from 'connect-redis'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import session from 'express-session'
import http from 'http'
import passport from 'passport'
import path from 'path'
import { RedisStore as RateLimitRedisStore } from 'rate-limit-redis'
import 'reflect-metadata'

import { createRedisClient } from './config/redis'
import { AppDataSource } from './data-source'
// import { reminderService } from './services/reminder.service'
import mainRoutes from './routes'
import adminRoutes from './routes/adminRoutes'
import { socketService } from './services/socket.service'
import { getUptime } from './utils/helper'

const startServer = async () => {
  const app: express.Application = express()

  await AppDataSource.initialize()
  console.log('Data Source Initialized')
  // Fail the boot (and the deploy) if a migration fails
  const migrations = await AppDataSource.runMigrations()
  console.log(`Migrations run: ${migrations.length}`)

  const redis = await createRedisClient()
  const isProduction = env.ENVIRONMENT === 'production'

  // Trust proxy for rate limiting behind reverse proxies (Traefik, Nginx, etc)
  app.set('trust proxy', 1)

  // CORS Configuration (no wildcard fallback: unset means no cross-origin access)
  const allowedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : env.ENVIRONMENT === 'development'
    ? ['http://localhost:3000']
    : []
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  )

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // set `RateLimit` and `RateLimit-Policy` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message:
      'Too many requests from this IP, please try again after 15 minutes',
    ...(redis && {
      store: new RateLimitRedisStore({
        prefix: 'carus:rl:',
        sendCommand: (...args: string[]) => redis.sendCommand(args),
      }),
    }),
  })

  // Apply the rate limiting middleware to all requests.
  app.use(limiter)
  app.use(
    session({
      // Falls back to the in-memory store when Redis isn't configured (local dev)
      store: redis
        ? new RedisStore({ client: redis, prefix: 'carus:sess:' })
        : undefined,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000,
      },
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

  app.get('/health', async (_req, res) => {
    const healthCheck: Record<string, string | number> = {
      server: 'up',
      version: 'v1',
      uptime: getUptime(),
    }

    try {
      await AppDataSource.query('SELECT 1')
      healthCheck.database = 'up'
    } catch (err) {
      healthCheck.database = 'down'
      console.error('Health check: database unreachable', err)
    }

    if (redis) {
      try {
        await redis.ping()
        healthCheck.redis = 'up'
      } catch (err) {
        healthCheck.redis = 'down'
        console.error('Health check: redis unreachable', err)
      }
    }

    const allHealthy = Object.values(healthCheck).every((v) => v !== 'down')
    return res.status(allHealthy ? 200 : 503).json(healthCheck)
  })

  app.use('/v1', mainRoutes)
  app.use('/v1/admin', adminRoutes)
  app.set('view engine', 'pug')
  app.set('views', path.join(__dirname, '../views'))

  const httpServer = http.createServer(app)
  socketService.init(httpServer)
  // reminderService.init()

  const server = httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`Server is running at: http://localhost:${env.PORT}`)
  })

  Sentry.setupExpressErrorHandler(app)

  // Graceful shutdown so redeploys don't drop in-flight requests
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`)
    const force = setTimeout(() => process.exit(1), 10000)
    force.unref()
    server.close(async () => {
      await redis?.quit().catch(() => undefined)
      await AppDataSource.destroy().catch(() => undefined)
      process.exit(0)
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  server.on('listening', () => {
    const used = process.memoryUsage()
    console.log('Memory Usage:')
    console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`)
    console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`)
    console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
