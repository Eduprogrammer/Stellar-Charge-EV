// Camada de autenticação (Fase 1 = mock, Fase 2 = Passkey real)

const STORAGE_KEY = "stellar_charge_ev_user";

export interface Usuario {
  nome: string;
  email: string;
  metodo: "passkey" | "email";
  criadoEm: string;
}

export function salvarUsuario(usuario: Usuario): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
}

export function obterUsuario(): Usuario | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function removerUsuario(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Extrai o nome do usuário a partir do email.
 * Ex: "joao.silva@gmail.com" -> "Joao Silva"
 * Ex: "edu@empresa.com.br" -> "Edu"
 */
export function nomeAPartirDoEmail(email: string): string {
  const localPart = email.split("@")[0];
  // Substitui pontos, underscores e hífens por espaço
  const limpo = localPart.replace(/[._-]+/g, " ");
  // Capitaliza cada palavra
  return limpo
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Cria um usuário "fake" pra Fase 1 quando usa Face ID (sem email).
 * Na Fase 2, o Passkey vai trazer dados reais.
 */
export function criarUsuarioPasskeyMock(): Usuario {
  const numero = Math.floor(1000 + Math.random() * 9000);
  return {
    nome: `Motorista #${numero}`,
    email: "",
    metodo: "passkey",
    criadoEm: new Date().toISOString(),
  };
}