# Oracle Chainlink untuk Arcum — Ganti Harga Mock dengan Feed Resmi

> Basis: commit `83e510f`. Cakupan: kontrak, test, keeper, deploy script.
> Tujuan: di mainnet **tidak ada bot yang memposting harga**. Harga dibaca langsung dari feed Chainlink resmi Robinhood Chain, jadi biaya bot harga **Rp0**.

---

## STATUS PER 2026-11-20

Dokumen ini ditulis sebagai rencana. Sebagian besar isinya **sudah dieksekusi**, dan beberapa klaim di bawah (yang ditulis terhadap commit `83e510f`) **tidak lagi benar** untuk kode sekarang. Baca tabel ini dulu sebelum memakai bagian mana pun di bawah.

| Klaim lama di dokumen ini | Status sekarang | Bukti |
|---|---|---|
| `PriceGuard._readInternal()` hanya membaca `_mockPrices` | **SUDAH TIDAK BENAR.** `PriceGuardProd` membaca `AggregatorV3Interface.latestRoundData()` langsung dari feed, dengan cek `answeredInRound == roundId`, `answer > 0`, `updatedAt` tidak di masa depan, dan staleness per sesi | `contracts/src/PriceGuardProd.sol` (378 baris), `contracts/test/PriceGuardChainlink.t.sol` — 22 test lulus |
| `cfg.feed` ada tapi tidak pernah dibaca | **SUDAH TIDAK BENAR.** `cfg.feed` adalah sumber harga utama; `multiplierEmbedded` mencegah multiplier corporate action dikalikan dua kali | `contracts/test/PriceGuardChainlink.t.sol::test_multiplierNotAppliedTwice` |
| `updatedAt: block.timestamp` (harga selalu terlihat fresh) | **SUDAH TIDAK BENAR.** `updatedAt` diambil dari feed; umur harga dibandingkan `maxAgeRegular` / `maxAgeExtended`, dan `MAX_AGE_CLOSED` (3 hari) saat pasar tutup | `contracts/src/PriceGuardProd.sol` |
| `twapCheck()` mengembalikan harga mock | **SUDAH TIDAK BENAR.** TWAP cross-check memakai `KeeperTwapReference` yang di-wire lewat `setTwapSource`; deviasi di luar `twapBandBps` mempause buy | `contracts/src/KeeperTwapReference.sol`, `contracts/test/KeeperTwapReference.t.sol` — 11 test lulus |
| `ArcumEngine.sol:79` `sigmaBps = 5000` hardcode | **SUDAH TIDAK BENAR.** `_vol()` membaca `VolOracle.sigmaFor()`, di-clamp `MIN_SIGMA_BPS`/`MAX_SIGMA_BPS`, fallback `DEFAULT_SIGMA_BPS` dengan `ok = false` | `contracts/src/ArcumEngine.sol` |
| Vol yang diposting keeper tidak dipakai, jadi posting vol cuma buang gas | **SUDAH TIDAK BENAR.** Vol dari `VolOracle` sekarang yang menentukan harga; buy revert `StaleVol` kalau tidak ada reading yang valid | `contracts/src/ArcumEngine.sol`, `contracts/test/VolOracle.t.sol` |
| `setMarketHalt(stock, …)` menghentikan semua saham | **MASIH BENAR, tapi disengaja.** `setMarketHalt` meng-set `_buysPaused[stock]` **dan** `_globalPaused` (ABI-compat shim). Arahnya fail-safe (lebih aman berhenti semua), bukan celah keamanan. Perilakunya dikunci test | `contracts/src/PriceGuardProd.sol:120`, `test_setMarketHaltIsGlobalDocumentedFootgun` |
| Keeper harus berhenti posting harga **dan vol** | **SETENGAH BENAR.** Keeper berhenti posting harga (Chainlink yang urus). Vol tetap harus diposting — tapi oleh publisher `VolOracle` terpisah (`vol-engine/post_vol.py`), bukan oleh keeper accrual | `app/src/keeper/run.ts`, `vol-engine/vol_engine/publisher.py` |
| (belum ada di dokumen) `signer.py` EIP-712 | **DITEMUKAN SALAH.** `signer.py` menandatangani `VolReading{stock,sigmaBps,skewK,nonce,expiresAt}` EIP-712, sedangkan `VolOracle` tidak punya `ecrecover`, `nonce`, `expiresAt`, atau domain. Signature itu tidak bisa dikonsumsi kontrak mana pun. Diganti `vol_engine.publisher.VolPublisher` (`postMany`, `onlyPublisher`) | `vol-engine/vol_engine/signer.py` (deprecated), `vol-engine/vol_engine/publisher.py`, `vol-engine/tests/test_publisher.py` |
| (belum ada di dokumen) Nilai `MAX_AGE_*` | **DIPERBAIKI.** Dulu dikirim `90000` (25 jam) dengan alasan "feed heartbeat 86400s". Diukur on-chain 4663 pada head ts `1795160359` (02:39 ET, pasar tutup): NVDA 9197 s, AAPL 8819 s, QQQ **648 s** — QQQ ter-update di antara dua sampel, jadi feed-nya hidup dan umur besar hanya muncul saat pasar tutup. Jendela 25 jam akan menganggap harga 2–6 jam sebagai fresh di tengah sesi. Sekarang `300` / `900`, dan script menolak > 3600 | `contracts/.env.production.example`, `_requireSaneMaxAge` + 4 test di `test/DeployProduction.t.sol` |

