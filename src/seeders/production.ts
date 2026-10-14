import bcrypt from 'bcryptjs'

import { UserRoleEnum } from '../@types/user'
import { AppDataSource } from '../data-source'
import { Configurations } from '../entities/configurations'
import { User } from '../entities/user'

// Idempotent: only inserts what's missing, never drops or overwrites data.
// Run after migrations: `yarn seed:prod` (or `node dist/src/seeders/production.js`)

const DEFAULT_CONFIGURATIONS = [
  { type: 'point_to_naira', value: '10' },
  { type: 'min_redemption', value: '100' },
  { type: 'max_redemption', value: '10000' },
  { type: 'donation_platform_fee', value: '10' },
]

const DEFAULT_AVATAR =
  'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768740636/avatars/ahitxk0wszv2c8miqsgg.jpg'

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const seedProduction = async () => {
  await AppDataSource.initialize()

  const configRepo = AppDataSource.getRepository(Configurations)
  for (const config of DEFAULT_CONFIGURATIONS) {
    const exists = await configRepo.findOneBy({ type: config.type })
    if (!exists) {
      await configRepo.save(configRepo.create(config))
      console.log(`Created configuration: ${config.type}`)
    }
  }

  const userRepo = AppDataSource.getRepository(User)
  const accounts = [
    {
      prefix: 'SEED_SUPERADMIN',
      username: 'superadmin',
      role: UserRoleEnum.SUPERADMIN,
      admin_type: 'master' as const,
      optional: false,
    },
    {
      prefix: 'SEED_ADMIN',
      username: 'admin',
      role: UserRoleEnum.ADMIN,
      admin_type: 'base' as const,
      optional: true,
    },
  ]

  for (const account of accounts) {
    if (account.optional && !process.env[`${account.prefix}_EMAIL`]) continue

    const email = required(`${account.prefix}_EMAIL`).toLowerCase()
    const password = required(`${account.prefix}_PASSWORD`)
    if (password.length < 12) {
      throw new Error(
        `${account.prefix}_PASSWORD must be at least 12 characters`,
      )
    }

    if (await userRepo.findOneBy({ email })) {
      console.log(`Skipped ${account.username}: ${email} already exists`)
      continue
    }

    await userRepo.save(
      userRepo.create({
        email,
        password: await bcrypt.hash(password, 10),
        username: account.username,
        first_name: account.username === 'admin' ? 'Admin' : 'Super Admin',
        last_name: 'Carus',
        role: account.role,
        admin_type: account.admin_type,
        status: 'ACTIVE',
        avatar: DEFAULT_AVATAR,
      }),
    )
    console.log(`Created ${account.username}: ${email}`)
  }
}

seedProduction()
  .then(() => console.log('Production seed complete'))
  .catch((err) => {
    console.error('Production seed failed:', err.message)
    process.exitCode = 1
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy()
  })
