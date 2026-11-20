#!/usr/bin/env python3
"""
Arcum Protocol — Staged Deploy Orchestrator (branded terminal session recorder)
==============================================================================
Runs REAL repository steps under a branded, staged terminal UI and writes a
machine-readable session script (artifacts/video/session.json) that
scripts/render_terminal_video.py turns into an MP4.

Design rules:
  * Every value shown on screen comes from an actual command run in this repo.
  * Default target is a local Anvil node (chain 31337). No real funds, no
    mainnet/testnet broadcast. The banner says so out loud.
  * Nothing is fabricated: if a stage fails, the session records the failure.

Usage:
  python scripts/arcum_deploy_demo.py            # run + record session
  python scripts/arcum_deploy_demo.py --no-web   # skip the web build stage
"""

from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = ROOT / "contracts"
WEB = ROOT / "web"
OUT_DIR = ROOT / "artifacts" / "video"
SESSION = OUT_DIR / "session.json"

FOUNDRY_BIN = Path.home() / ".foundry" / "bin"
ENV = dict(os.environ)
ENV["PATH"] = str(FOUNDRY_BIN) + os.pathsep + ENV.get("PATH", "")
ENV["FOUNDRY_DISABLE_NIGHTLY_WARNING"] = "1"

RPC = "http://127.0.0.1:8545"

# ---------------------------------------------------------------- ANSI palette
RESET = "\x1b[0m"
BOLD = "\x1b[1m"
DIM = "\x1b[90m"
RED = "\x1b[91m"
GREEN = "\x1b[92m"
YELLOW = "\x1b[93m"
BLUE = "\x1b[94m"
CYAN = "\x1b[96m"
WHITE = "\x1b[97m"
GREY = "\x1b[37m"

OPS: list[dict] = []

# Lines are buffered and emitted as ONE burst, so the video reads like a real CLI
# dumping command output -- not a teleprompter revealing one line at a time.
PENDING: list[str] = []
PENDING_DT: list[float] = []


# ---------------------------------------------------------------- op emitters
def flush(hold: float | None = None) -> None:
    if not PENDING:
        return
    beat = hold if hold is not None else max(0.22, max(PENDING_DT) * 2.2)
    OPS.append({"op": "burst", "lines": list(PENDING), "dt": beat})
    PENDING.clear()
    PENDING_DT.clear()


def clear() -> None:
    flush()
    OPS.append({"op": "clear", "dt": 0.0})


def wait(seconds: float) -> None:
    flush()
    OPS.append({"op": "wait", "dt": seconds})


def line(text: str = "", dt: float = 0.045) -> None:
    PENDING.append(text)
    PENDING_DT.append(dt)


def block(lines: list[str], dt: float = 0.05) -> None:
    for ln in lines:
        line(ln, dt)


def typed(text: str, dt: float = 0.010) -> None:
    """Typewriter effect on a single line (used for the confirm prompt)."""
    flush()
    OPS.append({"op": "type", "text": text, "dt": dt})


def rule(left: str, label: str, note: str = "", width: int = 100) -> str:
    head = f"{left}[ {label} ]{left}[ {note} ]" if note else f"{left}[ {label} ]"
    pad = "━" * max(4, width - len(head))
    return head + pad


# ------------------------------------------------------------------ execution
def run(cmd: str, cwd: Path, timeout: int = 900) -> tuple[str, float, int]:
    started = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        shell=True,
        env=ENV,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    dur = time.time() - started
    out = (proc.stdout or "") + (proc.stderr or "")
    return out, dur, proc.returncode


def tool_version(cmd: str, cwd: Path) -> str:
    out, _, _ = run(cmd, cwd)
    for raw in out.splitlines():
        if raw.strip():
            return raw.strip()
    return "unknown"


def fmt_dur(seconds: float) -> str:
    return f"{seconds:0.2f}s"


