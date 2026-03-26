# 🟢 Besawit — Palm Agent & Agriculture Store Management System (FULL PRD)

## 1. Executive Summary
Besawit adalah sistem terintegrasi untuk mengelola:
- Pembelian & penjualan TBS
- Toko pertanian
- Inventory & stock control
- Hutang & piutang
- Reporting & dashboard

Tujuan:
- Digitalisasi operasional
- Kontrol margin & cashflow
- Mengurangi kesalahan manual
- Audit-ready system

---

## 2. Business Objectives
- Tracking margin real-time
- Kontrol hutang & piutang
- Monitoring stok akurat
- Efisiensi operasional
- Mengurangi fraud & error

---

## 3. Scope

### In Scope
- TBS Purchase & Sales
- Deduction & Return
- Store module
- Stock movement & stock take
- Financial (payables/receivables)
- Payment tracking
- Print & PDF
- WhatsApp (manual)

### Out of Scope
- AI prediction
- Mobile native app
- Bank integration

---

## 4. User Roles
- Owner
- Admin Sawit
- Admin Toko
- Finance
- Supervisor

---

## 5. Modules

### 5.1 Palm Agent

#### Purchase
- gross, tare, net (auto)
- price
- total
- biaya
- hutang petani

#### Sales
- factory
- reference purchase
- harga jual

#### Deduction
- sampah
- air
- pasir
- pelepah

#### Return
- qty
- reason
- action

#### Formula
net_final = net - deduction - return
margin = total_sales - total_buy - biaya

---

### 5.2 Store
- product
- purchase
- sales
- stock

---

### 5.3 Inventory

#### Stock Movement
- purchase_in
- sales_out
- adjustment

#### Stock Take
- system vs physical
- variance
- approval

---

### 5.4 Financial
- payables
- receivables
- payments
- cash ledger

---

### 5.5 Print
- hutang
- piutang
- invoice
- receipt

---

### 5.6 WhatsApp
- kirim hutang
- kirim invoice
- kirim receipt

---

## 6. Flow

### Sawit
Purchase → Sales → Deduction → Return → Margin → Payment

### Store
Purchase → Stock → Sales → Payment

### Inventory
Movement → Stock → Stock Take → Adjustment

---

## 7. UI/UX

- clean & professional
- mobile-friendly
- fast input
- auto calculation
- clear status
- summary visible

---

## 8. Validation

- no negative stock
- payment ≤ balance
- deduction ≤ net
- return ≤ net
- approval required

---

## 9. Audit

- user activity
- changes log
- print log
- WhatsApp log

---

## 10. Reporting

- transaksi harian
- margin
- hutang/piutang
- stock
- stock take
- laba rugi

---

## 11. Non Functional

- secure
- scalable
- fast
- backup harian

---

## 12. Tech Stack

- Next.js
- Node.js
- PostgreSQL
- Drizzle ORM
- Docker
- VPS

---

## 13. MVP

- transaksi sawit
- toko
- inventory
- stock take
- hutang/piutang
- pembayaran
- dashboard
- print
- WhatsApp manual

---

## 14. Phase 2

- auto WA
- barcode
- multi gudang
- approval flow
- analytics

---

## END
