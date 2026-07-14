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
            if (user) token.id = user.id;
            return token;
        },
        async session({ session, token }) {
            if (session.user) (session.user as any).id = token.id;
            return session;
        },
    },
};
