# Tax Reporting Workflow & Deduplication (Milestone G)

## 1. Statutory Context

The Champions Club operates both point-of-sale retail outlets (Shop counter, Cafeteria kitchen) and invoicing workflows (Membership purchases, Court bookings, Corporate business clients).

Under Indian GST statutory guidelines, output tax must be computed on all taxable supplies without duplicate liability arising between Point-of-Sale receipts and corresponding legal tax invoices.

---

## 2. The Deduplication Architecture

When an order is completed in the Shop or Cafeteria:
1. An `Order` record is created with `subtotal`, `tax_amount`, and `total_amount`.
2. If the customer requests a formalized tax invoice, an `Invoice` record is created referencing `order_id = order.id`.

### The Double-Counting Hazard
If an analytics engine naively sums:
$$\text{Tax Liability} = \sum(\text{Orders.tax\_amount}) + \sum(\text{Invoices.tax\_amount})$$
the tax on invoiced retail orders would be doubled.

### The Resolution
Milestone G strictly partitions the output tax calculation into two mutually exclusive streams:

1. **Commerce Orders Stream**:
   Aggregates all non-cancelled retail orders (`order_type IN ('shop', 'cafeteria')`, `order_status != 'cancelled'`):
   $$\text{Commerce Taxable} = \sum(\text{Order.subtotal} - \text{Order.discount\_amount})$$
   $$\text{Commerce Tax} = \sum(\text{Order.tax\_amount})$$

2. **Direct Invoicing Stream**:
   Aggregates legal invoices issued during the period, **strictly filtering where `order_id IS NULL`**:
   $$\text{Direct Invoice Taxable} = \sum(\text{Invoice.subtotal} - \text{Invoice.discount\_amount}) \quad [\text{WHERE } \text{order\_id IS NULL}]$$
   $$\text{Direct Invoice Tax} = \sum(\text{Invoice.tax\_amount}) \quad [\text{WHERE } \text{order\_id IS NULL}]$$

3. **Total Output Tax Liability**:
   $$\text{Total Taxable Turnover} = \text{Commerce Taxable} + \text{Direct Invoice Taxable}$$
   $$\text{Total Output Tax Collected} = \text{Commerce Tax} + \text{Direct Invoice Tax}$$

---

## 3. Statutory Notice

All responses from `/api/v1/reports/tax/summary` and executive dashboard exports include:
> *"Summary represents calculated output GST liability from non-cancelled retail orders and direct non-order invoices. Does not constitute an audited GSTR-1 or GSTR-3B tax filing."*
