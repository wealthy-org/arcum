from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = Path('reports/ARCUM_TESTING_COST_REPORT.pdf')
try:
    pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
except Exception:
    pass

FONT, BOLD = 'Arial', 'Arial-Bold'
NAVY, GOLD, TEXT, MUTED = HexColor('#14213D'), HexColor('#B88A44'), HexColor('#202633'), HexColor('#5D687B')
PALE, GREEN, RED = HexColor('#F4F6F9'), HexColor('#EAF6EF'), HexColor('#FFF0F0')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleID', fontName=BOLD, fontSize=23, leading=27, textColor=NAVY, alignment=TA_CENTER, spaceAfter=3))
styles.add(ParagraphStyle(name='SubtitleID', fontName=FONT, fontSize=10, leading=14, textColor=MUTED, alignment=TA_CENTER, spaceAfter=16))
styles.add(ParagraphStyle(name='SectionID', fontName=BOLD, fontSize=13, leading=17, textColor=NAVY, spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle(name='BodyID', fontName=FONT, fontSize=9.15, leading=13.5, textColor=TEXT, spaceAfter=5))
styles.add(ParagraphStyle(name='SmallID', fontName=FONT, fontSize=7.7, leading=10.5, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name='CalloutID', fontName=BOLD, fontSize=10.2, leading=15, textColor=NAVY, backColor=PALE, borderColor=GOLD, borderWidth=1, borderPadding=9, spaceAfter=8))
styles.add(ParagraphStyle(name='RiskID', fontName=FONT, fontSize=9.1, leading=13.5, textColor=TEXT, backColor=RED, borderColor=HexColor('#D98C8C'), borderWidth=.6, borderPadding=7, spaceAfter=7))

def P(text, style='BodyID'):
    return Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GOLD); canvas.setLineWidth(.6); canvas.line(18*mm, 14*mm, 192*mm, 14*mm)
    canvas.setFont(FONT, 7); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 9*mm, 'ARCUM | Laporan Estimasi Biaya Testing Fitur')
    canvas.drawRightString(192*mm, 9*mm, f'Halaman {doc.page}')
    canvas.restoreState()

def make_table(rows, widths, highlight=None, note_rows=()):
    table = Table(rows, colWidths=widths, repeatRows=1)
    commands = [
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), BOLD), ('FONTNAME', (0,1), (-1,-1), FONT),
        ('FONTSIZE', (0,0), (-1,-1), 8.0), ('GRID', (0,0), (-1,-1), .35, HexColor('#CBD2DF')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, PALE]), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]
    for r in note_rows:
        commands += [('TEXTCOLOR', (0,r), (-1,r), MUTED)]
    if highlight is not None:
        commands += [('BACKGROUND', (0,highlight), (-1,highlight), GREEN), ('FONTNAME', (0,highlight), (-1,highlight), BOLD)]
    table.setStyle(TableStyle(commands))
    return table

