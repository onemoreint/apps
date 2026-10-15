import { describe, expect, it } from 'vitest';
import {
  ErrorAcceso, MAX_FALLOS, cambiarClave, cargarDatos, crearPerfil, eliminarPerfil, esperaPorFallos, fuerzaClave,
  generarCodigo, guardarDatos, iniciarSesion, kvMemoria, listarPerfiles, nuevoCodigoRecuperacion, recuperarConCodigo,
  validarClave, validarUsuario, type Perfil,
} from './seguridad';
import { estadoEjemplo } from './ejemplo';

const IT = 1000; // iteraciones bajas solo para que las pruebas sean rápidas
const nuevo = async (kv = kvMemoria(), usuario = 'jose', clave = 'Finanzas#2025') =>
  ({ kv, ...(await crearPerfil(kv, { usuario, nombre: 'José', clave }, IT)) });

const codigoDe = async (p: Promise<unknown>) => {
  try { await p; return 'ok'; } catch (e) { return (e as ErrorAcceso).code; }
};

describe('Perfiles y acceso', () => {
  it('S1 crea perfil y entra con la contraseña correcta', async () => {
    const { kv } = await nuevo();
    const s = await iniciarSesion(kv, 'JOSE ', 'Finanzas#2025');
    expect(s.perfil.usuario).toBe('jose');
  });
  it('S2 contraseña incorrecta y usuario inexistente dan el mismo error', async () => {
    const { kv } = await nuevo();
    expect(await codigoDe(iniciarSesion(kv, 'jose', 'otra-clave-1'))).toBe('credenciales');
    expect(await codigoDe(iniciarSesion(kv, 'nadie', 'Finanzas#2025'))).toBe('credenciales');
  });
  it('S3 la contraseña no se guarda en texto plano', async () => {
    const { kv, sesion } = await nuevo();
    const crudo = JSON.stringify(await kv.get(`perfil:${sesion.perfil.id}`));
    expect(crudo).not.toContain('Finanzas#2025');
  });
  it('S4 los datos se guardan cifrados y se recuperan iguales', async () => {
    const { kv, sesion } = await nuevo();
    const e = estadoEjemplo();
    await guardarDatos(kv, sesion, e);
    const crudo = JSON.stringify(await kv.get(`datos:${sesion.perfil.id}`));
    expect(crudo).not.toContain('Rappi');
    const s2 = await iniciarSesion(kv, 'jose', 'Finanzas#2025');
    expect(await cargarDatos(kv, s2)).toEqual(e);
  });
  it('S5 dos perfiles en el mismo dispositivo no se leen entre sí', async () => {
    const { kv, sesion: a } = await nuevo();
    const { sesion: b } = await nuevo(kv, 'maria', 'OtraClave!99');
    await guardarDatos(kv, a, estadoEjemplo());
    expect(await cargarDatos(kv, b)).toBeNull();
    // la clave de B no descifra los datos de A
    await expect(cargarDatos(kv, { perfil: a.perfil, dek: b.dek })).rejects.toBeTruthy();
    expect((await listarPerfiles(kv)).map((p) => p.usuario).sort()).toEqual(['jose', 'maria']);
  });
  it('S6 usuario duplicado rechazado', async () => {
    const { kv } = await nuevo();
    expect(await codigoDe(crearPerfil(kv, { usuario: 'Jose', nombre: '', clave: 'Otraclave#1' }, IT))).toBe('usuario-existe');
  });
  it('S7 bloqueo progresivo tras 5 fallos y desbloqueo al pasar el tiempo', async () => {
    const { kv } = await nuevo();
    const t0 = 1_000_000;
    for (let i = 1; i < MAX_FALLOS; i++) expect(await codigoDe(iniciarSesion(kv, 'jose', 'mala-clave-x', t0))).toBe('credenciales');
    expect(await codigoDe(iniciarSesion(kv, 'jose', 'mala-clave-x', t0))).toBe('bloqueado');
    // aun con la clave correcta, mientras dure el bloqueo
    expect(await codigoDe(iniciarSesion(kv, 'jose', 'Finanzas#2025', t0 + 1000))).toBe('bloqueado');
    expect(await codigoDe(iniciarSesion(kv, 'jose', 'Finanzas#2025', t0 + 31_000))).toBe('ok');
    expect(esperaPorFallos(5)).toBe(30_000);
    expect(esperaPorFallos(6)).toBe(60_000);
    expect(esperaPorFallos(40)).toBe(15 * 60_000);
  });
  it('S8 cambiar contraseña: la vieja deja de servir y los datos siguen', async () => {
    const { kv, sesion } = await nuevo();
    await guardarDatos(kv, sesion, estadoEjemplo());
    await cambiarClave(kv, sesion, 'Finanzas#2025', 'NuevaClave$77');
    expect(await codigoDe(iniciarSesion(kv, 'jose', 'Finanzas#2025'))).toBe('credenciales');
    const s = await iniciarSesion(kv, 'jose', 'NuevaClave$77');
    expect((await cargarDatos(kv, s))!.movimientos).toHaveLength(14);
  });
  it('S9 recuperar con código: entra, conserva datos y el código se renueva', async () => {
    const { kv, sesion, codigo } = await nuevo();
    await guardarDatos(kv, sesion, estadoEjemplo());
    const r = await recuperarConCodigo(kv, 'jose', codigo.toLowerCase().replace(/-/g, ' '), 'Recuperada#123');
    expect(r.codigo).not.toBe(codigo);
    expect((await cargarDatos(kv, r.sesion))!.movimientos).toHaveLength(14);
    expect(await codigoDe(recuperarConCodigo(kv, 'jose', codigo, 'OtraMas#4567'))).toBe('codigo');
    expect(await codigoDe(iniciarSesion(kv, 'jose', 'Recuperada#123'))).toBe('ok');
  });
  it('S10 nuevo código de recuperación invalida el anterior', async () => {
    const { kv, sesion, codigo } = await nuevo();
    const r = await nuevoCodigoRecuperacion(kv, sesion, 'Finanzas#2025');
    expect(await codigoDe(recuperarConCodigo(kv, 'jose', codigo, 'Probando#999'))).toBe('codigo');
    expect(await codigoDe(recuperarConCodigo(kv, 'jose', r.codigo, 'Probando#999'))).toBe('ok');
  });
  it('S11 eliminar perfil exige contraseña y borra datos', async () => {
    const { kv, sesion } = await nuevo();
    await guardarDatos(kv, sesion, estadoEjemplo());
    expect(await codigoDe(eliminarPerfil(kv, sesion, 'equivocada1'))).toBe('credenciales');
    await eliminarPerfil(kv, sesion, 'Finanzas#2025');
    expect(await kv.keys('')).toEqual([]);
  });
  it('S12 alterar los datos cifrados se detecta', async () => {
    const { kv, sesion } = await nuevo();
    await guardarDatos(kv, sesion, estadoEjemplo());
    const k = `datos:${sesion.perfil.id}`;
    const c = (await kv.get<{ iv: string; ct: string }>(k))!;
    const bytes = Uint8Array.from(atob(c.ct), (x) => x.charCodeAt(0));
    bytes[5] ^= 1;
    await kv.set(k, { ...c, ct: btoa(String.fromCharCode(...bytes)) });
    await expect(cargarDatos(kv, sesion)).rejects.toBeTruthy();
  });
  it('S13 validaciones de usuario y contraseña', () => {
    expect(validarUsuario('jo')).toBeTruthy();
    expect(validarUsuario('josé')).toBeTruthy();
    expect(validarUsuario('jose.lugo')).toBeNull();
    expect(validarClave('corta')).toBeTruthy();
    expect(validarClave('12345678')).toBeTruthy();
    expect(validarClave('aaaaaaaaaa')).toBeTruthy();
    expect(validarClave('jose2025xx', 'jose')).toBeTruthy();
    expect(validarClave('Mi casa azul 2025')).toBeNull();
    expect(fuerzaClave('Mi casa azul #2025')).toBe(4);
  });
  it('S14 código de recuperación: 4 bloques de 5, sin caracteres confusos', () => {
    const c = generarCodigo();
    expect(c).toMatch(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
    expect(c).not.toMatch(/[01OIL]/);
  });
  it('S15 la sesión guarda iteraciones del perfil (no fija las de pruebas)', async () => {
    const { sesion } = await nuevo();
    expect((sesion.perfil as Perfil).iter).toBe(IT);
  });
});
