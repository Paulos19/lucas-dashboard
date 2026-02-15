import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import { authConfig } from "@/lib/auth.config";

const prisma = new PrismaClient();

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

        // Retorna o objeto do usuário (incluindo a ROLE)
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // Adiciona a role ao token
      }
      return token;
    },
    // 2. Ocorre quando a sessão é verificada (no client ou server side)
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // Precisamos usar 'as any' ou configurar a tipagem (types/next-auth.d.ts)
        session.user.role = token.role as any; 
      }
      return session;
    },
  },
});