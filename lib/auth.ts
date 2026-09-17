import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig, // Herda a config leve (pages, secret, etc)
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Busca o usuário no banco
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return null;

        // Valida a senha
        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        // Retorna o objeto do usuário (incluindo a ROLE e IMAGE)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role // Importante: Passa a role para o JWT
        };
      },
    }),
  ],
  callbacks: {
    // 1. Ocorre quando o token JWT é criado ou atualizado
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.picture = user.image;
        token.image = user.image;
      }

      // Trata atualizações em tempo real disparadas por useSession().update()
      if (trigger === "update" && session) {
        if (session.image !== undefined) {
          token.picture = session.image;
          token.image = session.image;
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
      }

      // Fallback: se o token existente ainda não tem foto, busca uma vez no banco
      if (token.id && !token.picture) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { image: true, name: true }
          });
          if (dbUser?.image) {
            token.picture = dbUser.image;
            token.image = dbUser.image;
          }
        } catch {
          // silencia em caso de desconexão momentânea
        }
      }

      return token;
    },
    // 2. Ocorre quando a sessão é verificada (no client ou server side)
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        if (token.picture || token.image) {
          session.user.image = (token.picture as string) || (token.image as string);
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
      }
      return session;
    },
  },
});