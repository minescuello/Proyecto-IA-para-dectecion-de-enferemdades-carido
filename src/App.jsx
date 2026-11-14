import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SinApi } from './components/ui'
import { Icono } from './components/icons'
import Inicio from './components/Inicio'
import Dashboard from './components/Dashboard'
import Estadistica from './components/Estadistica'
import Registro from './components/datos/Registro'
import Importar from './components/datos/Importar'
import Limpieza from './components/datos/Limpieza'
import Registros from './components/datos/Registros'
import Entrenamiento from './components/Entrenamiento'
import Results from './components/Results'
import Predictor from './components/Predictor'
import Formulario from './components/Formulario'
import Sobre from './components/Sobre'
import Paciente from './components/Paciente'
import SelectorRol from './components/SelectorRol'
import { api } from './lib/api'
import { sincronizar } from './lib/estado'

const GRUPOS = ['Mi salud', 'Explorar', 'Datos', 'Modelo', 'Proyecto']
// api: la sección necesita la API de Python. Sin `titulo`, la página trae su propio encabezado.
const RUTAS = [
  { id: 'mi-evaluacion', grupo: 'Mi salud', nombre: 'Mi evaluación', icono: 'clipboard', vista: Paciente },
  { id: 'inicio', grupo: 'Explorar', nombre: 'Inicio', icono: 'home', vista: Inicio },
  { id: 'dashboard', grupo: 'Explorar', nombre: 'Dashboard', icono: 'grid', vista: Dashboard, api: true, titulo: 'Dashboard en vivo', desc: 'Seguimiento de los datos y del modelo, actualizado cada pocos segundos.' },
  { id: 'estadistica', grupo: 'Explorar', nombre: 'Estadística', icono: 'chart', vista: Estadistica, api: true, titulo: 'Estadística descriptiva', desc: 'Cómo se distribuyen y se relacionan los patrones guardados.' },
  { id: 'registrar', grupo: 'Datos', nombre: 'Registrar caso', icono: 'plus', vista: Registro, api: true, titulo: 'Registrar un caso', desc: 'Agrega un patrón con su etiqueta real para que el modelo aprenda de él.' },
  { id: 'importar', grupo: 'Datos', nombre: 'Importar datos', icono: 'upload', vista: Importar, api: true, titulo: 'Importar datos', desc: 'Carga un lote de patrones desde un archivo CSV o JSON.' },
  { id: 'limpieza', grupo: 'Datos', nombre: 'Limpieza', icono: 'sparkle', vista: Limpieza, api: true, titulo: 'Limpieza de datos', desc: 'Detecta y corrige nulos, valores fuera de rango, duplicados y outliers.' },
  { id: 'historial', grupo: 'Datos', nombre: 'Historial', icono: 'list', vista: Registros, api: true, titulo: 'Historial de casos', desc: 'Todos los patrones guardados: quita o restaura los que quieras.' },
  { id: 'centro-ia', grupo: 'Modelo', nombre: 'Centro de IA', icono: 'cpu', vista: Entrenamiento, api: true, titulo: 'Centro de IA', desc: 'Ajusta la partición de los datos y re-entrena el modelo.' },
  { id: 'resultados', grupo: 'Modelo', nombre: 'Resultados', icono: 'target', vista: Results, titulo: 'Resultados del modelo', desc: 'Métricas, gráficas y matrices de los cinco modelos comparados.' },
  { id: 'predictor', grupo: 'Modelo', nombre: 'Predictor rápido', icono: 'sliders', vista: Predictor, titulo: 'Predictor rápido', desc: 'Mueve los controles y mira cómo cambia la probabilidad estimada.' },
  { id: 'formulario', grupo: 'Modelo', nombre: 'Evaluar un caso', icono: 'clipboard', vista: Formulario, titulo: 'Evaluar un caso', desc: 'Ingresa todas las variables y obtén la clasificación con sus factores.' },
  { id: 'proyecto', grupo: 'Proyecto', nombre: 'Sobre el proyecto', icono: 'info', vista: Sobre, titulo: 'Sobre el proyecto', desc: 'Qué hace el modelo, qué no hace y cómo se construyó.' },
]
// Paciente (usuario final) ve solo su evaluación y el proyecto; Administrador ve el panel completo.
const PACIENTE = ['mi-evaluacion', 'proyecto']
const permitidas = (rol) => RUTAS.filter((r) => (rol === 'admin' ? r.id !== 'mi-evaluacion' : PACIENTE.includes(r.id)))
const noop = () => {}
const leer = (rol) => { const ok = permitidas(rol), h = window.location.hash.slice(1); return ok.some((r) => r.id === h) ? h : ok[0].id }
const rolGuardado = () => { try { return localStorage.getItem('cardioia-rol') === 'admin' ? 'admin' : 'paciente' } catch { return 'paciente' } }

