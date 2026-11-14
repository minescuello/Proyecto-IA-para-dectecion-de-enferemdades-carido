import { useEffect, useRef, useState } from "react";
import { M } from "../lib/estado";
import vars from "../data/variables.json";
import { risk, feats, aportes } from "../lib/risk";
import { Gauge } from "./ui";
import { fmt } from "../lib/format";
import { Curva } from "./charts";
import GuardarRegistro from "./GuardarRegistro";

const DESC = Object.fromEntries(vars.map((v) => [v[0], v[3]]));
const DERIVADAS = vars.filter((v) => v[2] === "d").map((v) => v[0]);
const opts = (a, s = 1) => a.map((t, i) => [i + s, t]);
export const EDAD = opts([
    "18–24",
    "25–29",
    "30–34",
    "35–39",
    "40–44",
    "45–49",
    "50–54",
    "55–59",
    "60–64",
    "65–69",
    "70–74",
    "75–79",
    "80 o más",
]);
export const EDU = opts([
    "Nunca fue a la escuela o solo jardín",
    "Primaria",
    "Secundaria incompleta",
    "Bachillerato completo",
    "Universidad incompleta",
    "Título universitario",
]);
export const ING = opts([
    "Menos de $482.000",
    "$482.000–$944.000",
    "$944.000–$1.500.000",
    "$1.500.000–$2.500.000",
    "$2.500.000–$4.000.000",
    "$4.000.000–$5.080.000",
    "$5.080.000–$10.000.000",
    "$10.000.000 o más",
]);
export const GEN = opts(["Excelente", "Muy buena", "Buena", "Regular", "Mala"]);
export const DIAB = [
    [0, "No tiene"],
    [1, "Prediabetes"],
    [2, "Diabetes"],
];
export const SEXO = [
    [0, "Mujer"],
    [1, "Hombre"],
];

export const SW = {
    "Salud y antecedentes": [
        ["HighBP", "Presión arterial alta", "Diagnosticada por un médico"],
        ["HighChol", "Colesterol alto", "Diagnosticado por un médico"],
        [
            "CholCheck",
            "Control de colesterol",
            "Se lo midió en los últimos 5 años",
        ],
        ["Stroke", "Accidente cerebrovascular", "Antecedente"],
        ["DiffWalk", "Dificultad para caminar", "O para subir escaleras"],
    ],
    Hábitos: [
        ["Smoker", "Ha fumado", "Al menos 100 cigarrillos en su vida"],
        ["PhysActivity", "Actividad física", "En los últimos 30 días"],
        ["Fruits", "Come fruta", "Una o más veces al día"],
        ["Veggies", "Come verduras", "Una o más veces al día"],
        ["HvyAlcoholConsump", "Consumo excesivo de alcohol", ""],
    ],
    "Acceso a la salud": [
        ["AnyHealthcare", "Tiene cobertura de salud", ""],
        [
            "NoDocbcCost",
            "No pudo ir al médico por el costo",
            "En los últimos 12 meses",
        ],
    ],
};
const INICIAL = {
    Sex: 0,
    Age: 7,
    Education: 5,
    Income: 6,
    peso: 70,
    altura: 170,
    GenHlth: 3,
    MentHlth: 0,
    PhysHlth: 0,
    Diabetes: 0,
    HighBP: 0,
    HighChol: 0,
    CholCheck: 1,
    Stroke: 0,
    DiffWalk: 0,
    Smoker: 0,
    PhysActivity: 1,
    Fruits: 1,
    Veggies: 1,
    HvyAlcoholConsump: 0,
    AnyHealthcare: 1,
    NoDocbcCost: 0,
};

const validar = (f) => {
    const e = {};
    const rango = (k, min, max, msg) => {
        const v = Number(f[k]);
        if (f[k] === "" || !Number.isFinite(v) || v < min || v > max)
            e[k] = msg;
    };
    rango("peso", 30, 300, "Ingresa un peso entre 30 y 300 kg.");
    rango("altura", 100, 230, "Ingresa una altura entre 100 y 230 cm.");
    rango("MentHlth", 0, 30, "Ingresa un número de días entre 0 y 30.");
    rango("PhysHlth", 0, 30, "Ingresa un número de días entre 0 y 30.");
    return e;
};

