import numpy as np
from dataclasses import dataclass
from functools import reduce
from typing import Tuple

# --- Definizione immutabile del corpo con protezione sugli array ---
@dataclass(frozen=True)
class Body:
    m: float
    r: np.ndarray  # posizione (3,)
    v: np.ndarray  # velocità (3,)

    def __post_init__(self):
        # Blocca la mutazione accidentale: copia difensiva
        object.__setattr__(self, 'r', np.array(self.r, copy=True, dtype=float))
        object.__setattr__(self, 'v', np.array(self.v, copy=True, dtype=float))

State = Tuple[Body, ...]

# --- Estrattori di stato ---
def masses(state: State) -> np.ndarray:
    return np.array([b.m for b in state], dtype=float)

def positions(state: State) -> np.ndarray:
    return np.array([b.r for b in state], dtype=float)  # (N, 3)

def velocities(state: State) -> np.ndarray:
    return np.array([b.v for b in state], dtype=float)  # (N, 3)

# --- ACCELERAZIONI: completamente vettorializzate ---
def accelerations_np(state: State, G: float = 1.0, eps: float = 1e-12) -> np.ndarray:
    pos = positions(state)      # (N, 3)
    m = masses(state)           # (N,)
    N = len(state)
    
    # Differenze: dx[i, j] = pos[j] - pos[i] → (N, N, 3)
    dx = pos[None, :, :] - pos[:, None, :]
    
    # Distanze al quadrato e cubo
    dist_sq = np.sum(dx**2, axis=2)          # (N, N)
    np.fill_diagonal(dist_sq, 1.0)           # evita divisione per zero
    dist = np.sqrt(dist_sq)
    dist_cubed = dist * dist_sq              # = dist**3, più stabile
    
    # Fattore gravitazionale: G * m_j / r_ij^3 → (N, N)
    inv_dist_cubed = G * m[None, :] / (dist_cubed + eps)
    np.fill_diagonal(inv_dist_cubed, 0.0)    # nessuna auto-interazione
    
    # Accelerazione: a_i = Σ_j dx[i,j] * inv_dist_cubed[i,j]
    acc = np.sum(dx * inv_dist_cubed[:, :, None], axis=1)  # (N, 3)
    return acc

# --- ENERGIA: vettorializzata e precisa ---
def kinetic_energy_np(state: State) -> float:
    v = velocities(state)
    m = masses(state)
    return 0.5 * np.sum(m * np.sum(v**2, axis=1))

def potential_energy_np(state: State, G: float = 1.0, eps: float = 1e-12) -> float:
    pos = positions(state)
    m = masses(state)
    N = len(state)
    
    dx = pos[None, :, :] - pos[:, None, :]   # (N, N, 3)
    dist = np.sqrt(np.sum(dx**2, axis=2))    # (N, N)
    np.fill_diagonal(dist, 1.0)
    
    m_prod = m[:, None] * m[None, :]         # (N, N)
    U_mat = -G * m_prod / (dist + eps)
    np.fill_diagonal(U_mat, 0.0)
    
    return np.sum(np.triu(U_mat, k=1))

def total_energy_np(state: State) -> float:
    return kinetic_energy_np(state) + potential_energy_np(state)

# --- RELAZIONI PURE: State → State ---
def add_velocity_np(state: State, dv: np.ndarray) -> State:
    return tuple(Body(b.m, b.r, b.v + dv[i]) for i, b in enumerate(state))

def add_position_np(state: State, dx: np.ndarray) -> State:
    return tuple(Body(b.m, b.r + dx[i], b.v) for i, b in enumerate(state))

def half_step_velocity_relation_np(state: State, dt: float) -> State:
    a = accelerations_np(state)
    dv = a * (dt / 2.0)
    return add_velocity_np(state, dv)

def full_step_position_relation_np(state: State, dt: float) -> State:
    v = velocities(state)
    dx = v * dt
    return add_position_np(state, dx)

# --- COMPOSIZIONE DELLA PIPELINE LEAPFROG ---
def compose(*funcs):
    return lambda state, dt: reduce(lambda s, f: f(s, dt), funcs, state)

leapfrog_step_np = compose(
    half_step_velocity_relation_np,
    full_step_position_relation_np,
    half_step_velocity_relation_np
)

# --- FUNZIONE DI TEST: conservazione dell'energia (CORRETTA) ---
def test_energy_conservation():
    print("🧪 Running energy conservation test (Lagrangian equilateral configuration)...")
    
    # Side length of equilateral triangle
    a = 1.0
    
    # Positions (center of mass at origin)
    r1 = np.array([ a,                 0.0, 0.0])
    r2 = np.array([-a/2,  np.sqrt(3)*a/2, 0.0])
    r3 = np.array([-a/2, -np.sqrt(3)*a/2, 0.0])
    
    # Angular velocity for equilibrium: ω = sqrt(G * M / a³) = sqrt(3) (since G=1, M=3)
    # Orbital radius from COM: R = a / sqrt(3)
    # Tangential speed: v = ω * R = sqrt(3) * (a / sqrt(3)) = a = 1.0
    v1 = np.array([ 0.0,  1.0, 0.0])
    v2 = np.array([-np.sqrt(3)/2, -0.5, 0.0])
    v3 = np.array([ np.sqrt(3)/2, -0.5, 0.0])
    
    state = (
        Body(1.0, r1, v1),
        Body(1.0, r2, v2),
        Body(1.0, r3, v3)
    )
    
    dt = 0.001
    steps = 5000
    E0 = total_energy_np(state)
    
    # Simulate
    for _ in range(steps):
        state = leapfrog_step_np(state, dt)
    
    E1 = total_energy_np(state)
    rel_error = abs(E1 - E0) / (abs(E0) + 1e-15)
    
    print(f"✅ Initial energy: {E0:.8f}")
    print(f"✅ Final energy:   {E1:.8f}")
    print(f"📊 Relative error: {rel_error:.2e}")
    
    if rel_error < 1e-4:
        print("🟢 Test passed: energy is well conserved!")
        return True
    else:
        print("🔴 Warning: high energy error.")
        return False

# --- ESEMPIO DI UTILIZZO ---
if __name__ == "__main__":
    # Esegui il test corretto
    success = test_energy_conservation()
    print("\n" + "="*50)
    
    # Esempio singolo passo (demo)
    demo_state = (
        Body(1.0, np.array([0.0, 0.0, 0.0]), np.array([0.0, 0.1, 0.0])),
        Body(1.0, np.array([1.0, 0.0, 0.0]), np.array([0.0, -0.1, 0.0])),
        Body(1.0, np.array([0.5, 0.8660254, 0.0]), np.array([0.0, 0.0, 0.0]))
    )
    
    dt = 0.01
    new_state = leapfrog_step_np(demo_state, dt)
    
    print("🚀 Example: state after one Leapfrog step")
    for i, b in enumerate(new_state):
        print(f"Body {i}: r = [{b.r[0]: .5f}, {b.r[1]: .5f}, {b.r[2]: .5f}], "
              f"v = [{b.v[0]: .5f}, {b.v[1]: .5f}, {b.v[2]: .5f}]")
    
    print(f"\nTotal energy (initial): {total_energy_np(demo_state):.6f}")
    print(f"Total energy (final):   {total_energy_np(new_state):.6f}")
