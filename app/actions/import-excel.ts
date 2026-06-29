'use server';

import XlsxPopulate from 'xlsx-populate';

export async function parseExcelAction(formData: FormData, password?: string) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            throw new Error("Nenhum arquivo enviado.");
        }

        const arrayBuffer = await file.arrayBuffer();

        // XlsxPopulate no servidor tem acesso aos módulos Node.js (fs, etc.)
        const workbook = await XlsxPopulate.fromDataAsync(Buffer.from(arrayBuffer), password ? { password } : undefined);
        const sheet = workbook.sheet(0);

        if (!sheet) {
            throw new Error("Planilha vazia ou inválida.");
        }

        const rawData = sheet.usedRange().value() as any[][];
        return { success: true, data: rawData };
    } catch (error: any) {
        console.error("Erro no Server Action parseExcelAction:", error.message);
        return { success: false, error: error.message || "Erro ao processar arquivo Excel." };
    }
}