**Yang masih terbuka:** deploy produksi ke `4663` belum ada. `deployments/4663.json` masih stack staging (`MockUSDG` + mock PriceGuard) dan **bukan** rilis produksi. Lihat `docs/MAINNET_READINESS.md`.

---

## 0. Kenapa harus diganti

> Tabel di bawah adalah **kondisi historis pada commit `83e510f`**. Status per 2026-11-20 ada di banner di atas; jangan dibaca sebagai kondisi kode sekarang.

| Sekarang | Akibat |
|---|---|
| `PriceGuard._readInternal()` hanya membaca `_mockPrices` yang diisi owner lewat `setMockPrice` | Harga cuma bergerak kalau ada yang memposting. Di mainnet, ini butuh bot yang terus bayar gas, dan harganya bisa dimanipulasi oleh pemegang key owner |
| `cfg.feed` ada di `StockConfig`, tapi **tidak pernah dibaca** | Interface sudah siap Chainlink, implementasinya belum |
| `updatedAt: block.timestamp` | Harga selalu terlihat "fresh" walaupun sebenarnya sudah basi berhari-hari |
| `twapCheck()` mengembalikan harga mock dan `ok = true` | Cross-check TWAP palsu |
| `setMarketHalt(stock, …)` mengubah `_globalHalt` | Halt satu saham ikut menghentikan **semua** saham |
| `ArcumEngine.sol:79` `sigmaBps = 5000` (hardcode) | Vol yang diposting keeper **tidak dipakai**. Posting vol dari keeper cuma buang gas |

**Fakta Robinhood Chain** (docs.robinhood.com/chain/oracles-and-price-feeds):
- Setiap stock token punya **feed Chainlink sendiri** (interface `AggregatorV3Interface` standar).
- Harga feed **sudah termasuk multiplier corporate action** (dividen, split). **Jangan dikalikan lagi**, jadi `multiplierEmbedded = true`.
- Feed update 24/5 mengikuti jam bursa, dan bisa **pause saat corporate action**. Wajib cek `updatedAt` dan tolak harga basi.
- Membaca feed **gratis** (cuma `view`, gas ikut di tx user).

> ⚠️ **Alamat feed jangan ditebak atau disalin dari manifest lama.** Ambil dari halaman resmi docs Robinhood atau Chainlink Data Feeds (pilih network Robinhood Chain), lalu cek on-chain: `description()` harus "NVDA / USD" dan `decimals()` dicatat.

---

## 1. Kontrak: `PriceGuard.sol` membaca Chainlink

### 1.1 Interface Chainlink

`contracts/src/interfaces/AggregatorV3Interface.sol` (baru):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
```

### 1.2 Ganti `_readInternal`

```solidity
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

mapping(address => bool) private _halted;          // halt per saham (ganti _globalHalt untuk per-stock)
bool private _globalHalt;                          // halt semua, hanya lewat setGlobalHalt

