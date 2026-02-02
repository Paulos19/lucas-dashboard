import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validação de segurança extra
        return {
          // AQUI ESTÁ A MUDANÇA: Adicionamos 'application/pdf'
          allowedContentTypes: [
            'image/jpeg', 
            'image/png', 
            'image/webp', 
            'application/pdf'
          ],
          tokenPayload: JSON.stringify({
            userId: session.user?.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload concluído no Blob Storage:', blob.url);
        // Nota: O salvamento no banco (tabela Attachment) será feito 
        // pelo frontend logo após o upload, para vincular ao Lead correto.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}