story = [
    P('ARCUM', 'TitleID'),
    P('Laporan Estimasi Biaya Testing Fitur On-Chain', 'TitleID'),
    P('Untuk Tinjauan Manajemen | 15 November 2026', 'SubtitleID'),
    P('Ringkasan eksekutif', 'SectionID'),
    P('<b>Biaya gas testing sangat kecil.</b> Satu siklus pengujian penuh (approve, buy, sell, shield, deposit, withdraw, policy, revoke) diperkirakan <b>0,000063 ETH atau sekitar Rp2.240</b>. Sweep lengkap seluruh skenario E1-E10 diperkirakan <b>0,00012 - 0,00016 ETH atau Rp4.300 - Rp5.700</b> pada gas price live 0,02 gwei.', 'CalloutID'),
    P('<b>Rekomendasi top-up gas untuk fase testing: 0,001 ETH (sekitar Rp35.500).</b> Cukup untuk puluhan siklus pengujian termasuk buffer retry. Angka premium opsi dalam USDG adalah modal kerja, terpisah dari gas.', 'CalloutID'),
    P('Status data', 'SectionID'),
    make_table([
        ['Aspek', 'Status', 'Keterangan'],
        ['Gas price mainnet 0,02 gwei', 'TERVERIFIKASI', 'RPC live via VPN, eth_gasPrice 0x1312d00'],
        ['Gas buy, deposit, policy, revoke', 'TERVERIFIKASI', 'Dibaca dari receipt transaksi testnet nyata'],
        ['Gas sell, shield, withdraw', 'SIMULASI LOKAL', 'Dari forge test, belum ada receipt testnet'],
        ['Deployment mainnet', 'BELUM DILAKUKAN', 'Laporan ini hanya estimasi testing'],
    ], [48*mm, 34*mm, 78*mm]),
    P('1. Gas Per Fitur (Data Riil Testnet)', 'SectionID'),
    P('Sumber: <font name="Courier">eth_getTransactionReceipt</font> dari 11 transaksi nyata di Robinhood Chain Testnet 46630, dikonversi ke gas price mainnet 0,02 gwei. Kurs: 1 ETH = Rp35.500.000.'),
    make_table([
        ['Fitur / Transaksi', 'Gas', 'ETH @0,02 gwei', 'Rupiah', 'Sumber'],
        ['Transfer gas antar wallet', '21.000', '0,00000021', 'Rp8', 'Receipt testnet'],
        ['Mint faucet USDG', '50.973', '0,00000102', 'Rp4', 'Receipt testnet'],
        ['Mint faucet token saham', '51.009', '0,00000102', 'Rp4', 'Receipt testnet'],
        ['Approve USDG (per kontrak)', '45.921', '0,00000092', 'Rp3', 'Receipt testnet'],
        ['SetPolicy agent', '186.224', '0,00000372', 'Rp13', 'Receipt testnet'],
        ['Revoke agent', '28.445', '0,00000057', 'Rp2', 'Receipt testnet'],
        ['Buy opsi NVDA Up', '312.049', '0,00000624', 'Rp22', 'Receipt testnet'],
        ['Sell opsi', '538.735', '0,00001077', 'Rp38', 'Forge test'],
        ['Shield (beli proteksi)', '339.221', '0,00000678', 'Rp24', 'Forge test'],
        ['Deposit pool (mint AWP)', '1.023.032', '0,00002046', 'Rp73', 'Receipt testnet'],
        ['Withdraw queue penuh', '676.943', '0,00001354', 'Rp48', 'Forge test'],
    ], [50*mm, 24*mm, 30*mm, 22*mm, 36*mm], note_rows=(8,9,11)),
    P('Baris berwarna redup berarti angka berasal dari simulasi forge test lokal, bukan receipt on-chain. Gas mainnet dapat bergeser sekitar 20% karena perbedaan state dan storage.', 'SmallID'),
    P('2. Total Skenario Testing', 'SectionID'),
    make_table([
        ['Skenario', 'Total gas', 'ETH @0,02 gwei', 'Rupiah'],
        ['Satu siklus penuh (8 fitur, 11 tx)', '3.150.000', '0,000063', 'Rp2.240'],
        ['Bukti kumulatif 11 tx testnet riil', '3.775.949', '0,000076', 'Rp2.681'],
        ['Sweep lengkap E1-E10 + retry', '6.000.000 - 8.000.000', '0,00012 - 0,00016', 'Rp4.300 - Rp5.700'],
        ['Rekomendasi top-up gas testing', '-', '0,00100', 'Rp35.500'],
    ], [62*mm, 42*mm, 34*mm, 30*mm], highlight=4),
    P('3. Pemisahan Modal Kerja dari Gas', 'SectionID'),
    P('Premium opsi dan deposit pool dibayar dalam <b>USDG</b>, bukan gas. Ini modal kerja yang beredar kembali sebagai posisi atau share, bukan biaya yang hilang.'),
    make_table([
        ['Kebutuhan', 'Nilai minimum', 'Keterangan'],
        ['Deposit pertama WriterPool', '1 USDG', 'Batas on-chain MIN_FIRST_DEPOSIT'],
        ['Contoh pembelian opsi di UI', '547,38 USDG', '10 token NVDA, termasuk premi dan holding cost'],
        ['Faucet testnet', 'Gratis', 'Mint USDG dan token saham tanpa biaya'],
        ['USDG mainnet', 'Riil', 'Harus disediakan terpisah dari ETH gas'],
    ], [50*mm, 38*mm, 72*mm]),
    P('4. Batasan Jadwal Sesi Pasar', 'SectionID'),
    P('Fungsi <font name="Courier">buy</font> dan <font name="Courier">shield</font> hanya aktif pada sesi REGULAR NYSE: <b>Senin-Jumat, 13:30-20:00 UTC (20:30-03:00 WIB)</b>. Di luar sesi, engine menolak dengan <font name="Courier">SessionBlocksBuys(CLOSED)</font>. Akhir pekan seluruh pembelian diblokir. Penjadwalan testing wajib mengikuti jendela ini.', 'RiskID'),
    P('5. Rekomendasi Anggaran Testing', 'SectionID'),
    make_table([
        ['Komponen', 'Nilai', 'Catatan'],
        ['Gas (ETH)', '0,001 ETH', 'Sekitar Rp35.500, puluhan siklus'],
        ['Modal kerja testnet', 'Gratis via faucet', 'Tidak perlu dana nyata'],
        ['Modal kerja mainnet (contoh)', '1.000 - 2.000 USDG', 'Sesuai ukuran posisi uji'],
        ['Total estimasi gas seluruh sesi', 'Rp4.300 - Rp5.700', 'Sweep E1-E10 termasuk retry'],
    ], [56*mm, 46*mm, 58*mm]),
    P('Rekomendasi akhir', 'SectionID'),
    P('<b>Gunakan 0,001 ETH untuk gas testing dan tentukan anggaran USDG modal kerja terpisah.</b> Prioritaskan penyelesaian rekaman UI E1-E10 saat sesi bursa aktif agar angka sell, shield, dan withdraw berpindah dari simulasi lokal ke bukti receipt on-chain. Deployment mainnet tetap menunggu oracle harga nyata dan persetujuan manajemen.', 'CalloutID'),
    P('Dasar bukti', 'SectionID'),
    P('Receipt transaksi testnet diverifikasi langsung melalui RPC pada sesi ini; gas simulasi dari eksekusi forge test lokal; gas price mainnet dari eth_gasPrice live via VPN; batas deposit dari konstanta MIN_FIRST_DEPOSIT pada WriterPool.sol; jadwal sesi dari PriceGuard.sol getMarketSession(). Semua nilai live dapat berubah dan wajib diambil ulang sebelum eksekusi.', 'SmallID'),
]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=15*mm, bottomMargin=19*mm, title='Laporan Estimasi Biaya Testing Fitur Arcum', author='Arcum Engineering Review')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