function _readInternal(address stock) internal view returns (PriceReading memory reading) {
    StockConfig memory c = _configs[stock];
    if (!c.enabled || c.feed == address(0)) revert StockUnknown(stock);

    SessionKind session = (_globalHalt || _halted[stock]) ? SessionKind.HALTED : getMarketSession();

    uint256 price;
    uint256 updatedAt;
    bool ok;
    try AggregatorV3Interface(c.feed).latestRoundData() returns (
        uint80, int256 answer, uint256, uint256 upd, uint80
    ) {
        if (answer > 0 && upd != 0 && upd <= block.timestamp) {
            uint8 dec = AggregatorV3Interface(c.feed).decimals();
            price = dec <= 18 ? uint256(answer) * 10 ** (18 - dec) : uint256(answer) / 10 ** (dec - 18);
            updatedAt = upd;
            ok = true;
        }
    } catch {}

    uint256 maxAge = session == SessionKind.REGULAR ? c.maxAgeRegular : c.maxAgeExtended;
    bool fresh = ok && block.timestamp - updatedAt <= maxAge;

    return PriceReading({
        s: price,
        session: session,
        fresh: fresh,
        buysPaused: _buysPaused[stock] || session == SessionKind.HALTED || !fresh,
        updatedAt: updatedAt            // dari feed, BUKAN block.timestamp
    });
}
```

Aturan yang harus dipegang (sesuai komentar di `IPriceGuard`):
- `read()` **tidak boleh revert** karena feed basi atau pause, cukup `fresh = false`. Revert hanya untuk stock yang tidak dikenal.
- Harga basi berarti **buy dan shield ditolak**. Sell saat CLOSED/HALTED memakai `lastGoodPrice` (lewat `poke`).
- `multiplierEmbedded = true` untuk feed Robinhood: harga dipakai apa adanya.

### 1.3 `decimals()` di-cache (opsional, hemat gas)

Simpan `decimals` di `setStock` supaya tidak dipanggil di setiap read:

```solidity
mapping(address => uint8) private _feedDecimals;

function setStock(address stock, StockConfig calldata cfg) external override onlyOwner {
    require(cfg.feed != address(0), "feed=0");
    _feedDecimals[stock] = AggregatorV3Interface(cfg.feed).decimals();
    _configs[stock] = cfg;
    emit StockConfigured(stock, cfg.feed, cfg.multiplierEmbedded, cfg.maxAgeRegular, cfg.maxAgeExtended);
}
```

### 1.4 Perbaiki halt per saham

```solidity
function setMarketHalt(address stock, bool halted) external onlyOwner {
    _halted[stock] = halted;                // hanya saham ini
}

function setGlobalHalt(bool halted) external onlyOwner {
    _globalHalt = halted;                   // semua saham, darurat
}
```

### 1.5 `twapCheck` jujur

Selama TWAP Uniswap belum benar-benar dipasang, jangan pura-pura `ok = true`:

```solidity
function twapCheck(address) external pure override returns (uint256 twap, bool ok) {
    return (0, false); // belum dipasang; read() TIDAK boleh mem-pause buy hanya karena ini
}
```
Di UI dan dokumen, TWAP tetap ditulis **"belum aktif"**.

### 1.6 Mock hanya untuk testnet

Hapus `setMockPrice` dan `_mockPrices` dari `PriceGuard`. Untuk testnet, deploy **`MockAggregator`** (feed palsu yang bisa di-set) dan pasang sebagai `cfg.feed`. Dengan begitu kode PriceGuard testnet dan mainnet **sama persis**, yang beda cuma alamat feed.

`contracts/src/mocks/MockAggregator.sol`:

```solidity
contract MockAggregator is AggregatorV3Interface, Ownable {
    int256 public answer; uint256 public updatedAt; uint8 public immutable override decimals;
    string public override description;
    constructor(uint8 d, string memory desc) Ownable(msg.sender) { decimals = d; description = desc; }
    function set(int256 a) external onlyOwner { answer = a; updatedAt = block.timestamp; }
    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
```

---

## 2. Engine: sigma tidak lagi hardcode

`ArcumEngine.sol:79` `q.sigmaBps = 5000;` diganti parameter per saham yang di-set admin (tanpa bot):

```solidity
mapping(address => uint64) public sigmaBpsOf;   // default 5000 kalau 0
event SigmaSet(address indexed stock, uint64 bps);

function setSigma(address stock, uint64 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(bps >= 500 && bps <= 20_000, "sigma out of range");
    sigmaBpsOf[stock] = bps;
    emit SigmaSet(stock, bps);
}

// di quote():
uint64 sig = sigmaBpsOf[s.stock];
q.sigmaBps = sig == 0 ? 5000 : sig;
```
Admin cukup update sigma sesekali (misalnya seminggu sekali), bukan setiap 15 menit.

> ArcumEngine **bukan proxy**. Perubahan ini butuh redeploy engine dan router (sudah dibahas di KODE_PERBAIKAN §9). Untuk mainnet, ini tidak masalah karena deploy dari nol.

---

## 3. Keeper: berhenti memposting harga dan vol

`app/src/keeper/run.ts`:
- **Hapus** semua posting harga (`setMockPrice`) dan vol. Di mainnet, harga diurus Chainlink.
- `accrueMany` + `poke`: jalankan **hanya kalau ada posisi terbuka**, dan **hanya di jam sesi** (REGULAR/EXTENDED). Interval **1 jam**, bukan 15 menit.
- Cek dulu apakah `buy`/`sell`/`shield` sudah memanggil accrue untuk seri yang disentuh (lazy accrue). Kalau sudah, keeper hanya jadi cadangan.

```ts
const INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS ?? 60 * 60 * 1000);

