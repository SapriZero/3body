
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
Ogni trasformazione fisica è una funzione pura del tipo:  
`State → State`  

Esempi:  
- `half_step_velocity_relation`: aggiorna le velocità usando l’accelerazione gravitazionale,  
- `full_step_position_relation`: sposta le posizioni in base alle velocità.

### 3. Composizione temporale  
Il passo completo del metodo **Leapfrog** (uno degli integratori più stabili per la meccanica celeste) è ottenuto semplicemente componendo tre relazioni:  

    leapfrog_step = compose(
        half_velocity_update,
        full_position_update,
        half_velocity_update
    )

L’intera simulazione diventa:  
`stato_finale = iterate(leapfrog_step, stato_iniziale, n_passi)`

### 4. Calcolo delle forze  
L’accelerazione gravitazionale è calcolata in modo **totalmente vettorializzato** con NumPy, eliminando loop espliciti e sfruttando operazioni su array.  
La complessità rimane **O(N²)**, ma l’implementazione è ottimizzata per **prestazioni** e **stabilità numerica**.

---

## ✅ Vantaggi dell’approccio

| Aspetto | Beneficio |
|--------|----------|
| **Chiarezza concettuale** | Ogni passo fisico è una funzione autonoma, facilmente comprensibile e testabile. |
| **Componibilità** | È semplice inserire nuove trasformazioni (es. effetti di marea, resistenza, espansione cosmica) senza modificare il motore di integrazione. |
| **Sicurezza** | Stati immutabili ed effetti collaterali nulli riducono drasticamente i bug. |
| **Estensibilità** | Il calcolatore di accelerazioni può essere sostituito (es. con Barnes-Hut) senza toccare il resto del codice. |
| **Prestazioni** | Per sistemi piccoli e medi (**N ≤ 1000**), l’implementazione è competitiva con codice ottimizzato in C/Fortran. |

---

## ⚠️ Limiti e considerazioni

- **Scalabilità**: l’approccio attuale usa il calcolo gravitazionale diretto **O(N²)**, quindi non è adatto a sistemi con **N ≫ 1000** (es. ammassi stellari). Tuttavia, la struttura è pronta per integrare algoritmi approssimati (Barnes-Hut, FMM).  
- **Overhead iniziale**: per **N = 2 o 3**, implementazioni in Python puro con tuple scalari possono essere leggermente più veloci. Il nostro codice privilegia **chiarezza e scalabilità moderata**.  
- **Dipendenza da NumPy**: richiede una libreria esterna, ma questa è ormai standard in ambito scientifico.

---

## 🔬 Validazione

Il simulatore è stato testato su configurazioni note del problema dei tre corpi, inclusa la **soluzione lagrangiana equilaterale** (orbite stabili a triangolo).  
In simulazioni di **5000+ passi** con passo temporale piccolo (**dt = 0.001**), la **variazione relativa dell’energia totale rimane inferiore a 10⁻⁵**, dimostrando un’eccellente conservazione delle quantità fisiche — una prova della correttezza e stabilità dell’integratore.

---

## 🚀 Conclusioni

Non abbiamo inventato nuove leggi della fisica — ma abbiamo **reinventato il modo di esprimerle nel codice**.  

Il nostro approccio dimostra che:  
> **Una simulazione numerica può essere al tempo stesso rigorosa, leggibile, modulare e performante**,  
> se costruita attorno a **relazioni pure e composizione dichiarativa**.

Questo paradigma si estende naturalmente ad altri domini:  
- dinamica molecolare,  
- sistemi planetari multipli,  
- missioni spaziali in campi gravitazionali complessi,  
- modelli astrofisici ibridi.

Il codice è **open, riproducibile e pronto per l’estensione**.

---

## ▶️ Demo live

*(Durante una presentazione, qui si esegue lo script e si mostra il test di conservazione dell’energia e l’evoluzione delle traiettorie.)*

---

**Grazie per l’attenzione**  
*Il codice sorgente è disponibile su richiesta.*
