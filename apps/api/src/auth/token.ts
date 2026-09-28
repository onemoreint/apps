import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

export interface TokenVerifierConfig {
  jwtSecret?: string | null;
  jwksUrl?: string | null;
  issuer?: string | null;
  audience?: string | null;
}

export interface VerifiedToken {
  sub: string;
  email?: string;
  payload: JWTPayload;
}

export type TokenVerifier = (token: string) => Promise<VerifiedToken>;

/**
 * Verifica tokens de Supabase Auth. La API nunca maneja contraseñas: Supabase autentica,
 * la API solo valida firma, expiración, emisor y audiencia del JWT.
 */
export function createTokenVerifier(cfg: TokenVerifierConfig): TokenVerifier {
  let key: Uint8Array | JWTVerifyGetKey;
  let algorithms: string[];
  if (cfg.jwksUrl) {
    key = createRemoteJWKSet(new URL(cfg.jwksUrl));
    algorithms = ['RS256', 'ES256'];
  } else if (cfg.jwtSecret) {
    key = new TextEncoder().encode(cfg.jwtSecret);
    algorithms = ['HS256'];
  } else {
    throw new Error('No hay método de verificación de tokens configurado.');
  }

  return async (token: string) => {
    const { payload } = await jwtVerify(token, key as Uint8Array, {
      algorithms,
      issuer: cfg.issuer || undefined,
      audience: cfg.audience || undefined,
      clockTolerance: 5,
    });
    if (!payload.sub || !/^[0-9a-f-]{36}$/i.test(payload.sub)) throw new Error('sub inválido');
    return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined, payload };
  };
}
