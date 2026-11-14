import { Icono } from './icons'
import './rol.css'

const OPC = [['paciente', 'Paciente', 'home'], ['admin', 'Administrador', 'grid']]

// Cambio de vista sin registro ni contraseña (demo): solo alterna lo que se muestra.
export default function SelectorRol({ rol, onCambiar }) {
  return (
    <div className="rol-sel" role="group" aria-label="Tipo de usuario" title="Cambiar de vista">
      <i className="rol-pill" style={{ transform: rol === 'admin' ? 'translateX(100%)' : 'none' }} />
      {OPC.map(([k, t, i]) => (
        <button key={k} type="button" className={rol === k ? 'on' : ''} aria-pressed={rol === k} onClick={() => onCambiar(k)}>
          <Icono n={i} size={15} /><span>{t}</span>
        </button>
      ))}
    </div>
  )
}