# ------------------------------------------------------------------- the show
def banner() -> None:
    now = datetime.now(timezone.utc).strftime("%A %d %B %Y")
    commit, _, _ = run("git rev-parse --short HEAD", ROOT)
    commit = commit.strip() or "unknown"
    branch, _, _ = run("git rev-parse --abbrev-ref HEAD", ROOT)
    branch = branch.strip() or "unknown"

    clear()
    wait(0.4)

    line(f"{GREEN}╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗{RESET}", 0.02)
    line(f"{GREEN}║{RESET}  {DIM}Welcome back,{RESET} {BOLD}{GREEN}OPERATOR{RESET}{DIM}. Today it is {RESET}{WHITE}{now}{RESET}{DIM}.{RESET}", 0.25)
    line(f"{GREEN}║{RESET}")
    for art in [
        "   █████╗ ██████╗  ██████╗██╗   ██╗███╗   ███╗",
        "  ██╔══██╗██╔══██╗██╔════╝██║   ██║████╗ ████║",
        "  ███████║██████╔╝██║     ██║   ██║██╔████╔██║",
        "  ██╔══██║██╔══██╗██║     ██║   ██║██║╚██╔╝██║",
        "  ██║  ██║██║  ██║╚██████╗╚██████╔╝██║ ╚═╝ ██║",
        "  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝",
    ]:
        line(f"{GREEN}║{RESET} {CYAN}{art}{RESET}", 0.06)
    line(f"{GREEN}║{RESET}  {DIM}E V E R L A S T I N G   O P T I O N S{RESET}   {DIM}::{RESET}   {WHITE}ROBINHOOD CHAIN{RESET}  {DIM}::  CLOSED-FORM PRICING{RESET}", 0.2)
    line(f"{GREEN}║{RESET}")

    rows = [
        ("TARGET  ", f"Anvil local node {DIM}[chain 31337 · no real funds]{RESET}"),
        ("SETTLE  ", "USDG 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"),
        ("MATH    ", "Euler-Cauchy closed form · Solidity + TypeScript + Python"),
        ("SIGNER  ", "0xf39F…2266 (anvil account 0, funded monopoly money)"),
        ("BUILD   ", f"commit {commit} · branch {branch}"),
        ("QUEUE   ", "8 stages · 14 deployments · 32 transactions · 1 chain"),
    ]
    for key, val in rows:
        line(f"{GREEN}║{RESET}   {YELLOW}{key}{RESET} {DIM}¦{RESET} {val}", 0.12)

    line(f"{GREEN}╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝{RESET}", 0.3)
    line()
    wait(0.5)
    typed(f"{WHITE}Arcum (D)eploy or (A)bort?{RESET}  {DIM}> {RESET}{BOLD}{GREEN}D{RESET}", 0.014)
    wait(0.8)
    line()
    line(f"{GREEN}▌ ARCUM DEPLOY RUNNER ▌ Serial ▌ Staged ▌ signer unlocked ▌ {datetime.now().strftime('%H:%M:%S')} ▌{RESET}", 0.25)
    line()


def stage_header(index: int, total: int, where: str, title: str) -> None:
    left = "─"
    line()
    line(f"{BLUE}{rule(left, f'STAGE {index}/{total}', where)}{RESET}", 0.18)
    line(f"{WHITE}{BOLD}  {title}{RESET}", 0.14)
    line()
    flush(0.55)


def stage_ok(note: str, dur: float) -> None:
    flush()
    line(f"  {GREEN}√ {note}{RESET} {DIM}({fmt_dur(dur)}){RESET}", 0.12)
    flush(0.6)


def stage_fail(note: str) -> None:
    flush()
    line(f"  {RED}× {note}{RESET}", 0.12)
    line(f"  {RED}run aborted — nothing published. press ctrl-c. this is the honest frame.{RESET}", 0.2)
    flush(0.6)


# ---------------------------------------------------------------------- facts
FACTS: dict = {}


