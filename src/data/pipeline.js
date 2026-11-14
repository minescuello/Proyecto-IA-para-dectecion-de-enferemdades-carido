// Resumen fiel de proyecto_ia_brfss.py (secciones 2 a 7).
export const PASOS = [
  ['Limpieza', 'Se eliminan las filas duplicadas: si no, una misma fila caería en train y en test y los resultados saldrían inflados.'],
  ['Ingeniería de características', '21 variables originales + 10 derivadas = 31 predictoras. Las numéricas se estandarizan solo con train.'],
  ['Partición estratificada', '60 % entrenamiento, 20 % validación, 20 % test. El test solo se usa al final.'],
  ['Ajuste de hiperparámetros', 'GridSearchCV con 3 folds y AUC como criterio, sobre una submuestra de 20.000 filas; luego se reentrena con todo train.'],
  ['Evaluación', 'Exactitud, precisión, recall, F1, AUC y PR-AUC: con 10 % de casos positivos la exactitud sola engaña.'],
]
export const MODELOS = [
  ['Baseline', 'Regresión logística por defecto, sin balancear clases ni ajustar.', {}],
  ['Regresión logística', 'class_weight="balanced"', { C: [0.01, 0.1, 1, 10] }],
  ['Árbol de decisión', 'class_weight="balanced"', { max_depth: [4, 6, 8, 10], min_samples_leaf: [20, 50, 100] }],
  ['Random Forest', 'class_weight="balanced_subsample"', { n_estimators: [100, 200], max_depth: [8, 12], min_samples_leaf: [10, 30] }],
  ['Gradient Boosting', 'HistGradientBoosting con class_weight="balanced"', { learning_rate: [0.05, 0.1], max_depth: [3, 5], max_iter: [100, 200] }],
]
