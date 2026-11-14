export const fmt = (n, d = 0) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
