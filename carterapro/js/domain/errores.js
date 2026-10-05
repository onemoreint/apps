/** Error esperado de negocio: su mensaje es apto para mostrarse al usuario. */
export class ErrorNegocio extends Error {
  constructor(codigo, mensaje, detalle) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}
