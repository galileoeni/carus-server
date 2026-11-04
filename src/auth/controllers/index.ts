import { AppDataSource } from '../../data-source'
import { User } from '../../entities/user'
import { Wallet } from '../../entities/wallet'

export const userRepository = AppDataSource.getRepository(User)

export const walletRepository = AppDataSource.getRepository(Wallet)

export * from './change-signup-email.controller'
export * from './forgot-password.controller'
export * from './google.controller'
export * from './login.controller'
export * from './register-user.controller'
