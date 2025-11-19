declare module 'jsonwebtoken'

interface JwtPayload {
  // Custom claims you added in jwt.sign
  id: UserRow['id'] // Corresponds to `userId`
  type: 'access' | 'refresh' // Corresponds to `type`

  // Standard JWT claims added by the 'jsonwebtoken' library
  iat: number // Issued At (a timestamp in seconds)
  exp: number // Expiration Time (a timestamp in seconds)
  // Other standard claims like 'iss', 'aud', 'sub', 'nbf', 'jti' could also be present,
  // but 'iat' and 'exp' are standard when expiresIn is used.
}
