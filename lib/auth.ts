import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import FacebookProvider from 'next-auth/providers/facebook'
import prisma from '@/lib/prisma'

// Only register providers that have credentials configured
const providers: NextAuthOptions['providers'] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

if (
  process.env.APPLE_ID &&
  process.env.APPLE_SECRET &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID
) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  )
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  session: { strategy: 'jwt' },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const account = await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name || user.email, image: user.image },
          create: { email: user.email, name: user.name || user.email, image: user.image },
          select: { id: true, role: true },
        })
        token.sub = account.id
        token.role = account.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.sub === 'string' && token.sub.length > 0) {
        session.user.id = token.sub
        session.user.role = typeof token.role === 'string' ? token.role : 'USER'
      } else if (session.user) {
        throw new Error('Invalid session: user identifier missing')
      }
      return session
    },
  },
}