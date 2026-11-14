#!/usr/bin/env bash
# ==============================================================================
# Arcum Protocol — Staging & Production Deployment Runner
# Network: Robinhood Chain (Chain ID: 4663) | Settlement: USDG
# ==============================================================================

set -e

echo "========================================================================"
echo "ARCUM PROTOCOL — STAGING & PRODUCTION DEPLOYMENT RUNNER"
echo "Target: Robinhood Chain (4663) | Settlement: USDG"
echo "========================================================================"

# 1. Environment & Toolchain Diagnostics
echo -e "\n[1/5] Verifying Host Toolchains..."
export PATH="$HOME/.foundry/bin:$PATH"

command -v forge >/dev/null 2>&1 || { echo "[ERROR] Foundry (forge) not found in PATH!"; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "[ERROR] Bun runtime not found in PATH!"; exit 1; }
command -v python >/dev/null 2>&1 || { echo "[ERROR] Python not found in PATH!"; exit 1; }

echo "  ✔ Foundry version: $(forge --version | head -n1)"
echo "  ✔ Bun version:     $(bun --version)"
echo "  ✔ Python version:  $(python --version)"

# 2. Run Comprehensive Test Suites
echo -e "\n[2/5] Running Pre-Flight Verification Across All Packages..."

echo "  -> Executing Smart Contract Test Suite (Cancun EVM)..."
(cd contracts && forge test)

echo "  -> Executing Off-Chain Core Services Test Suite (Bun)..."
(cd app && bun test && bun run typecheck)

echo "  -> Executing Volatility Engine Test Suite (Pytest)..."
(cd vol-engine && uv run python -m pytest)

echo "  -> Verifying Cross-Language Differential Vectors..."
python scripts/differential_test.py

# 3. Build Web Production Bundle
echo -e "\n[3/5] Compiling Web Frontend Production Bundle..."
(cd web && bun run build)

# 4. Solvency Stress Verification
echo -e "\n[4/5] Executing Solvency Stress Simulation..."
python scripts/stress_simulation.py

# 5. Summary & Container Readiness
echo -e "\n[5/5] Deployment Verification Completed Successfully!"
echo "========================================================================"
echo "STAGING READY: ALL 4 PACKAGES COMPILED, TESTED, AND VERIFIED (100% PASS)"
echo "========================================================================"
echo "To launch full multi-container stack:"
echo "  docker compose up -d --build"
echo "========================================================================"
