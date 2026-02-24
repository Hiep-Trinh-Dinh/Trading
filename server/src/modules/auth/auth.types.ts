export type JwtPayload = {
  sub: string
  email: string
  role?: 'admin' | 'user'
}

export type AuthenticatedUser = {
  userId: string
  email: string
  role?: 'admin' | 'user'
}