async function tick() {
  const session = await pub.readContract({ address: C.priceGuard, abi: PriceGuardAbi, functionName: 'getMarketSession' });
  // SessionKind: REGULAR=0, EXTENDED=1, CLOSED=2, UNKNOWN=3, HALTED=4 — lihat src/libs/OptionTypes.sol:5.
  // Contoh lama di dokumen ini memakai 3 sebagai HALTED; itu salah (3 = UNKNOWN), dan 3 bisa muncul di luar jam bursa.
  if (session === 2 /* CLOSED */ || session === 4 /* HALTED */) return log('skip: market closed');

  const ids = await openSeriesIds();               // hanya seri dengan totalSupply > 0
  if (ids.length === 0) return log('skip: no open positions');

  const hash = await wallet.writeContract({ address: C.engine, abi: ArcumEngineAbi, functionName: 'accrueMany', args: [ids] });
  log('accrue', ids.length, hash);
}
setInterval(tick, INTERVAL_MS);
```

Keeper yang ada sekarang (`app/src/keeper/run.ts`) sudah memenuhi bentuk ini: `accrueMany` saja, `MIN_ELAPSED = 3600n`, `BATCH = 20`, cek `getMarketSession()` di awal `tick()` (berhenti kalau bukan `REGULAR`/`EXTENDED`), dan `KEEPER_PRIVATE_KEY` **wajib** ada — tanpa itu proses berhenti saat load, tidak jalan dengan key default. Key hardcoded sudah dihapus. Template env: `app/.env.example`.

Per 2026-11-20 keeper juga sudah diubah agar cocok dengan dua aturan di atas yang tadinya belum dipegang:

| Aturan | Sebelum | Sesudah | Bukti |
|---|---|---|---|
| Hanya seri dengan posisi terbuka | accrue semua seri `!archived` (11 seri di `46630`, 8 di antaranya `totalSupply == 0`) | baca `totalSupply()` dari `series.token`, lewati kalau `0` | `dueSeries(now)` mengembalikan 3 seri, bukan 11 |
| Interval 1 jam dari env | `15 * 60 * 1000` hardcoded | `KEEPER_INTERVAL_MS`, default `3600000` | `run.ts`, `app/.env.example` |
| Pratinjau tanpa tanda tangan | tidak ada | `KEEPER_DRY_RUN=true` mencatat seri yang akan di-accrue | `app/.env.example`, `package.json` script `keeper` |
| Jadwal otomatis | tidak ada, harus manual | Windows Task Scheduler `ArcumKeeper` tiap jam | `app/ops/install-keeper-task.ps1`, log `app/logs/keeper.log` |

Satu bug ditemukan saat memasang jadwal, dan itu jenis bug yang paling berbahaya untuk keeper: `bun run keeper` tanpa `RUN_KEEPER_DAEMON=true` **tidak memanggil `tick()` sama sekali** — proses keluar dengan kode 0, log terlihat sukses, dan tidak ada yang di-accrue. Task Scheduler akan melaporkan "task completed successfully" selamanya. Perbaikannya: cabang non-daemon sekarang `await tick()` (satu putaran per pemanggilan), dan jadwalnya dipegang Task Scheduler, bukan `setInterval`, supaya proses yang mati di-restart oleh scheduler.

Gas terukur: 11 seri = `643.980` (tx `0xe1cec46c…d67d2`), 3 seri = `200.199` (tx `0x52b959fe…0992`). Selisih `443.781` gas (68,9%) adalah biaya meng-accrue seri yang tidak punya posisi.

### 3.1 Vol tetap harus diposting — tapi bukan oleh keeper accrual

Harga diurus Chainlink, vol tidak. `VolOracle` hanya menerima reading dari alamat yang di-allowlist pemilik (`isPublisher`). Poster-nya `vol-engine/post_vol.py`:

```bash
cd vol-engine
python fetch_prices.py                       # close harian nyata -> data/nvda_daily.json dst.
python post_vol.py --symbols NVDA,AAPL,QQQ   --prices NVDA=data/nvda_daily.json   --prices AAPL=data/aapl_daily.json   --prices QQQ=data/qqq_daily.json --ttl 3600
```

`fetch_prices.py` ada karena `post_vol.py` **menolak** menghitung sigma tanpa riwayat harga (exit 4). Sumbernya Yahoo Finance chart API (`/v8/finance/chart/<SYM>?range=1y&interval=1d`), yaitu close harian dari bursanya sendiri, bukan angka karangan. Tiap file menyimpan `source`, `fetchedAtUtc`, `closeCount`, `firstClose`, `lastClose`, dan seluruh `closes` supaya angka yang diposting bisa diaudit ulang.

Hasil nyata 2026-11-20 (251 sesi per simbol): NVDA 38,85%, AAPL 25,00%, QQQ 21,67% — tx `0x8091d5e7…d439` di `46630`, gas 187.395, dan `sigmaFor()` sekarang `(3885,true)`, `(2500,true)`, `(2167,true)`.

Supaya ini tidak berhenti sebagai satu kali jalan manual, `vol-engine/publish_once.py` membungkus dua langkah itu jadi satu siklus (fetch → post) dan **tidak** menyimpan key di dalam file: key dibaca dari `app/.env`. Jadwalnya `vol-engine/ops/install-vol-task.ps1` → Windows Task Scheduler `ArcumVol`, tiap 30 menit, log `app/logs/vol.log`.

Kenapa 30 menit dan bukan 60: setiap reading membawa `validUntil = now + TTL` (3600 s). Kalau poster hanya jalan sekali sejam, satu kegagalan saja membuat oracle kedaluwarsa dan `ArcumEngine` menolak semua beli baru dengan `StaleVol` sampai jam berikutnya. Dua percobaan per TTL menyerap satu kegagalan, bukan mengubahnya jadi gangguan. Bukti jadwal ini nyata: `ArcumVol` dijalankan manual → tx `0xdab291cc…a236`, blok 155884210, gas 76.395, dan `sigmaFor` masih `(3885,true)`/`(2500,true)`/`(2167,true)` sesudahnya.

Poster ini menolak jalan kalau: publisher key tidak ada, alamat bukan publisher, stock belum di-`setVolConfig`, atau tidak ada riwayat harga. Semua itu memang disengaja — keeper yang "sehat" tapi tidak pernah memposting apa pun lebih berbahaya daripada keeper yang berhenti.
Urutan enum `SessionKind`: `REGULAR=0, EXTENDED=1, CLOSED=2, UNKNOWN=3, HALTED=4` (`contracts/src/libs/OptionTypes.sol:5`). Contoh lama di atas memakai `3` sebagai CLOSED/HALTED — itu salah; `3` adalah `UNKNOWN`.
**Testnet:** bot boleh tetap meng-update `MockAggregator.set()`, dengan ETH dari **faucet** (bukan ETH asli).

---

## 4. Deploy script

### Testnet (`DeployTestnet.s.sol`)
```solidity
MockAggregator nvdaFeed = new MockAggregator(8, "NVDA / USD (mock)");
nvdaFeed.set(142_50000000); // $142.50, 8 desimal
priceGuard.setStock(address(nvda), IPriceGuard.StockConfig({
    feed: address(nvdaFeed), multiplierEmbedded: true,
    maxAgeRegular: 1 days, maxAgeExtended: 3 days, continuityBps: 2000, enabled: true
}));
```

### Mainnet (`DeployMainnet.s.sol`, baru)
```solidity
// Alamat dari docs resmi, dicek on-chain sebelum deploy
address constant NVDA_TOKEN = /* stock token NVDA resmi Robinhood Chain */;
address constant NVDA_FEED  = /* Chainlink NVDA / USD di Robinhood Chain */;

