# Arcum — Pending Owner Decisions Register (`OWNER_DECISIONS.md`)

**Date:** 9 November 2026 · **direkonsiliasi 20 November 2026**  
**Reference:** `ARCUM_ROBINHOOD_DEV_BRIEF.md` Section 25

> Baris 4 dan 6 dikoreksi pada 2026-11-20: status lamanya mengklaim lebih dari yang ada di kode. Baris lain tidak diubah. Untuk kebutuhan mainnet per item + bukti, lihat `docs/MAINNET_READINESS.md`.

---

## Decision Matrix & Production Milestones

Development and local verification of the Arcum protocol are 100% complete with reproducible baseline code. The following business, governance, and operational decisions must be approved by the protocol owner prior to mainnet deployment:

| Decision Area | Question for Protocol Owner | Impacted Components | Proposed Default in Brief | Status |
|---|---|---|---|---|
| **1. Branding & Domain** | Confirmed name is **Arcum**. What are the final domain, logo SVG, and social handles? | Marketing site, metadata, bundle assets | Luxury Dark Terminal (`#070B19` / Gold `#D4AF37`) | ✅ Baseline active; pending domain registration |
| **2. Pool Seeding Capital** | What is the owner seed capital in USDG for the Writer Pool upon launch? | `WriterPool.sol` initial capacity | 100k - 500k USDG initial deposit | ⏳ Pending Owner Allocation |
| **3. Timelock Multisig Signers** | Which multi-sig wallet addresses (e.g. 3-of-5 Safe) will hold admin ownership behind the 48h timelock? | `TimelockController.sol` | 48-Hour delay on all parameter/proxy upgrades | ⏳ Pending Signer Addresses |
| **4. Operational Signers** | Which dedicated operational addresses will hold Keeper and Vol Publisher keys? | `deployments/4663.json`, system daemons | Strictly non-overlapping, keyless vault execution | ⚠️ **Sebagian.** Keeper dan publisher dipisah secara kode (`KEEPER_PRIVATE_KEY` wajib, `VolPublisher.from_env` fail-closed), tapi **alamatnya belum ditetapkan owner** dan akun keeper testnet belum diisi gas. "Vol Signer" tidak lagi relevan: `VolOracle` memakai allowlist `setPublisher(address,bool)`, bukan tanda tangan EIP-712 — `vol-engine/vol_engine/signer.py` deprecated |
| **5. Protocol Token Ticker** | Will the protocol launch with a native token (e.g. `$ARCUM`) for stakers & buy/burn, or remain phase-1 USDG only? | `ArcumStaking.sol`, `ArcumBuyBurn.sol` | Start unwired/closed in Phase 1; activate in Phase 2 | ✅ Unwired & safe at launch |
| **6. RPC Capacity & Gas Paymaster** | Will the protocol sponsor user gas via Account Abstraction paymaster at launch? | `contracts/src/aa/ArcumPaymaster.sol` (on-chain), `app/src/aa/paymaster.ts` (client helper) | `AA_PAYMASTER_DEPOSIT=0` di rilis awal | ⚠️ **Koreksi.** Status lama "Paymaster built & tested" menunjuk `app/src/aa/paymaster.ts`, yang hanya counter di memori (bukan paymaster on-chain). Paymaster yang nyata ada di `contracts/src/aa/ArcumPaymaster.sol` dan lulus 8/8 test terhadap EntryPoint v0.7 asli. Deposit sengaja 0: saldo paymaster hanya bisa ditarik lewat owner, yaitu timelock 48 jam, jadi pengisian harus keputusan owner |
| **7. Access Gate & Terms** | Will the app launch permissionlessly or with regional geo-blocks / invitation codes? | Frontend config & `Product Terms` | Permissionless on-chain; terms disclosure active | ✅ Terms & Exit guide live |