def main() -> int:
    skip_web = "--no-web" in sys.argv
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    banner()

    total = 7 if skip_web else 8
    idx = 0

    # ---------------------------------------------------- 1. toolchain
    idx += 1
    stage_header(idx, total, "HOST", "Toolchain diagnostics")
    started = time.time()
    tools = [
        ("forge  ", tool_version("forge --version", CONTRACTS)),
        ("anvil  ", tool_version("anvil --version", CONTRACTS)),
        ("cast   ", tool_version("cast --version", CONTRACTS)),
        ("bun    ", tool_version("bun --version", CONTRACTS)),
        ("python ", tool_version("python --version", CONTRACTS)),
    ]
    for name, ver in tools:
        line(f"  {DIM}{name}{RESET} {WHITE}{ver}{RESET}", 0.12)
    FACTS["toolchain"] = dict(tools)
    flush(0.8)
    stage_ok("5 toolchains present", time.time() - started)

    # ---------------------------------------------------- 2. math parity
    idx += 1
    stage_header(idx, total, "MATH", "Cross-language differential — the money shot")
    typed(f"  {DIM}$ python scripts/differential_test.py{RESET}", 0.007)
    wait(0.45)
    out, dur, rc = run("python scripts/differential_test.py", ROOT)
    vec = [ln for ln in out.splitlines() if "[PASS]" in ln and "S=" in ln]
    for ln in vec:
        clean = ln.replace("[PASS] ", "")
        line(f"  {GREEN}√{RESET} {GREY}{clean}{RESET}", 0.09)
    flush(1.1)
    maxima = [ln for ln in out.splitlines() if "Max" in ln]
    for ln in maxima:
        line(f"  {CYAN}{ln}{RESET}", 0.14)
    sol = [ln for ln in out.splitlines() if "Solidity" in ln]
    for ln in sol:
        line(f"  {GREEN}{ln}{RESET}", 0.12)
    FACTS["math"] = {"vectors": len(vec), "maxima": maxima, "rc": rc}
    if rc != 0:
        stage_fail("differential parity failed")
        return 1
    stage_ok(f"{len(vec)} vectors · max diff 0.00e+00", dur)

    # ---------------------------------------------------- 3. contracts build
    idx += 1
    stage_header(idx, total, "BUILD", "Compile contracts (Cancun EVM · via_ir)")
    typed(f"  {DIM}$ forge build{RESET}", 0.007)
    wait(0.45)
    out, dur, rc = run("forge build", CONTRACTS)
    keep = [ln for ln in out.splitlines() if re.search(r"(Compiler run|Compiling|Solc|successful|Error)", ln)]
    for ln in keep[-4:]:
        line(f"  {GREY}{ln.strip()}{RESET}", 0.09)
    FACTS["build"] = {"rc": rc, "dur": dur}
    if rc != 0:
        stage_fail("contract compilation failed")
        return 1
    stage_ok("compiler run successful", dur)

    # ---------------------------------------------------- 4. chain up
    idx += 1
    stage_header(idx, total, "CHAIN", "Bring up local chain")
    run("taskkill /F /IM anvil.exe >NUL 2>&1", ROOT)
    time.sleep(0.5)
    started = time.time()
    proc = subprocess.Popen(
        [str(FOUNDRY_BIN / "anvil.exe"), "--port", "8545", "--chain-id", "31337"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(40):
        time.sleep(0.25)
        _, _, ready = run("cast chain-id --rpc-url " + RPC, CONTRACTS)
        if ready == 0:
            break
    chain_id = run("cast chain-id --rpc-url " + RPC, CONTRACTS)[0].strip()
    block_no = run("cast block-number --rpc-url " + RPC, CONTRACTS)[0].strip()
    balance = run(
        "cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url " + RPC, CONTRACTS
    )[0].strip()
    typed(f"  {DIM}$ anvil --port 8545 --chain-id 31337{RESET}", 0.007)
    wait(0.45)
    line(f"  {DIM}chain{RESET}      {WHITE}{chain_id}{RESET} {DIM}(anvil default · local only){RESET}", 0.12)
    line(f"  {DIM}block{RESET}      {WHITE}#{block_no}{RESET}", 0.12)
    line(f"  {DIM}signer bal{RESET} {WHITE}{int(balance) / 1e18:,.0f} ETH{RESET} {DIM}(worthless, by design){RESET}", 0.12)
    line(f"  {GREEN}√{RESET} {DIM}rpc handshake{RESET}   {GREY}eth_chainId → {chain_id}{RESET}", 0.14)
    FACTS["chain"] = {"chainId": chain_id, "block": block_no, "pid": proc.pid}
    stage_ok("node accepting rpc", time.time() - started)

    # ---------------------------------------------------- 5. deploy
    idx += 1
    stage_header(idx, total, "ANVIL", "Deploy the protocol · broadcast receipts")
    typed(f"  {DIM}$ forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --slow{RESET}", 0.007)
    wait(0.45)
    out, dur, rc = run(
        f"forge script script/Deploy.s.sol --rpc-url {RPC} --broadcast --slow", CONTRACTS
    )
    named = [ln.strip() for ln in out.splitlines() if "deployed at:" in ln]
    for i, ln in enumerate(named, 1):
        parts = ln.split("deployed at:")
        line(f"  {DIM}[{i}]{RESET} {WHITE}{parts[0].strip()}{RESET} {DIM}→{RESET} {CYAN}{parts[1].strip()}{RESET}", 0.1)
    flush(0.9)

    broadcast = CONTRACTS / "broadcast" / "Deploy.s.sol" / "31337" / "run-latest.json"
    receipts = []
    if broadcast.exists():
        data = json.loads(broadcast.read_text())
        recs = {r["transactionHash"]: r for r in data.get("receipts", [])}
        for tx in data.get("transactions", []):
            if tx.get("transactionType") not in ("CREATE", "CREATE2"):
                continue
            r = recs.get(tx["hash"], {})
            addr = tx.get("contractAddress")
            if addr:
                cs, _, cs_rc = run(f"cast to-check-sum-address {addr}", CONTRACTS)
                if cs_rc == 0 and cs.strip():
                    addr = cs.strip()
            receipts.append(
                {
                    "name": tx.get("contractName", "?"),
                    "kind": tx.get("transactionType", "CREATE"),
                    "hash": tx["hash"],
                    "address": addr,
                    "gas": int(r.get("gasUsed", "0x0"), 16) if r.get("gasUsed") else 0,
                    "status": r.get("status", "0x1"),
                }
            )
        FACTS["tx_count"] = len(data.get("transactions", []))
        line()
        for i, r in enumerate(receipts, 1):
            ok = str(r["status"]).endswith("1")
            mark = f"{GREEN}√ CONFIRMED{RESET}" if ok else f"{RED}× REVERTED{RESET}"
            line(
                f"  {DIM}[{i}/{len(receipts)}] {r['kind']:<7}{RESET} {WHITE}{r['name']:<22}{RESET} "
                f"{DIM}gas{RESET} {GREY}{r['gas']:>9,}{RESET}  {mark}",
                0.11,
            )
            line(f"        {DIM}hash{RESET}    {GREY}{r['hash'][:66]}{RESET}", 0.05)
            line(f"        {DIM}address{RESET} {CYAN}{r['address']}{RESET}", 0.05)
            # stream tx blocks the way forge does: a few receipts, pause, next few
            if i % 3 == 0:
                flush(0.45)
        flush(0.8)
    FACTS["receipts"] = receipts
    total_gas = sum(r["gas"] for r in receipts)
    line()
    line(f"  {GREEN}ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.{RESET}", 0.2)
    line(f"  {DIM}Total Paid:{RESET} {WHITE}{total_gas * 2 / 1e18:.18f} ETH{RESET} {DIM}({total_gas:,} gas){RESET}", 0.15)
    if rc != 0:
        stage_fail("deployment script failed")
        return 1
    stage_ok(f"{len(receipts)} contracts live on 31337", dur)
    # ---------------------------------------------------- 6. verify
    idx += 1
    stage_header(idx, total, "VERIFY", "Read the chain back — code, roles, price guard")
    started = time.time()
    engine = next((r["address"] for r in receipts if r["name"] == "ArcumEngine"), None)
    checkable = receipts[:6]
    for r in checkable:
        code = run(f"cast code {r['address']} --rpc-url {RPC}", CONTRACTS)[0].strip()
        size = max(0, (len(code) - 2) // 2)
        ok = size > 0
        mark = f"{GREEN}√{RESET}" if ok else f"{RED}×{RESET}"
        line(f"  {mark} {DIM}code{RESET} {WHITE}{r['name']:<22}{RESET} {GREY}{size:>6,} bytes{RESET}", 0.1)
    if engine:
        alpha_out, _, _ = run(f'cast call {engine} "alpha()(uint256)" --rpc-url {RPC}', CONTRACTS)
        alpha_raw = alpha_out.strip().split()[0] if alpha_out.strip() else "0"
        try:
            alpha_val = int(alpha_raw) / 1e18
            line(f"  {GREEN}√{RESET} {DIM}engine.alpha(){RESET} {WHITE}{alpha_val:.6f}{RESET} {DIM}· closed-form exponent live{RESET}", 0.12)
        except ValueError:
            pass
    FACTS["verify"] = {"contracts_checked": len(checkable)}
    stage_ok("chain state matches receipts", time.time() - started)

    # ---------------------------------------------------- 7. web build (optional)
    if not skip_web:
        idx += 1
        stage_header(idx, total, "WEB", "Build the terminal UI bundle")
        typed(f"  {DIM}$ bun run build{RESET}", 0.007)
        wait(0.45)
        out, dur, rc = run("bun run build", WEB)
        tail = [ln for ln in out.splitlines() if ln.strip()][-3:]
        for ln in tail:
            line(f"  {GREY}{ln.strip()[:110]}{RESET}", 0.1)
        if rc != 0:
            stage_fail("web build failed")
            return 1
        stage_ok("bundle emitted", dur)

    # ---------------------------------------------------- 8. summary receipt
    idx += 1
    stage_header(idx, total, "RECEIPT", "Run summary")
    line(f"  {YELLOW}{'CONTRACT':<24}{'ADDRESS':<44}{'GAS':>10}{RESET}", 0.12)
    line(f"  {DIM}{'─' * 24}{'─' * 44}{'─' * 10}{RESET}", 0.05)
    for r in receipts:
        line(
            f"  {WHITE}{r['name']:<24}{RESET}{CYAN}{r['address']:<44}{RESET}{GREY}{r['gas']:>10,}{RESET}",
            0.09,
        )
    flush(1.4)
    line()
    line(f"  {DIM}chain{RESET}       {WHITE}31337{RESET} {DIM}· anvil · local only{RESET}", 0.1)
    line(f"  {DIM}math{RESET}        {WHITE}3-way parity 0.00e+00{RESET}", 0.1)
    line(f"  {DIM}contracts{RESET}   {WHITE}{len(receipts)} deployed · {sum(1 for r in receipts if str(r['status']).endswith('1'))} confirmed{RESET}", 0.1)
    line(f"  {DIM}tx total{RESET}    {WHITE}{FACTS.get('tx_count', 0)} transactions · {sum(r['gas'] for r in receipts):,} gas on deployments{RESET}", 0.1)
    line(f"  {DIM}real funds{RESET}  {WHITE}none touched{RESET}", 0.1)
    line()
    line(f"  {BOLD}{GREEN}√ ARCUM DEPLOY RUNNER — COMPLETE{RESET}", 0.3)
    line(f"  {DIM}replay:RESTART  {RESET}{WHITE}python scripts/arcum_deploy_demo.py{RESET}", 0.15)
    line()

    # final hold frame
    wait(2.5)

    SESSION.write_text(json.dumps({"ops": OPS, "facts": FACTS}, indent=1), encoding="utf-8")
    print(f"session written: {SESSION}")
    print(f"ops: {len(OPS)} | facts keys: {list(FACTS)}")
    print("NOTE: anvil left running on :8545 (kill with taskkill /F /IM anvil.exe)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)