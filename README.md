# CardioIA · React + Tailwind + Bootstrap + API en Python

Clasificador de **antecedente de enfermedad cardíaca o infarto** (BRFSS 2015) con interfaz en React y un backend FastAPI + SQLite que guarda patrones, limpia datos, cambia la partición y re-entrena.

## Arrancar (desde esta carpeta, en dos terminales)
```bash
# Terminal 1 · API de Python
pip install -r server/requirements.txt
python -m uvicorn server.main:app --port 8000

# Terminal 2 · interfaz
npm install
npm run dev          # http://localhost:5173
```
La primera vez, la API carga la base BRFSS (229.781 patrones sin duplicados) en `server/data/cardioia.db`; usa `heart_disease_health_indicators_BRFSS2015.csv` si está en esta carpeta o en la de arriba, y si no, lo descarga. Sin la API, Resultados, Predictor, Formulario y Pipeline siguen funcionando con los datos del prototipo.

## Secciones (barra lateral, con rutas `#inicio`, `#dashboard`…)
| Grupo | Sección | Qué hace | API |
|---|---|---|---|
| Explorar | Inicio | Bienvenida, KPIs, casos de prueba y accesos rápidos | No |
| Explorar | Dashboard | Panel en vivo (cada 2,5 s): patrones, entrenamiento, modelo actual, historial | Sí |
| Explorar | Estadística | Descriptiva por variable y por clase, histograma de IMC, prevalencia por edad, correlaciones | Sí |
| Datos | Registrar caso | Formulario de 21 variables + etiqueta real | Sí |
| Datos | Importar datos | Carga masiva desde CSV o JSON, con plantillas | Sí |
| Datos | Limpieza | Diagnóstico y corrección de nulos, rangos, duplicados y outliers | Sí |
| Datos | Historial | Registros guardados; quitar o restaurar | Sí |
| Modelo | Centro de IA | Partición train/val/test, semilla y re-entrenamiento | Sí |
| Modelo | Resultados | Métricas, gráficas y galería de PNG de Python | No |
| Modelo | Predictor rápido / Evaluar un caso | Probabilidad y factores de un caso | No |
| Proyecto | Sobre el proyecto | Alcance del modelo y pipeline | No |

## Cómo se re-entrena
1. Los patrones viven en SQLite (`patrones`) con su origen (`brfss`, `manual`, `csv`, `json`) y un indicador `activo`.
2. Al entrenar se leen los activos, se quitan en memoria duplicados, nulos y valores fuera de rango, se calculan las 10 variables derivadas, se parte con la configuración guardada y se ajustan los 5 modelos del script (`class_weight="balanced"`, `StandardScaler` solo con train).
3. Se guardan métricas, hiperparámetros y los coeficientes de la regresión logística; la interfaz los toma para el Predictor y el Formulario.
4. El mismo entrenamiento genera siete PNG y los guarda en SQLite junto con sus métricas. En **Administrador → Resultados**, la galería muestra las gráficas del último entrenamiento. La curva de aprendizaje vuelve a ajustar la regresión logística con varios tamaños de entrenamiento y mide ROC-AUC en la validación, sin usar test.

## Gráficas del entrenamiento

El proyecto incluye siete imágenes de referencia generadas con BRFSS 2015. Se muestran aunque la API esté apagada o todavía no hayas hecho un entrenamiento con esta versión. Para actualizarlas con tus datos, instala las dependencias de `server/requirements.txt`, inicia la API y usa **Administrador → Centro de IA → Entrenar ahora**. Al llegar a 100 %, abre **Resultados**. No necesitas CSV, un script externo ni copiar imágenes manualmente.

La galería incluye curvas ROC y precisión–recall, matrices de confusión, importancia de variables, curva de aprendizaje, distribución de clases y matriz de correlación. Los PNG de referencia están en `public/resultados/`. Los nuevos se sirven mediante `GET /api/graficas` y `GET /api/graficas/{entrenamiento_id}/{nombre}.png`.

## Limpieza
Analiza nulos, valores fuera de rango, duplicados y outliers de IMC (IQR 1,5). Eliminar = marcar `activo = 0` (reversible con **Restaurar filas**); imputar y recortar sí modifican valores.

## API (http://localhost:8000/docs)
`GET /api/salud · /dashboard · /modelo · /metricas · /config · /estadisticas · /patrones` · `PUT /api/config` · `POST /api/entrenar · /patrones · /patrones/importar · /limpieza/analizar · /limpieza/aplicar · /limpieza/restaurar · /dataset/semilla` · `GET /api/entrenamiento/estado` · `DELETE /api/patrones/{id}`

## Puente anterior (sin API)
`scripts/exportar_resultados.py` es opcional y solo sirve para importar resultados de `proyecto_ia_brfss.py` desde fuera de CardioIA. Requiere `metricas_test.csv` y `variables_utilizadas.csv` y puede copiar sus PNG a `public/resultados/`. No se usa al re-entrenar desde la aplicación.

## Estructura
```
server/    main.py (rutas) · servicios.py (limpieza, estadística, entrenamiento) · db.py · esquema.py
src/       App.jsx (barra lateral y rutas) · components/ (Inicio, Dashboard, Estadistica, Entrenamiento, datos/*, charts…) · lib/ (api, estado, risk) · hooks/
```

## Bootstrap y Tailwind juntos
Bootstrap pone grilla, tablas, formularios, `progress` y el tema (`data-bs-theme`); Tailwind pone utilidades y animaciones. El `preflight` de Tailwind está apagado para no pelear con el reboot de Bootstrap.

## Aviso
Prototipo académico: no es una herramienta de diagnóstico. El modelo clasifica la presencia de antecedente en datos transversales; no pronostica el futuro ni establece causas.