export const Campo = ({ id, l, ayuda, error, children }) => (
    <div className="mb-3">
        <label htmlFor={id} className="form-label small fw-semibold mb-1">
            {l}
        </label>
        {children}
        {ayuda && !error && <div className="form-text">{ayuda}</div>}
        {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
);
export const Sel = ({ id, v, on, o }) => (
    <select
        id={id}
        className="form-select"
        value={v}
        onChange={(e) => on(+e.target.value)}
    >
        {o.map(([k, t]) => (
            <option key={k} value={k}>
                {t}
            </option>
        ))}
    </select>
);
export const Num = ({ id, v, on, unidad, error }) => (
    <div className="input-group">
        <input
            id={id}
            type="number"
            inputMode="decimal"
            className={"form-control " + (error ? "is-invalid" : "")}
            value={v}
            onChange={on}
            aria-invalid={!!error}
        />
        <span className="input-group-text">{unidad}</span>
    </div>
);
export const Sw = ({ k, l, h, f, set }) => (
    <div className="form-check form-switch mb-2">
        <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id={k}
            checked={!!f[k]}
            onChange={(e) => set(k)(+e.target.checked)}
        />
        <label className="form-check-label small fw-medium" htmlFor={k}>
            {l}
            {h && (
                <span className="d-block mut" style={{ fontSize: ".78rem" }}>
                    {h}
                </span>
            )}
        </label>
    </div>
);

const Aportes = ({ items }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);
    const top = items.slice(0, 6),
        max = Math.max(...top.map((t) => Math.abs(t[1])), 0.01);
    return top.map(([n, v], i) => (
        <div key={n} className="mb-2">
            <div className="d-flex justify-content-between small">
                <span>{DESC[n] ?? n}</span>
                <span style={{ color: v > 0 ? "#dc2626" : "#059669" }}>
                    {v > 0 ? "sube" : "baja"}
                </span>
            </div>
            <div className="progress" style={{ height: 6 }}>
                <div
                    className="progress-bar"
                    style={{
                        width: ready ? (Math.abs(v) / max) * 100 + "%" : "0%",
                        background: v > 0 ? "#dc2626" : "#059669",
                        transitionDelay: i * 80 + "ms",
                    }}
                />
            </div>
        </div>
    ));
};

