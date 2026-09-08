import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import FacebookProvider from 'next-auth/providers/facebook'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '' }),
    AppleProvider({ clientId: process.env.APPLE_ID || '', clientSecret: process.env.APPLE_SECRET || '' }),
    FacebookProvider({ clientId: process.env.FACEBOOK_CLIENT_ID || '', clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '' }),
  ],
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
      if (session.user) {
        session.user.id = token.sub
        session.user.role = typeof token.role === 'string' ? token.role : 'USER'
      }
      return session
    },
  },
}