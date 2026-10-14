import { createClient } from 'redis'

import env from './environment'

export type RedisClient = ReturnType<typeof createClient>

// Returns null when REDIS_HOST is unset so local dev can run without Redis
export const createRedisClient = async (): Promise<RedisClient | null> => {
  if (!env.REDIS_HOST) return null

  const client = createClient({
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    socket: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT) || 6379,
      ...(env.REDIS_TLS && { tls: true as const }),
    },
  })
  client.on('error', (err) => console.error('Redis client error:', err))

  await client.connect()
  console.log('Redis connected')
  return client
}
