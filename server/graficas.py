"""Figuras del entrenamiento, calculadas con datos y predicciones de la misma ejecución."""
from io import BytesIO
from math import ceil

import numpy as np
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
from sklearn.base import clone
from sklearn.metrics import confusion_matrix, precision_recall_curve, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

from .esquema import BIN, NUM, ORIG

TINTA = "#0a0a0a"
AZUL = "#007ba7"
COLORES = ("#637984", AZUL, "#a44e00", "#137451", "#6639a0")
LINEAS = ("--", "-", "-.", ":", "-")
NOMBRES = (
    "curvas_roc", "curvas_precision_recall", "matrices_confusion_test", "importancia_variables",
    "curvas_aprendizaje", "distribucion_objetivo", "matriz_correlacion",
)


def _fig(titulo, size=(9, 5.3)):
    fig = Figure(figsize=size, facecolor="white", layout="constrained")
    FigureCanvasAgg(fig)
    fig.suptitle(titulo, fontsize=15, fontweight="bold", color=TINTA)
    return fig


def _ejes(fig, xlabel, ylabel):
    ax = fig.subplots()
    ax.set(xlabel=xlabel, ylabel=ylabel)
    ax.set_axisbelow(True)
    ax.grid(alpha=0.2)
    ax.spines[["top", "right"]].set_visible(False)
    return ax


def _png(fig):
    with BytesIO() as b:
        fig.savefig(b, format="png", dpi=125)
        return b.getvalue()


def _curvas(test, y_test):
    roc = _fig("Curvas ROC · conjunto de prueba")
    pr = _fig("Curvas precisión–recall · conjunto de prueba")
    ax = _ejes(roc, "Tasa de falsos positivos", "Tasa de verdaderos positivos")
    bx = _ejes(pr, "Recall (sensibilidad)", "Precisión")
    ax.plot([0, 1], [0, 1], color="#84949c", linestyle=":", label="Azar")
    prevalencia = float(y_test.mean())
    bx.axhline(prevalencia, color="#84949c", linestyle=":", label=f"Prevalencia = {prevalencia:.3f}")
    for (nombre, m), color, estilo in zip(test.items(), COLORES, LINEAS):
        fpr, tpr, _ = roc_curve(y_test, m["prob"])
        ax.plot(fpr, tpr, color=color, linestyle=estilo, linewidth=2, label=f'{nombre} · AUC {m["auc"]:.3f}')
        precision, recall, _ = precision_recall_curve(y_test, m["prob"])
        bx.plot(recall[::-1], precision[::-1], color=color, linestyle=estilo, linewidth=2,
                label=f'{nombre} · AP {m["pr_auc"]:.3f}')
    for a, loc in ((ax, "lower right"), (bx, "upper right")):
        a.set(xlim=(0, 1), ylim=(0, 1.02))
        a.legend(loc=loc, fontsize=9)
    return _png(roc), _png(pr)


def _confusion(test, y_test):
    fig = _fig("Matrices de confusión · conjunto de prueba", (11, 6.3))
    axes = fig.subplots(ceil(len(test) / 3), 3, squeeze=False).ravel()
    for ax, (nombre, m) in zip(axes, test.items()):
        c = confusion_matrix(y_test, m["pred"], labels=[0, 1])
        ax.imshow(c, cmap="Blues")
        for i, j in np.ndindex(c.shape):
            ax.text(j, i, f"{c[i, j]:,}".replace(",", "."), ha="center", va="center",
                    color="white" if c[i, j] > c.max() * .55 else TINTA, fontweight="bold")
        ax.set_title(nombre, fontsize=11, fontweight="bold")
        ax.set(xticks=[0, 1], xticklabels=["Sin antecedente", "Con antecedente"],
               yticks=[0, 1], yticklabels=["Sin antecedente", "Con antecedente"],
               xlabel="Predicho", ylabel="Real")
        ax.tick_params(labelsize=8)
    for ax in axes[len(test):]:
        ax.set_visible(False)
    return _png(fig)


