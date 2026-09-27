export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmt = (v: number, d = 2) => v.toFixed(d);
export const fmtArea = (v: number) => `${v.toFixed(2)} m²`;
