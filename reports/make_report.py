from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = Path('reports/ARCUM_MAINNET_DEPLOYMENT_COST_REPORT.pdf')
try:
    pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
except Exception:
    pass

FONT, BOLD = 'Arial', 'Arial-Bold'
NAVY, GOLD, TEXT, MUTED = HexColor('#14213D'), HexColor('#B88A44'), HexColor('#202633'), HexColor('#5D687B')
PALE, GREEN, RED = HexColor('#F4F6F9'), HexColor('#EAF6EF'), HexColor('#FFF0F0')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleID', fontName=BOLD, fontSize=24, leading=28, textColor=NAVY, alignment=TA_CENTER, spaceAfter=3))
styles.add(ParagraphStyle(name='SubtitleID', fontName=FONT, fontSize=10, leading=14, textColor=MUTED, alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle(name='SectionID', fontName=BOLD, fontSize=13, leading=17, textColor=NAVY, spaceBefore=13, spaceAfter=7))
styles.add(ParagraphStyle(name='BodyID', fontName=FONT, fontSize=9.15, leading=13.5, textColor=TEXT, spaceAfter=5))
styles.add(ParagraphStyle(name='SmallID', fontName=FONT, fontSize=7.7, leading=10.5, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name='CalloutID', fontName=BOLD, fontSize=10.2, leading=15, textColor=NAVY, backColor=PALE, borderColor=GOLD, borderWidth=1, borderPadding=9, spaceAfter=9))
styles.add(ParagraphStyle(name='RiskID', fontName=FONT, fontSize=9.1, leading=13.5, textColor=TEXT, backColor=RED, borderColor=HexColor('#D98C8C'), borderWidth=.6, borderPadding=7, spaceAfter=7))

def P(text, style='BodyID'):
    return Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GOLD); canvas.setLineWidth(.6); canvas.line(18*mm, 14*mm, 192*mm, 14*mm)
    canvas.setFont(FONT, 7); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 9*mm, 'ARCUM | Laporan Estimasi Deployment Mainnet')
    canvas.drawRightString(192*mm, 9*mm, f'Halaman {doc.page}')
    canvas.restoreState()

def make_table(rows, widths, highlight=None):
    table = Table(rows, colWidths=widths, repeatRows=1)
    commands = [
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), BOLD), ('FONTNAME', (0,1), (-1,-1), FONT),
        ('FONTSIZE', (0,0), (-1,-1), 8.2), ('GRID', (0,0), (-1,-1), .35, HexColor('#CBD2DF')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, PALE]), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]
    if highlight is not None:
        commands += [('BACKGROUND', (0,highlight), (-1,highlight), GREEN), ('FONTNAME', (0,highlight), (-1,highlight), BOLD)]
    table.setStyle(TableStyle(commands))
    return table