def _importancia(modelo):
    pares = sorted(zip(NUM + BIN, modelo["w"] + modelo["wb"]), key=lambda p: abs(p[1]))[-12:]
    nombres, valores = zip(*pares)
    fig = _fig("Importancia de variables · regresión logística", (9.5, 6.2))
    ax = _ejes(fig, "Coeficiente (numéricas estandarizadas y binarias 0/1)", "")
    ax.barh([n.replace("_", " ") for n in nombres], valores, color=[AZUL if v >= 0 else "#637984" for v in valores])
    ax.axvline(0, color=TINTA, linewidth=.8)
    return _png(fig)


def _aprendizaje(lr, X_train, y_train, X_val, y_val, seed):
    # Solo usa train y validación, no test. El límite mantiene rápido el modo rápido.
    estratificable = y_train.value_counts().min() >= 2
    if len(y_train) > 20000 and estratificable:
        X_muestra, _, y_muestra, _ = train_test_split(
            X_train, y_train, train_size=20000, stratify=y_train, random_state=seed)
        if y_muestra.nunique() == 2:
            X_train, y_train = X_muestra, y_muestra
    tamanos = sorted({max(20, int(len(y_train) * p)) for p in (.15, .30, .55, .80, 1.0)}) if estratificable else [len(y_train)]
    usados, train_auc, val_auc = [], [], []
    for n in tamanos:
        Xs, ys = X_train, y_train
        if n < len(ys):
            Xs, _, ys, _ = train_test_split(X_train, y_train, train_size=n, stratify=y_train, random_state=seed)
        if ys.nunique() != 2:
            continue
        m = clone(lr).fit(Xs, ys)
        usados.append(n)
        train_auc.append(roc_auc_score(ys, m.predict_proba(Xs)[:, 1]))
        val_auc.append(roc_auc_score(y_val, m.predict_proba(X_val)[:, 1]))
    fig = _fig("Curva de aprendizaje · regresión logística")
    ax = _ejes(fig, "Registros usados para ajustar el modelo", "ROC-AUC")
    ax.plot(usados, train_auc, color="#637984", linestyle="--", marker="s", label="Entrenamiento")
    ax.plot(usados, val_auc, color=AZUL, marker="o", label="Validación fija")
    ax.legend()
    return _png(fig)


def _distribucion(y):
    fig = _fig("Distribución de clases · registros válidos sin duplicados")
    ax = _ejes(fig, "", "Registros")
    conteos = y.value_counts().reindex([0, 1], fill_value=0).tolist()
    barras = ax.bar(["Sin antecedente", "Con antecedente"], conteos, width=.56, color=["#637984", AZUL])
    ax.bar_label(barras, labels=[f"{n:,}".replace(",", ".") + f" ({n / len(y):.1%})".replace(".", ",")
                                 for n in conteos], padding=5)
    ax.set_ylim(0, max(conteos) * 1.17)
    return _png(fig)


def _correlacion(X, y):
    tabla = X[ORIG].assign(Objetivo=y)
    c = tabla.corr()
    fig = _fig("Matriz de correlación de Pearson · variables originales y objetivo", (10.5, 9))
    ax = fig.subplots()
    im = ax.imshow(c.to_numpy(), cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set(xticks=range(len(c)), yticks=range(len(c)), xticklabels=c.columns, yticklabels=c.columns)
    ax.tick_params(axis="x", labelrotation=55, labelsize=8)
    ax.tick_params(axis="y", labelsize=8)
    fig.colorbar(im, ax=ax, shrink=.75, label="Correlación (r)")
    return _png(fig)


def generar(test, modelo, lr, X, y, X_train, y_train, X_val, y_val, y_test, seed):
    roc, pr = _curvas(test, y_test)
    return dict(zip(NOMBRES, (roc, pr, _confusion(test, y_test), _importancia(modelo),
                              _aprendizaje(lr, X_train, y_train, X_val, y_val, seed),
                              _distribucion(y), _correlacion(X, y))))
