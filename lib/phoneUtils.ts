// lib/phoneUtils.ts

/**
 * Normaliza um número de telefone para comparação segura.
 * Remove caracteres não numéricos.
 * Remove o sufixo do WhatsApp (@s.whatsapp.net ou @c.us).
 * Trata a variação do 9º dígito no Brasil.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // 1. Remove tudo que não é número
  let clean = phone.replace(/\D/g, '');

  // 2. Se tiver prefixo internacional (ex: 55), mantém. 
  // Se o usuário cadastrou como "11999999999", assumimos BR (55).
  // Mas para comparação, o ideal é olhar do fim para o começo.
  
  // Lógica Específica para o Brasil (DDI 55)
  if (clean.startsWith('55') && clean.length >= 12) {
    const ddd = clean.substring(2, 4);
    const numberPart = clean.substring(4);

    // Se for celular (começa com 7, 8 ou 9) e tem 9 dígitos, remove o 9 inicial para padronizar
    if (numberPart.length === 9 && ['7', '8', '9'].includes(numberPart[0])) {
       return `55${ddd}${numberPart.substring(1)}`; 
    }
    // Se já tem 8 dígitos, retorna como está
    return clean;
  }

  return clean;
}

/**
 * Formata para o padrão JID do WhatsApp (Evolution API)
 */
export function formatToJid(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  return `${clean}@s.whatsapp.net`;
}

/**
 * Verifica se dois números são "iguais" considerando a regra do 9º dígito
 */
export function arePhoneNumbersEqual(phoneA: string, phoneB: string): boolean {
  return normalizePhoneNumber(phoneA) === normalizePhoneNumber(phoneB);
}