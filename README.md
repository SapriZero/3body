# Three-Body Problem Simulation via Composition of Pure Dynamical Relations

> **A declarative, modular, and high-performance approach to gravitational dynamics**

## 🌌 Context

The three-body problem is one of the most celebrated examples of **chaotic dynamics** in classical physics:  
although the fundamental laws (Newtonian gravitation) are simple and deterministic,  
the system’s behavior becomes **unpredictable over the long term** and **admits no general analytical solution**.

Traditionally, numerical simulations rely on:
- equations of motion (differential equations),
- time integration methods (e.g., Runge-Kutta, Verlet, Leapfrog),
- explicit loops that update positions and velocities.

This approach works but often yields **imperative, fragile, and hard-to-extend** code.

## 🎯 Objective

We developed an **alternative framework for simulating gravitational dynamical systems**, built on two key principles:

1. **Every physical law is expressed as a pure relation**:  
   a function that transforms a complete system state into a new state, **with no side effects**.
2. **Temporal evolution emerges from the composition** of these elementary relations.

The result is a **modular, declarative, and mathematically transparent** simulator, capable of faithfully reproducing the chaotic dynamics of the three-body problem.

---

## 🧱 System Architecture

### 1. State Representation
- The system state is an **immutable tuple** of `Body` objects, each containing:
  - `m`: mass (`float`)
  - `r`: position (`np.ndarray` of shape `(3,)`)
  - `v`: velocity (`np.ndarray` of shape `(3,)`)
- Immutability ensures **safety**: no accidental state mutation during simulation.

### 2. Primitive Relations
Each physical transformation is a **pure function**:

```python
State → State
