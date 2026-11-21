# Champions Club — Business Client Workflow & RBAC (Milestone E)

This document details the corporate business client module, account linking, self-service access, and object-level permissions.

---

## 1. Overview & Data Model

Business Clients represent corporate companies, schools, tournament sponsors, and institutions that rent club facilities, purchase bulk memberships, or book corporate events.

### Data Structure (`business_clients`)
- `id`: UUID Primary Key
- `user_id`: UUID Foreign Key -> `users.id` (Unique, Nullable)
- `company_name`: Official legal organization name
- `contact_person`: Primary point of contact
- `email`: Corporate contact email
- `phone`: Contact number
- `billing_address`: Physical/billing address for invoice generation
- `tax_id_gstin`: Corporate tax identifier (e.g. GSTIN)
- `is_active`: Operational status flag

---

## 2. Authentication & Authorization Matrix

| Endpoint | Permitted Roles | Notes |
|---|---|---|
| `POST /api/v1/business-clients` | `owner` | Owner onboards corporate accounts |
| `GET /api/v1/business-clients` | `owner` | Owner corporate directory |
| `GET /api/v1/business-clients/{id}` | `owner`, linked `business_client` | Ownership check: client can only view own org |
| `PUT /api/v1/business-clients/{id}` | `owner` | Owner updates corporate terms/address |
| `GET /api/v1/business-clients/me` | `business_client` | Self-service profile retrieval |
| `GET /api/v1/business-clients/me/invoices` | `business_client` | Self-service billing history |

---

## 3. Strict Boundary Rules

1. **No Access to Other Clients:** A business client cannot query, view, or touch invoices belonging to other corporate clients or individual club members.
2. **Read-Only Invoicing:** Business clients cannot mark invoices paid, alter billed totals, create payment records, or cancel invoices.
3. **Staff Access Boundary:** Receptionists and Shop Staff cannot alter corporate client profiles or view confidential corporate contract terms unless granted explicit owner delegation.
