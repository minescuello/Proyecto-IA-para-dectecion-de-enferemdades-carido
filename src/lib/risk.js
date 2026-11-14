import { M } from './estado'

// Misma ingeniería de características que proyecto_ia_brfss.py (sección 3).
export const feats = (x) => {
  const d = { ...x }
  d.obesidad = +(x.BMI >= 30)
  d.sobrepeso = +(x.BMI >= 25 && x.BMI < 30)
  d.dias_mal_salud_total = x.MentHlth + x.PhysHlth
  d.mala_salud_general = +(x.GenHlth >= 4)
  d.hipertension_y_colesterol = x.HighBP * x.HighChol
  d.factores_riesgo_total = x.HighBP + x.HighChol + x.Smoker + (x.Diabetes === 2 ? 1 : 0) + d.obesidad + (x.PhysActivity === 0 ? 1 : 0)
  d.adulto_mayor_65 = +(x.Age >= 10)
  d.habitos_alimentarios = x.Fruits + x.Veggies
  d.ingreso_bajo = +(x.Income <= 4)
  d.barrera_acceso_salud = +(x.AnyHealthcare === 0 || x.NoDocbcCost === 1)
  return d
}

// Regresión logística balanceada: se suma logit(P) para recuperar la probabilidad real.
export const risk = (x) => {
  const d = feats(x)
  let z = M.b + Math.log(M.P / (1 - M.P))
  M.num.forEach((n, i) => (z += (M.w[i] * (d[n] - M.mu[i])) / M.sd[i]))
  M.bin.forEach((n, j) => (z += M.wb[j] * d[n]))
  return 1 / (1 + Math.exp(-z))
}

// Cuánto empuja cada variable del modelo el resultado (en escala logit), de mayor a menor peso.
export const aportes = (x) => {
  const d = feats(x)
  return [
    ...M.num.map((n, i) => [n, (M.w[i] * (d[n] - M.mu[i])) / M.sd[i]]),
    ...M.bin.map((n, j) => [n, M.wb[j] * d[n]]),
  ].filter(([, v]) => Math.abs(v) > 0.01).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
}
