import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/auth/login",
        error: "/auth/login",
    },
    providers: [
        // GitHub OAuth — only registers the provider when keys are configured
        ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
            ? [
                  GitHubProvider({
                      clientId: process.env.GITHUB_ID,
                      clientSecret: process.env.GITHUB_SECRET,
                  }),
              ]
            : []),

        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const user = await prisma.user.findUnique({ where: { email: credentials.email } });
                if (!user || !user.password) return null;
                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) return null;
                return { id: user.id, email: user.email, name: user.name };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // On first sign-in, `user` is populated — store the DB id in the token
            if (user?.id) {
                token.id = user.id;
                return token;
            }
            // On subsequent requests, `user` is undefined.
            // If token.id is already set, we're done.
            if (token.id) return token;
            // Safety net: if token.id is missing (e.g. old session, OAuth flow),
            // look up the user by email so all API routes get a valid userId.
            if (token.email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email },
                        select: { id: true },
                    });
                    if (dbUser) token.id = dbUser.id;
                } catch {
                    // DB unreachable — keep token as-is, API routes will handle the error
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) (session.user as any).id = token.id;
            return session;
        },
    },
};