export default function App() {
  const [rol, setRol] = useState(rolGuardado)
  const rolRef = useRef(rol)
  const [id, setId] = useState(() => leer(rol))
  const [menu, setMenu] = useState(false)
  const [tema, setTema] = useState(() => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [conectada, setConectada] = useState(false)
  const [version, setVersion] = useState(0)
  const [pill, setPill] = useState({ top: 0, height: 0 })
  const items = useRef({})
  const ruta = RUTAS.find((r) => r.id === id)
  const Vista = ruta.vista
  const lista = permitidas(rol)
  const cambiarRol = (r) => {
    if (r === rol) return
    rolRef.current = r; setRol(r); setMenu(false)
    try { localStorage.setItem('cardioia-rol', r) } catch { /* sin almacenamiento */ }
    const destino = permitidas(r)[0].id
    window.location.hash = destino; setId(destino)
  }

  useEffect(() => { document.documentElement.setAttribute('data-bs-theme', tema) }, [tema])
  useEffect(() => { const f = () => setId(leer(rolRef.current)); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [id])

  // Latido de conexión con la API; al conectarse trae el último modelo re-entrenado.
  useEffect(() => {
    let viva = true, previa = false
    const ping = async () => {
      try {
        await api.get('/salud')
        if (viva && !previa) { previa = true; setConectada(true); await sincronizar(); if (viva) setVersion((v) => v + 1) }
      } catch { if (viva && previa) { previa = false; setConectada(false) } }
    }
    ping()
    const t = setInterval(ping, 5000)
    return () => { viva = false; clearInterval(t) }
  }, [])
  const actualizar = useCallback(async () => { await sincronizar(); setVersion((v) => v + 1) }, [])

  const medir = useCallback(() => { const el = items.current[id]; if (el) setPill({ top: el.offsetTop, height: el.offsetHeight }) }, [id])
  useLayoutEffect(() => { medir() }, [medir])
  useEffect(() => { window.addEventListener('resize', medir); return () => window.removeEventListener('resize', medir) }, [medir])

  return (
    <>
      <aside className={'side ' + (menu ? 'abierto' : '')}>
        <div className="side-marca">
          <div className="marca-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="#0a0a0a" className="animate-beat" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 5 6.3 5c2 0 3.7 1.1 5.7 3.3C14 6.1 15.7 5 17.7 5 21 5 23.1 8.3 21.6 11.7 19.5 16.4 12 21 12 21z" /></svg></div>
          <div><div className="marca-t">CardioIA</div><div className="marca-s">{rol === 'admin' ? 'Panel administrador' : 'Tu salud cardíaca'}</div></div>
        </div>
        <nav className="side-nav" aria-label="Secciones">
          <div className="side-pill" style={{ top: pill.top, height: pill.height }} />
          {GRUPOS.filter((g) => lista.some((r) => r.grupo === g)).map((g) => (
            <div key={g}>
              <div className="side-grupo">{g}</div>
              {lista.filter((r) => r.grupo === g).map((r) => (
                <a key={r.id} href={'#' + r.id} ref={(el) => (items.current[r.id] = el)} className={'side-link ' + (r.id === id ? 'activo' : '')} aria-current={r.id === id ? 'page' : undefined} onClick={() => setMenu(false)}>
                  <Icono n={r.icono} /><span>{r.nombre}</span>
                  {r.api && !conectada && <span className="side-off" title="Necesita la API de Python" />}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-pie">Universidad Popular del Cesar · prototipo académico</div>
      </aside>
      {menu && <div className="side-fondo" onClick={() => setMenu(false)} />}

      <div className="main">
        <div className="animate-drift absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#007ba7] opacity-15 blur-3xl pointer-events-none" />
        <div className="topbar">
          <button className="btn chip d-lg-none" onClick={() => setMenu(true)} aria-label="Abrir menú"><Icono n="menu" /></button>
          <div className="small text-truncate"><span className="mut">Proyecto de investigación</span><span className="mut mx-2">/</span><span className="fw-semibold">{ruta.nombre}</span></div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <SelectorRol rol={rol} onCambiar={cambiarRol} />
            {rol === 'admin' && <span className="badge rounded-pill chip text-body d-inline-flex align-items-center py-2" title={conectada ? 'API de Python conectada' : 'API apagada: se usan los datos del prototipo'}>
              <span className={'punto ' + (conectada ? 'en-vivo' : '')} />{conectada ? 'API conectada' : 'Sin API'}
            </span>}
            <button className="btn chip rounded-circle" style={{ width: 40, height: 40 }} onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} aria-label="Cambiar tema">
              <span className="d-inline-block" style={{ transition: 'transform .5s', transform: tema === 'dark' ? 'rotate(180deg)' : 'none' }}>{tema === 'dark' ? '☀' : '☾'}</span>
            </button>
          </div>
        </div>

        <div className="contenido position-relative">
          {ruta.titulo && (
            <header className="mb-4 animate-up">
              <div className="eyebrow">{ruta.grupo}</div>
              <h1 className="titulo">{ruta.titulo}</h1>
              <p className="mut mb-0">{ruta.desc}</p>
            </header>
          )}
          <div key={id + '-' + version}>
            {ruta.api && !conectada ? <SinApi /> : <Vista onActualizado={actualizar} onGuardado={noop} conectada={conectada} />}
          </div>
          <footer className="panel small mut p-3 mt-5">
            Prototipo académico, no es una herramienta de diagnóstico. Clasifica la probabilidad de antecedente de enfermedad cardíaca con una regresión logística entrenada con datos autorreportados de EE. UU. (2015) y los patrones que agregues; su precisión es limitada (≈ 25 %) y no reemplaza la valoración de un profesional de la salud.
          </footer>
        </div>
      </div>
    </>
  )
}