const Derivadas = ({ x }) => {
    const [open, setOpen] = useState(false);
    const d = feats(x);
    return (
        <div className="border-top pt-2 mt-3 text-start">
            <button
                type="button"
                className="btn btn-sm w-100 d-flex justify-content-between px-0 border-0 fw-semibold"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
            >
                Variables derivadas que se calcularon solas
                <span
                    className="mut"
                    style={{
                        transition: "transform .35s",
                        transform: open ? "rotate(180deg)" : "none",
                    }}
                >
                    ▾
                </span>
            </button>
            <div className={"acc-body " + (open ? "open" : "")}>
                <div style={{ overflow: "hidden" }}>
                    <table className="table table-sm small mb-0">
                        <tbody>
                            {DERIVADAS.map((n) => (
                                <tr key={n}>
                                    <td className="font-monospace">{n}</td>
                                    <td className="text-end fw-semibold">
                                        {fmt(d[n], 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default function Formulario({ guardar, conectada }) {
    const [f, setF] = useState(INICIAL);
    const [err, setErr] = useState({});
    const [res, setRes] = useState(null);
    const out = useRef(null);
    const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
    const num = (k) => (e) => set(k)(e.target.value);
    const imc = Number(f.peso) / Math.pow(Number(f.altura) / 100, 2);

    const enviar = (e) => {
        e.preventDefault();
        const er = validar(f);
        setErr(er);
        if (Object.keys(er).length) return;
        const { peso, altura, ...resto } = f;
        const x = {};
        Object.entries(resto).forEach(([k, v]) => (x[k] = Number(v)));
        x.BMI =
            Math.round(
                (Number(peso) / Math.pow(Number(altura) / 100, 2)) * 10,
            ) / 10;
        setRes({ id: Date.now(), x, p: risk(x) });
        if (window.innerWidth < 992)
            setTimeout(
                () =>
                    out.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    }),
                60,
            );
    };
    const limpiar = () => {
        setF(INICIAL);
        setErr({});
        setRes(null);
    };

    const r = res ? res.p / M.P : 1;
    const [txt, color] =
        r < 0.7
            ? ["Por debajo del promedio", "#059669"]
            : r < 1.3
              ? ["Cercano al promedio", "#d97706"]
              : ["Por encima del promedio", "#dc2626"];

    const volverAlInicio = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <form className="row g-3 animate-sl" onSubmit={enviar} noValidate>
            <div className="col-lg-7">
                <div className="panel p-4 mb-3">
                    <h2 className="h6 fw-bold mb-3">Datos personales</h2>
                    <div className="row">
                        <div className="col-sm-6">
                            <Campo id="Sex" l="Sexo">
                                <Sel
                                    id="Sex"
                                    v={f.Sex}
                                    on={set("Sex")}
                                    o={SEXO}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo id="Age" l="Edad (años)">
                                <Sel
                                    id="Age"
                                    v={f.Age}
                                    on={set("Age")}
                                    o={EDAD}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo id="Education" l="Nivel educativo">
                                <Sel
                                    id="Education"
                                    v={f.Education}
                                    on={set("Education")}
                                    o={EDU}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo id="Income" l="Ingreso mensual del hogar">
                                <Sel
                                    id="Income"
                                    v={f.Income}
                                    on={set("Income")}
                                    o={ING}
                                />
                            </Campo>
                        </div>
                    </div>
                </div>

                <div className="panel p-4 mb-3">
                    <h2 className="h6 fw-bold mb-3">
                        Medidas y estado de salud
                    </h2>
                    <div className="row">
                        <div className="col-sm-6">
                            <Campo id="peso" l="Peso" error={err.peso}>
                                <Num
                                    id="peso"
                                    v={f.peso}
                                    on={num("peso")}
                                    unidad="kg"
                                    error={err.peso}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo id="altura" l="Altura" error={err.altura}>
                                <Num
                                    id="altura"
                                    v={f.altura}
                                    on={num("altura")}
                                    unidad="cm"
                                    error={err.altura}
                                />
                            </Campo>
                        </div>
                        <div className="col-12 small mut mb-3">
                            Índice de masa corporal:{" "}
                            <b className="text-body">
                                {Number.isFinite(imc) && imc > 0
                                    ? fmt(imc, 1)
                                    : "—"}
                            </b>{" "}
                            (se calcula con tu peso y altura)
                        </div>
                        <div className="col-sm-6">
                            <Campo id="GenHlth" l="Salud general">
                                <Sel
                                    id="GenHlth"
                                    v={f.GenHlth}
                                    on={set("GenHlth")}
                                    o={GEN}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo id="Diabetes" l="Diabetes">
                                <Sel
                                    id="Diabetes"
                                    v={f.Diabetes}
                                    on={set("Diabetes")}
                                    o={DIAB}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo
                                id="MentHlth"
                                l="Días de mala salud mental"
                                ayuda="De los últimos 30 días"
                                error={err.MentHlth}
                            >
                                <Num
                                    id="MentHlth"
                                    v={f.MentHlth}
                                    on={num("MentHlth")}
                                    unidad="días"
                                    error={err.MentHlth}
                                />
                            </Campo>
                        </div>
                        <div className="col-sm-6">
                            <Campo
                                id="PhysHlth"
                                l="Días de mala salud física"
                                ayuda="De los últimos 30 días"
                                error={err.PhysHlth}
                            >
                                <Num
                                    id="PhysHlth"
                                    v={f.PhysHlth}
                                    on={num("PhysHlth")}
                                    unidad="días"
                                    error={err.PhysHlth}
                                />
                            </Campo>
                        </div>
                    </div>
                </div>

                {Object.entries(SW).map(([titulo, lista]) => (
                    <div key={titulo} className="panel p-4 mb-3">
                        <h2 className="h6 fw-bold mb-3">{titulo}</h2>
                        {lista.map(([k, l, h]) => (
                            <Sw key={k} k={k} l={l} h={h} f={f} set={set} />
                        ))}
                    </div>
                ))}

                <div className="d-flex gap-2">
                    <button
                        type="submit"
                        className="btn btn-ac btn-lg flex-grow-1"
                        onClick={volverAlInicio}
                    >
                        Calcular riesgo
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-lg"
                        onClick={limpiar}
                    >
                        Limpiar
                    </button>
                </div>
                {Object.keys(err).length > 0 && (
                    <div className="text-danger small mt-2" role="alert">
                        Revisa los campos marcados para poder calcular.
                    </div>
                )}
            </div>

            <div className="col-lg-5" ref={out}>
                <div
                    className="panel p-4 text-center sticky-lg-top"
                    style={{ top: "1rem" }}
                    aria-live="polite"
                >
                    {!res ? (
                        <div className="py-5 mut small">
                            Completa tus datos y pulsa{" "}
                            <b className="text-body">Calcular riesgo</b>. El
                            resultado aparecerá aquí.
                        </div>
                    ) : (
                        <div key={res.id} className="animate-up">
                            <Gauge p={res.p} base={M.P} />
                            <span
                                className="d-inline-block mt-2 px-3 py-2 rounded-pill small fw-bold text-white"
                                style={{ background: color }}
                            >
                                {txt}
                            </span>
                            <p className="mt-3 small mut">
                                ≈ <b className="text-body">{fmt(r, 1)}×</b> el
                                riesgo promedio de la encuesta (
                                {fmt(M.P * 100, 1)} %).
                            </p>
                            <h3 className="h6 fw-bold text-start mt-4 mb-2">
                                Lo que más pesa en este resultado
                            </h3>
                            <div className="text-start">
                                <Aportes items={aportes(res.x)} />
                            </div>
                            <p className="small mut text-start mt-2 mb-0">
                                No son causas: muestran cómo el modelo combina
                                tus datos.
                            </p>
                            <Derivadas x={res.x} />
                            {guardar && (
                                <GuardarRegistro
                                    x={res.x}
                                    conectada={conectada}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
            {res && (
                <>
                    <div className="col-lg-6">
                        <Curva x={res.x} k="Age" />
                    </div>
                    <div className="col-lg-6">
                        <Curva x={res.x} k="BMI" />
                    </div>
                </>
            )}
        </form>
    );
}