story = [
    P('ARCUM', 'TitleID'),
    P('Laporan Estimasi Biaya Deployment Mainnet', 'TitleID'),
    P('Untuk Tinjauan Manajemen | 15 November 2026', 'SubtitleID'),
    P('Ringkasan eksekutif', 'SectionID'),
    P('<b>Rekomendasi saldo wallet deployer: 0,005 ETH.</b> Pada gas price live <b>0,02 gwei</b> yang berhasil diverifikasi melalui RPC mainnet setelah VPN aktif, estimasi deployment 11 seri adalah <b>0,00262 ETH</b>, setara sekitar <b>Rp93.010</b> dengan kurs Rp35,5 juta per ETH.', 'CalloutID'),
    P('<b>Deployment belum dijalankan.</b> Laporan ini hanya berisi verifikasi koneksi, estimasi biaya, dan pemeriksaan kesiapan teknis. Tidak ada private key yang diminta, digunakan, atau disimpan.', 'CalloutID'),
    P('Status laporan', 'SectionID'),
    make_table([
        ['Aspek', 'Status', 'Keterangan'],
        ['Koneksi VPN', 'TERVERIFIKASI', 'RPC dapat diakses setelah VPN aktif'],
        ['RPC mainnet', 'TERVERIFIKASI', 'Endpoint merespons JSON-RPC'],
        ['Estimasi biaya', 'SEMENTARA', 'Total gas masih berasal dari perhitungan awal'],
        ['Deployment mainnet', 'BELUM DILAKUKAN', 'Tidak ada transaksi mainnet dijalankan'],
        ['Kesiapan produksi', 'BELUM SIAP', 'Oracle harga masih memakai mock price'],
    ], [43*mm, 38*mm, 79*mm]),
    P('1. Verifikasi RPC Mainnet', 'SectionID'),
    P('Endpoint yang diuji: <font name="Courier">https://rpc.mainnet.chain.robinhood.com</font>. Pengujian dilakukan setelah koneksi Cloudflare WARP/VPN aktif.'),
    make_table([
        ['Metode JSON-RPC', 'Nilai hasil', 'Interpretasi'],
        ['eth_chainId', '0x1237', 'Chain ID 4663 — Robinhood Chain Mainnet'],
        ['eth_blockNumber', '0x6dcaac2', 'Block 115.124.930 pada saat pengecekan'],
        ['eth_gasPrice', '0x1312d00', '20.000.000 wei = 0,02 gwei'],
    ], [43*mm, 47*mm, 70*mm]),
    P('Catatan: block number dan gas price berubah seiring waktu. Nilai tersebut perlu diambil ulang tepat sebelum deployment.', 'SmallID'),
    P('2. Estimasi Biaya Gas', 'SectionID'),
    P('Rumus yang digunakan: <font name="Courier">biaya ETH = jumlah gas × gas price</font>. Gas price 0,02 gwei sama dengan 0,00000000002 ETH per unit gas.'),
    make_table([
        ['Skenario', 'Estimasi gas', 'Biaya ETH', 'Estimasi rupiah'],
        ['Minimum demo + 4 seri NVDA', '125.000.000', '0,00250', 'Rp88.750'],
        ['Deployment + 11 seri', '131.000.000', '0,00262', 'Rp93.010'],
        ['Deployment + 50 seri', '163.000.000', '0,00326', 'Rp115.730'],
        ['Saldo rekomendasi', '-', '0,00500', 'Rp177.500'],
    ], [54*mm, 34*mm, 32*mm, 43*mm], highlight=4),
    P('Kurs yang digunakan: 1 ETH = Rp35.500.000. Nilai USD tidak dicantumkan karena kurs ETH/USD belum diverifikasi pada sesi ini.', 'SmallID'),
    P('3. Koreksi Angka pada Perhitungan Awal', 'SectionID'),
    P('Gambar perhitungan awal mencantumkan <b>131 juta gas</b> dan <b>0,00063 ETH</b>. Dua angka ini tidak konsisten dengan gas price live 0,02 gwei.'),
    P('<b>Perhitungan yang benar:</b> 131.000.000 × 0,02 gwei = <b>0,00262 ETH</b> = sekitar <b>Rp93.010</b>. Nilai 0,00063 ETH hanya setara sekitar 31,5 juta gas pada gas price yang sama.', 'RiskID'),
    P('Karena itu, angka Rp22.500 tidak boleh dipakai sebagai biaya final deployment sebelum sumber total gas diklarifikasi.', 'BodyID'),
    P('4. Penjelasan Teori Smart Contract', 'SectionID'),
    P('<b>Everlasting pricing.</b> <font name="Courier">EverlastingMath.sol</font> menyelesaikan persamaan Euler-Cauchy untuk menghitung nilai Call/Put tanpa expiry tetap. Test mencakup parity, ATM symmetry, batas Greeks, funding decay, dan differential parity.'),
    P('<b>Funding decay.</b> Unit efektif posisi mengikuti saldo token × <font name="Courier">norm</font>. Nilai norm turun terhadap waktu berdasarkan nilai waktu dan interval funding.'),
    P('<b>WriterPool.</b> Mengatur NAV, share vault, deposit lock, antrean withdrawal, klaim, reserve layer, dan perlindungan insolvency.'),
    P('<b>AgentRouter.</b> Membatasi agent melalui budget, batas per transaksi, masa berlaku, izin operasi, dan fungsi revoke.'),
    P('<b>Governance.</b> Komponen upgradeable menggunakan proxy. Produksi wajib memakai multisig dan timelock.'),
    P('5. Risiko dan Blocker Produksi', 'SectionID'),
    P('<b>Oracle harga — blocker utama.</b> <font name="Courier">contracts/src/PriceGuard.sol</font> masih membaca <font name="Courier">_mockPrices</font> melalui <font name="Courier">_readInternal()</font>. Fungsi <font name="Courier">setTwapSource()</font> baru menerbitkan event; sumber TWAP belum disimpan dan digunakan dalam pricing.', 'RiskID'),
    P('<b>IV masih hardcoded.</b> <font name="Courier">ArcumEngine.sol</font> memakai <font name="Courier">sigmaBps = 5000</font>, berarti IV 50% untuk quote. Ini belum menjadi volatility feed dinamis.'),
    P('<b>Fork test belum penuh.</b> Hasil lokal: 35 test lulus. Satu fork test gagal karena koneksi RPC testnet diputus. Ini kegagalan infrastruktur, bukan bukti fork test lulus.'),
    P('<b>Broadcast mainnet belum ada.</b> Direktori <font name="Courier">contracts/broadcast/</font> belum memiliki hasil deployment Arcum untuk chain 4663.'),
    P('6. Pemisahan Kebutuhan Dana', 'SectionID'),
    make_table([
        ['Kategori', 'Masuk estimasi gas?', 'Status'],
        ['Gas deployment', 'Ya', 'Sekitar Rp88.750–Rp115.730'],
        ['Buffer retry dan konfigurasi', 'Tidak', 'Dicadangkan dalam 0,005 ETH'],
        ['Seed liquidity WriterPool', 'Tidak', 'Keputusan modal terpisah'],
        ['Audit keamanan', 'Tidak', 'Belum termasuk'],
        ['Oracle, multisig, operasional', 'Tidak', 'Anggaran produksi terpisah'],
    ], [54*mm, 41*mm, 68*mm]),
    P('Rekomendasi Akhir', 'SectionID'),
    P('<b>Siapkan 0,005 ETH untuk wallet deployer pada rencana 11 seri.</b> Jangan melakukan deployment hanya berdasarkan laporan ini. Sebelum transaksi mainnet, lakukan rekonsiliasi total gas, siapkan script mainnet khusus, sambungkan oracle harga nyata, ulangi fork test melalui VPN, dan minta persetujuan eksplisit manajemen.', 'CalloutID'),
    P('Dasar bukti', 'SectionID'),
    P('Respons JSON-RPC dari operator setelah VPN aktif; source code pada <font name="Courier">contracts/src/</font>; artefak deployment testnet pada <font name="Courier">contracts/broadcast/DeployTestnet.s.sol/46630/run-latest.json</font>; dan hasil eksekusi test lokal pada sesi pemeriksaan ini. Nilai live wajib diambil ulang sebelum deployment.', 'SmallID'),
]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=15*mm, bottomMargin=19*mm, title='Laporan Estimasi Biaya Deployment Mainnet Arcum', author='Arcum Engineering Review')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
