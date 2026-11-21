# Financial Reporting Definitions & Formulas (Milestone G)

## 1. Core Financial Principles

Financial metrics in the Champions Club Sports Club Management System are derived exclusively from actual persisted transactions recorded in Milestone E (Invoices, Payments, Allocations, Refunds) and Milestone F (Payroll Disbursements).

---

## 2. Accrual vs. Cash Accounting

| Concept | System Field | Data Source | Definition |
| :--- | :--- | :--- | :--- |
| **Accrual Revenue (Billed)** | `invoices_issued_value` | `invoices.total_amount` | Total legal receivables invoiced to customers during the selected period, excluding `draft`, `cancelled`, and `void` invoices. |
| **Accrual Receivables** | `outstanding_receivables` | `invoices.total_amount - invoices.amount_paid` | Current outstanding debt across all `issued` and `partially_paid` invoices as of report execution time. |
| **Gross Cash Collections** | `gross_customer_collections`| `payments.amount` | Total customer payments with `payment_status = 'successful'` received in the period. |
| **Cash Outflows (Refunds)** | `customer_refunds_value` | `payment_refunds.amount` | Total refunds returned to customers from processed payments during the period. |
| **Net Cash Collections** | `net_customer_collections` | $\text{Gross Collections} - \text{Refunds}$ | Effective liquid cash retained from customer transactions during the period. |

---

## 3. Double-Entry Allocations & Unallocated Balances

Under the double-entry payment architecture introduced in Milestone E:
- Money received is recorded as an unallocated `Payment`.
- Money applied to clear an obligation is recorded as a `PaymentAllocation`.
- Revocations or refunds reduce net allocation via `PaymentAllocationReversal`.

$$\text{Net Allocated Value} = \sum(\text{Allocated Amount}) - \sum(\text{Allocation Reversals})$$

$$\text{Unallocated Customer Balance} = \sum_{\text{all}}(\text{Successful Payments}) - \sum_{\text{all}}(\text{Net Allocations}) - \sum_{\text{all}}(\text{Refunds})$$

This guarantees that unapplied customer funds, prepaid credits, and unallocated corporate deposits are accounted for without inflating operating revenue.

---

## 4. Operating Expenses & Surplus Calculation

### 4.1 Recorded Operating Expenses
In Milestone G, the system's tracked operating expenses comprise actual employee payroll disbursements disbursed within the period:

$$\text{Recorded Operating Expenses} = \sum(\text{PayrollDisbursement.amount})$$

### 4.2 Estimated Operating Surplus
The executive metric is computed on a cash basis:

$$\text{Estimated Operating Surplus} = \text{Net Customer Collections} - \text{Recorded Operating Expenses}$$

### 4.3 Mandatory Statutory Disclaimer
Every response containing `estimated_operating_surplus` includes the explicit disclaimer:
> *"Estimated operating surplus based on recorded customer collections less staff payroll disbursements. Excludes unrecorded facility rent, utilities, equipment depreciation, and statutory tax obligations."*