priceGuard.setStock(NVDA_TOKEN, IPriceGuard.StockConfig({
    feed: NVDA_FEED, multiplierEmbedded: true,
    maxAgeRegular: /* heartbeat feed + margin, lihat docs */,
    maxAgeExtended: /* lebih longgar */,
    continuityBps: 2000, enabled: true
}));
```
- `maxAge` diambil dari **heartbeat resmi feed** (lihat halaman feed), lalu ditambah margin. Jangan ditebak.
- Mulai dengan **NVDA saja**, tambah saham lain setelah demo jalan.
- Tanpa MockUSDG dan MockStock. Pakai USDG asli `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`.

---

## 5. Test wajib

`contracts/test/PriceGuardChainlink.t.sol`:

| Test | Harus |
|---|---|
| Harga normal (8 desimal) | `s` = answer × 1e10, `fresh = true` |
| Feed 18 desimal | `s` = answer apa adanya |
| `updatedAt` lebih lama dari `maxAge` | `fresh = false`, `buysPaused = true`, **tidak revert** |
| `answer <= 0` | `fresh = false`, tidak revert |
| Feed revert | `fresh = false`, tidak revert (try/catch) |
| Stock tidak dikenal | revert `StockUnknown` |
| `setMarketHalt(NVDA)` | NVDA HALTED, **TSLA tetap normal** |
| `updatedAt` di hasil `read` | sama dengan `updatedAt` feed, bukan `block.timestamp` |
| Engine `quote` dengan feed basi | `buyable = false` |
| Sigma | `setSigma` berubah sehingga `quote.sigmaBps` ikut berubah, dan di luar range revert |

**Fork test mainnet** (`contracts/test/fork/Mainnet4663.t.sol`, read-only, tanpa broadcast):
```solidity
function test_chainlink_nvda_live() public {
    vm.createSelectFork(vm.envString("RH_MAINNET_RPC"));
    AggregatorV3Interface f = AggregatorV3Interface(NVDA_FEED);
    assertEq(f.description(), "NVDA / USD");
    (, int256 a,, uint256 upd,) = f.latestRoundData();
    assertGt(a, 0);
    assertGt(upd, 0);
}
```

---

## 6. Cek akhir

```bash
grep -rn "setMockPrice\|_mockPrices" contracts/src     # harus kosong (hanya di mocks/)
grep -rn "sigmaBps = 5000" contracts/src               # harus kosong
grep -rn "latestRoundData" contracts/src               # harus ada di PriceGuard
cd contracts && forge test                              # semua lulus
RH_MAINNET_RPC=https://rpc.mainnet.chain.robinhood.com forge test --match-path test/fork/Mainnet4663.t.sol
```

**Bukti yang dilaporkan:**
1. Hasil `forge test` lengkap.
2. Output fork test, termasuk `description()` dan harga NVDA dari feed.
3. Alamat feed dan sumbernya (link docs).

---

## 7. Yang tidak boleh

- Menebak alamat feed, atau mengambilnya dari `deployments/4663.json` (itu alamat Lemniscate).
- Mengalikan harga feed dengan multiplier lagi.
- `updatedAt = block.timestamp`.
- Fallback ke harga hardcode kalau feed gagal. Yang benar: `fresh = false`.
- Menulis "TWAP aktif" atau "vol engine live" sebelum benar-benar jalan.
- Mengirim private key keeper lewat chat. Key diisi sendiri di `app/.env` server, dan file itu masuk `.gitignore`.
