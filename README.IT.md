
# Simulazione del problema dei tre corpi mediante composizione di relazioni dinamiche pure

> **Un approccio dichiarativo, modulare e performante alla dinamica gravitazionale**

## 🌌 Contesto

Il problema dei tre corpi è uno dei più celebri esempi di **dinamica caotica** in fisica classica:  
nonostante le leggi fondamentali (la gravitazione newtoniana) siano semplici e deterministiche,  
il comportamento del sistema diventa **imprevedibile a lungo termine** e **non ammette soluzioni analitiche generali**.

Tradizionalmente, si ricorre a simulazioni numeriche basate su:
- equazioni differenziali del moto,
- metodi di integrazione temporale (es. Runge-Kutta, Verlet, Leapfrog),
- cicli espliciti che aggiornano posizioni e velocità.

Questo approccio funziona, ma tende a produrre codice **imperativo, fragile e difficile da estendere**.

## 🎯 Obiettivo

Abbiamo sviluppato un **framework alternativo per la simulazione di sistemi dinamici gravitazionali**, basato su due principi chiave:

1. **Ogni legge fisica è espressa come una relazione pura**:  
   una funzione che trasforma uno stato completo del sistema in un nuovo stato, **senza effetti collaterali**.
2. **L’evoluzione temporale emerge dalla composizione** di queste relazioni elementari.

Il risultato è un simulatore **modulare, dichiarativo e matematicamente trasparente**, capace di riprodurre con alta fedeltà la dinamica caotica del problema dei tre corpi.

---

## 🧱 Architettura del sistema

### 1. Rappresentazione dello stato
- Lo stato è una **tupla immutabile** di oggetti `Body`, ciascuno con:
  - `m`: massa (float)
  - `r`: posizione (`np.ndarray` di forma `(3,)`)
  - `v`: velocità (`np.ndarray` di forma `(3,)`)
- L’immutabilità garantisce **sicurezza**: nessuna modifica accidentale durante la simulazione.

### 2. Relazioni primitive
Ogni trasformazione fisica è una **funzione pura**:

```python
State → State
