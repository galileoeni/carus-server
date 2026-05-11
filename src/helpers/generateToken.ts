import jwt, { JwtPayload } from 'jsonwebtoken'
import { UserRow } from '../@types/user'

const EMAIL_VERIFICATION_EXPIRY = '10m' // 10 minutes
const EMAIL_VERIFICATION_SECRET = process.env.JWT_SECRET as string

export const generateEmailVerificationToken = function (
  email: string,
  otp: string,
): string {
  return jwt.sign({ email, otp }, EMAIL_VERIFICATION_SECRET, {
    expiresIn: EMAIL_VERIFICATION_EXPIRY,
  })
}

export const verifyEmailVerificationToken = function (token: string): {
  email: string
  otp: string
} {
  try {
    return jwt.verify(token, EMAIL_VERIFICATION_SECRET) as {
      email: string
      otp: string
    }
  } catch {
    return { email: '', otp: '' }
  }
}

const generateToken = function (
  userId: UserRow['id'],
  type: 'access' | 'refresh',
): { token: string; token_expires: number } {
  const token = jwt.sign(
    { id: userId, type },
    process.env.JWT_SECRET as string,
    {
      expiresIn: type === 'access' ? '24h' : '1y',
    },
  )

  const tokens: JwtPayload | string | null = jwt.decode(token)
  let token_expires = 0
  if (tokens && typeof tokens !== 'string') {
    const { exp } = tokens
    token_expires = exp ? exp * 1000 : 0
  }

  return { token, token_expires }
}

export default generateToken
