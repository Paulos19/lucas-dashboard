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
      onBeforeGenerateToken: async () => {
        // Permite uploads apenas para usuários logados
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          tokenPayload: JSON.stringify({
            userId: session.user?.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Aqui você poderia salvar no banco via webhook se quisesse, 
        // mas faremos isso no submit do formulário para simplificar.
        console.log('Upload concluído:', blob.url);
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