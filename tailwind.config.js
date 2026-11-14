/** Tailwind convive con Bootstrap: preflight apagado (Bootstrap ya trae su "reboot")
 *  y modo oscuro atado al atributo data-bs-theme que usa Bootstrap 5.3. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-bs-theme="dark"]'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      keyframes: {
        ecg: { from: { strokeDashoffset: 100 }, to: { strokeDashoffset: 0 } },
        up: { from: { opacity: 0, transform: 'translateY(26px)' }, to: { opacity: 1, transform: 'none' } },
        sl: { from: { opacity: 0, transform: 'translateX(44px)' }, to: { opacity: 1, transform: 'none' } },
        beat: { '0%,100%': { transform: 'scale(1)' }, '15%': { transform: 'scale(1.2)' }, '30%': { transform: 'scale(1)' }, '45%': { transform: 'scale(1.13)' } },
        drift: { '0%,100%': { transform: 'translate(0,0)' }, '50%': { transform: 'translate(30px,-24px)' } },
      },
      animation: {
        ecg: 'ecg 2.6s linear infinite',
        up: 'up .65s cubic-bezier(.2,.8,.2,1) both',
        sl: 'sl .5s cubic-bezier(.2,.8,.2,1) both',
        beat: 'beat 1.4s ease-in-out infinite',
        drift: 'drift 9s ease-in-out infinite',
      },
    },
  },
}
