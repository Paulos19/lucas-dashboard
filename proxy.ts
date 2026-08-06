import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// Inicializa o NextAuth apenas com a configuração leve para o Middleware
export default NextAuth(authConfig).auth;

export const config = {
  // Exclui rotas de API e arquivos estáticos para não rodar o middleware desnecessariamente
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};