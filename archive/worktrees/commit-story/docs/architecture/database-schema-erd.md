# Sailorskills Suite - Database Schema ERD

**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Database:** Supabase PostgreSQL (fzygakldvvzxmahkdylq)
**Total Objects:** 54 tables + 4 views = 58 database objects

---

## Table of Contents

1. [Core Business Flow ERD](#core-business-flow-erd)
2. [Complete Schema by Service](#complete-schema-by-service)
3. [Shared Tables Detail](#shared-tables-detail)
4. [Foreign Key Relationships](#foreign-key-relationships)
5. [Views and Computed Tables](#views-and-computed-tables)

---

## Core Business Flow ERD

This diagram shows the primary tables involved in the core business flow: customer acquisition → service delivery → billing → customer portal.

```mermaid
erDiagram
    %% Core Business Entities
    customers ||--o{ boats : "owns"
    customers ||--o{ addresses : "has"
    customers ||--o{ service_orders : "places"
    customers ||--o{ invoices : "receives"
    customers ||--o{ customer_accounts : "authenticates"

    boats ||--o{ boat_owners : "has"
    boats ||--o{ service_orders : "for"
    boats ||--o{ service_logs : "has"
    boats ||--o{ boat_anodes : "has"
    boats ||--o{ youtube_playlists : "has"

    service_orders ||--o| service_logs : "completed_as"

    service_logs ||--o| invoices : "billed_as"

    invoices ||--o{ invoice_line_items : "contains"
    invoices ||--o{ payments : "paid_by"

    customer_accounts ||--o{ customer_boat_access : "accesses"
    customer_accounts ||--o{ customer_messages : "sends"
    customer_accounts ||--o{ service_requests : "creates"

    customer_boat_access }o--|| boats : "grants_access"

    %% Inventory
    anodes_catalog ||--o{ anode_inventory : "stocked_as"
    anodes_catalog ||--o{ boat_anodes : "installed"
    anode_inventory ||--o{ inventory_transactions : "tracked"

    boats ||--o{ boat_anode_types : "requires"
    boat_anode_types }o--|| anodes_catalog : "specifies"

    %% Table Definitions
    customers {
        uuid id PK
        text stripe_customer_id
        text email
        text name
        text phone
        date birthday
    }

    boats {
        uuid id PK
        uuid customer_id FK
        text name
        text make
        text model
        integer boat_year
        numeric length
        text hull_material
        integer propeller_count
    }

    service_orders {
        uuid id PK
        text order_number
        uuid customer_id FK
        uuid boat_id FK
        text service_type
        numeric estimated_amount
        text status
        date scheduled_date
    }

    service_logs {
        uuid id PK
        uuid boat_id FK
        uuid service_id FK
        uuid invoice_id FK
        date service_date
        text service_type
        text paint_condition_overall
        jsonb propellers
        jsonb anode_conditions
        jsonb photos
    }

    invoices {
        uuid id PK
        text invoice_number
        text customer_id FK
        uuid service_id FK
        uuid boat_id FK
        numeric amount
        text status
        timestamp issued_at
        timestamp paid_at
    }

    payments {
        uuid id PK
        uuid invoice_id FK
        uuid customer_id FK
        numeric amount
        text stripe_payment_intent_id
        text status
    }

    customer_accounts {
        uuid id PK
        text email
        text name
        text password_hash
        boolean is_admin
    }

    anodes_catalog {
        uuid id PK
        varchar boatzincs_id
        varchar name
        varchar sku
        varchar material
        numeric list_price
        boolean is_active
    }

    anode_inventory {
        uuid id PK
        uuid anode_id FK
        integer quantity_on_hand
        integer quantity_available
        text storage_location
    }

    boat_anodes {
        uuid id PK
        uuid boat_id FK
        uuid anode_catalog_id FK
        text location
        text condition
        date install_date
        integer quantity
    }
```

---

## Complete Schema by Service

### Estimator-Owned Tables (3 tables)

```mermaid
erDiagram
    service_orders {
        uuid id PK
        text order_number
        uuid customer_id FK
        uuid boat_id FK
        uuid marina_id FK
        text service_type
        numeric estimated_amount
        text status
        date scheduled_date
        jsonb service_details
    }

    service_types {
        uuid id PK
        text name
        text slug
        text description
        integer duration_minutes
        integer price_cents
        text category
        boolean active
    }

    pricing_settings {
        uuid id PK
        text setting_key
        jsonb setting_value
        text description
        timestamp updated_at
    }
```

### Operations-Owned Tables (10 tables)

```mermaid
erDiagram
    service_logs ||--o{ boat_service_flags : "generates"
    boats ||--o{ boat_service_schedules : "scheduled"
    boats ||--o{ scheduled_services : "has"
    boats ||--o{ paint_repaint_schedule : "needs"

    service_logs {
        uuid id PK
        text customer_id FK
        uuid boat_id FK
        uuid service_id FK
        uuid invoice_id FK
        date service_date
        time service_time
        text paint_condition_overall
        text paint_detail_keel
        text paint_detail_waterline
        text paint_detail_boot_stripe
        text growth_level
        jsonb propellers
        jsonb anode_conditions
        jsonb anodes_installed
        jsonb photos
        numeric total_hours
    }

    boat_service_schedules {
        uuid id PK
        uuid boat_id FK
        date start_month
        integer service_interval_months
        date next_scheduled_month
        text default_service_type
        boolean active
    }

    scheduled_services {
        uuid id PK
        uuid boat_id FK
        uuid boat_service_schedule_id FK
        date scheduled_date
        time scheduled_time
        text service_type
        text status
        text google_calendar_event_id
    }

    boat_service_flags {
        uuid id PK
        uuid boat_id FK
        text flag_type
        text severity
        text title
        text description
        text source_table
        uuid source_id
        boolean auto_generated
        boolean is_dismissed
    }

    paint_repaint_schedule {
        uuid id PK
        uuid boat_id FK
        date last_repaint_date
        date estimated_next_date
        text urgency_level
        numeric avg_paint_condition
        text trend
        boolean auto_calculated
    }

    service_conditions {
        uuid id PK
        uuid boat_id FK
        uuid order_id FK
        date service_date
        text paint_condition_overall
        text growth_level
        text thru_hull_condition
        text prop_condition
        numeric total_hours
        array photos
    }

    service_conditions_log {
        uuid id PK
        text customer_id FK
        uuid boat_id FK
        uuid service_id FK
        date service_date
        text service_type
        text paint_condition_overall
        jsonb anode_conditions
        jsonb anodes_installed
    }

    service_history {
        uuid id PK
        uuid order_id FK
        uuid boat_id FK
        date service_date
        text service_type
        text paint_condition
        integer anodes_replaced
        array photos
    }

    service_schedules {
        uuid id PK
        uuid customer_id FK
        uuid boat_id FK
        text service_type
        integer interval_months
        date scheduled_date
        boolean is_active
    }

    youtube_playlists {
        uuid id PK
        uuid boat_id FK
        text playlist_id
        text playlist_url
        boolean is_public
    }
```

### Billing-Owned Tables (5 tables)

```mermaid
erDiagram
    invoices ||--o{ invoice_line_items : "contains"
    invoices ||--o{ payments : "paid_by"

    invoices {
        uuid id PK
        text invoice_number
        text customer_id FK
        uuid service_id FK
        uuid boat_id FK
        numeric amount
        text currency
        text status
        timestamp issued_at
        timestamp due_at
        timestamp paid_at
        jsonb customer_details
        jsonb boat_details
        jsonb service_details
    }

    invoice_line_items {
        uuid id PK
        uuid invoice_id FK
        text description
        numeric quantity
        numeric unit_price
        numeric total
        text type
    }

    payments {
        uuid id PK
        uuid invoice_id FK
        uuid customer_id FK
        uuid service_order_id FK
        numeric amount
        text stripe_charge_id
        text stripe_payment_intent_id
        text status
        timestamp payment_date
    }

    invoices_legacy {
        uuid id PK
        uuid customer_id FK
        uuid order_id FK
        text invoice_number
        numeric labor_cost
        numeric materials_cost
        numeric tax
        numeric total
        text status
        date issued_date
    }

    customer_services {
        uuid id PK
        text customer_id FK
        uuid boat_id FK
        text service_type
        text frequency
        numeric base_price
        text status
        timestamp cancelled_at
    }
```

### Inventory-Owned Tables (14 tables)

```mermaid
erDiagram
    anodes_catalog ||--o{ anode_inventory : "stocked"
    anodes_catalog ||--o{ anode_price_history : "priced"
    anodes_catalog ||--o{ anode_tool_requirements : "requires"

    inventory_items ||--o{ inventory_transactions : "tracked"
    inventory_items ||--o{ item_suppliers : "supplied_by"
    inventory_items }o--|| item_categories : "categorized"

    inventory_suppliers ||--o{ item_suppliers : "supplies"
    inventory_suppliers ||--o{ purchase_orders : "fulfills"

    purchase_orders ||--o{ purchase_order_items : "contains"

    anodes_catalog {
        uuid id PK
        varchar boatzincs_id
        varchar name
        varchar sku
        varchar material
        varchar category
        numeric list_price
        numeric sale_price
        boolean is_on_sale
        text image_url
        boolean is_active
    }

    anode_inventory {
        uuid id PK
        uuid anode_id FK
        integer quantity_on_hand
        integer quantity_allocated
        integer quantity_available
        integer reorder_point
        text storage_location
        numeric average_cost
    }

    anode_price_history {
        uuid id PK
        uuid anode_id FK
        numeric list_price
        numeric sale_price
        timestamp recorded_at
    }

    anode_sync_logs {
        uuid id PK
        varchar sync_type
        varchar status
        integer items_processed
        integer items_added
        integer items_updated
        timestamp started_at
    }

    anode_tool_requirements {
        uuid id PK
        uuid anode_id FK
        uuid tool_id FK
        boolean is_required
        text notes
    }

    inventory_items {
        uuid id PK
        text sku
        text name
        text description
        uuid category_id FK
        integer quantity_on_hand
        integer quantity_available
        integer reorder_point
        text primary_location
        numeric unit_cost
        boolean is_active
    }

    inventory_transactions {
        uuid id PK
        text transaction_type
        uuid anode_id FK
        uuid item_id FK
        integer quantity
        numeric unit_cost
        text reference_type
        text reference_id
        text from_location
        text to_location
        timestamp transaction_date
    }

    inventory_suppliers {
        uuid id PK
        text name
        text contact_name
        text email
        text phone
        text website
        text account_number
        boolean is_active
        boolean is_preferred
    }

    item_categories {
        uuid id PK
        text name
        text description
        uuid parent_category_id FK
        integer sort_order
        boolean is_active
    }

    item_suppliers {
        uuid id PK
        uuid item_id FK
        uuid supplier_id FK
        text supplier_part_number
        numeric cost
        integer lead_time_days
        boolean is_primary
    }

    purchase_orders {
        uuid id PK
        text po_number
        uuid supplier_id FK
        text status
        date order_date
        date expected_date
        numeric total_amount
        text tracking_number
    }

    purchase_order_items {
        uuid id PK
        uuid po_id FK
        uuid anode_id FK
        uuid item_id FK
        integer quantity_ordered
        integer quantity_received
        numeric unit_cost
        numeric line_total
    }

    replenishment_list {
        uuid id PK
        uuid anode_id FK
        uuid item_id FK
        integer quantity_needed
        integer quantity_to_order
        text priority
        text source
        text status
        uuid po_id FK
    }

    replenishment_queue {
        uuid id PK
        text item_type
        uuid item_id FK
        integer quantity
        text priority
        text source
        text status
    }
```

### Portal-Owned Tables (5 tables)

```mermaid
erDiagram
    customer_accounts ||--o{ customer_boat_access : "grants"
    customer_accounts ||--o{ customer_messages : "sends"
    customer_accounts ||--o{ service_requests : "creates"
    customer_accounts ||--o{ notification_log : "receives"

    customer_boat_access }o--|| boats : "accesses"
    service_requests }o--|| boats : "for"
    customer_messages }o--|| boats : "about"

    customer_accounts {
        uuid id PK
        text email
        text name
        text phone
        text password_hash
        timestamp created_at
        timestamp last_login_at
        jsonb notification_preferences
        boolean magic_link_enabled
        boolean password_enabled
        boolean is_admin
    }

    customer_boat_access {
        uuid id PK
        uuid customer_account_id FK
        uuid boat_id FK
        timestamp granted_at
        boolean is_primary
    }

    customer_messages {
        uuid id PK
        uuid customer_account_id FK
        uuid boat_id FK
        text subject
        text message_text
        boolean is_from_admin
        timestamp read_at
        text attachment_url
    }

    service_requests {
        uuid id PK
        uuid customer_account_id FK
        uuid boat_id FK
        text request_type
        text service_type
        text priority
        date preferred_date
        time preferred_time
        text notes
        text status
        text admin_response
        date scheduled_date
    }

    notification_log {
        uuid id PK
        uuid customer_account_id FK
        text notification_type
        text channel
        text related_id
        text status
        timestamp sent_at
        jsonb metadata
    }
```

### Booking-Owned Tables (7 tables)

```mermaid
erDiagram
    bookings ||--o{ booking_history : "tracks"
    service_types ||--o{ bookings : "scheduled"

    bookings {
        uuid id PK
        uuid service_type_id FK
        text service_name
        timestamp booking_start
        timestamp booking_end
        text timezone
        text customer_name
        text customer_email
        text customer_phone
        text status
        text stripe_payment_intent_id
        integer amount_cents
        text google_calendar_event_id
        jsonb location_info
    }

    booking_history {
        uuid id PK
        uuid booking_id FK
        text changed_by
        text change_type
        jsonb old_values
        jsonb new_values
        timestamp created_at
    }

    booking_settings {
        uuid id PK
        text setting_key
        text setting_value
        text setting_type
        text description
    }

    availability_rules {
        uuid id PK
        integer day_of_week
        time start_time
        time end_time
        boolean is_available
    }

    blackout_dates {
        uuid id PK
        date start_date
        date end_date
        text reason
        boolean all_day
        time start_time
        time end_time
        boolean active
    }

    blocked_dates {
        uuid id PK
        date date
        text reason
    }

    business_hours {
        uuid id PK
        integer day_of_week
        time start_time
        time end_time
        boolean active
        text notes
    }
```

### Shared Core Tables

```mermaid
erDiagram
    customers ||--o{ boats : "owns"
    customers ||--o{ addresses : "has"
    customers ||--o{ boat_owners : "co-owns"

    boats ||--o{ boat_owners : "owned_by"
    boats ||--o{ boat_anodes : "has"
    boats ||--o{ boat_anode_types : "requires"

    boat_anode_types }o--|| anodes_catalog : "specifies"
    boat_anodes }o--|| anodes_catalog : "uses"

    customers {
        uuid id PK
        text stripe_customer_id
        text email
        text name
        text phone
        date birthday
        timestamp created_at
    }

    addresses {
        uuid id PK
        uuid customer_id FK
        text type
        text street
        text city
        text state
        text zip
    }

    boats {
        uuid id PK
        uuid customer_id FK
        text name
        text make
        text model
        integer boat_year
        numeric length
        text hull_material
        text marina
        text dock
        text slip
        integer propeller_count
        text plan_status
        boolean is_active
    }

    boat_owners {
        uuid id PK
        uuid boat_id FK
        uuid customer_id FK
        boolean is_primary
    }

    boat_anodes {
        uuid id PK
        uuid boat_id FK
        uuid anode_catalog_id FK
        text location
        text condition
        date install_date
        date last_service_date
        integer quantity
        jsonb replacement_history
    }

    boat_anode_types {
        uuid id PK
        uuid boat_id FK
        uuid anode_id FK
        integer quantity_required
        integer replacement_interval_months
        date last_replaced_date
    }

    marinas {
        uuid id PK
        text name
        text address
    }

    admin_users {
        uuid id PK
        text email
    }
```

---

## Shared Tables Detail

These 12 tables require cross-service coordination for schema changes (see TABLE_OWNERSHIP_MATRIX.md for coordination process).

| Table | Primary Owner | Writers | Key Relationships |
|-------|---------------|---------|-------------------|
| `customers` | Estimator | Estimator, Portal, Billing | → boats, addresses, service_orders, invoices |
| `boats` | Estimator | Estimator, Operations | → customers, service_logs, boat_anodes |
| `boat_owners` | Estimator | Estimator, Portal | → boats, customers |
| `boat_anodes` | Operations | Operations, Inventory | → boats, anodes_catalog |
| `boat_anode_types` | Operations | Operations, Inventory | → boats, anodes_catalog |
| `service_orders` | Estimator | Estimator, Operations | → customers, boats, service_logs |
| `service_logs` | Operations | Operations, Billing | → boats, service_orders, invoices |
| `service_requests` | Portal | Portal, Operations | → customer_accounts, boats |
| `addresses` | Estimator | Estimator, Portal | → customers |
| `marinas` | Estimator | Estimator, Operations | → (referenced by boats) |
| `customer_messages` | Portal | Portal, Operations | → customer_accounts, boats |
| `replenishment_list` | Inventory | Inventory, Operations | → anodes_catalog, inventory_items |
| `youtube_playlists` | Video | Operations, Video | → boats |

---

## Foreign Key Relationships

### Primary Keys
All tables use `uuid id` as primary key (generated by Supabase).

### Key Foreign Keys

**Customer → Boats:**
- `boats.customer_id` → `customers.id`
- `boat_owners.customer_id` → `customers.id`
- `boat_owners.boat_id` → `boats.id`

**Customer → Orders:**
- `service_orders.customer_id` → `customers.id`
- `service_orders.boat_id` → `boats.id`

**Orders → Service Logs:**
- `service_logs.boat_id` → `boats.id`
- `service_logs.service_id` → `service_orders.id` (optional)

**Service Logs → Invoices (Bi-directional):**
- `invoices.service_id` → `service_logs.id`
- `service_logs.invoice_id` → `invoices.id` (added migration 015)

**Invoices → Payments:**
- `payments.invoice_id` → `invoices.id`
- `invoice_line_items.invoice_id` → `invoices.id`

**Portal → Boats:**
- `customer_boat_access.customer_account_id` → `customer_accounts.id`
- `customer_boat_access.boat_id` → `boats.id`

**Inventory:**
- `anode_inventory.anode_id` → `anodes_catalog.id`
- `boat_anodes.anode_catalog_id` → `anodes_catalog.id`
- `inventory_transactions.anode_id` → `anodes_catalog.id`
- `inventory_transactions.item_id` → `inventory_items.id`

**Booking:**
- `bookings.service_type_id` → `service_types.id`
- `booking_history.booking_id` → `bookings.id`

---

## Views and Computed Tables

### Read-Only Views

```mermaid
erDiagram
    transaction_details {
        view "Joins invoices + payments + service_logs"
        uuid invoice_id
        text invoice_number
        uuid service_log_id
        uuid payment_id
        text customer_id
        uuid boat_id
        numeric amount
        text invoice_status
        text payment_status
        timestamp issued_at
        timestamp paid_at
    }

    inventory_value_report {
        view "Current inventory value by item"
        text item_type
        varchar name
        varchar sku
        integer quantity_on_hand
        numeric unit_cost
        numeric total_value
    }

    all_items_needing_reorder {
        view "Items below reorder point"
        text item_type
        uuid item_id
        varchar name
        varchar sku
        integer quantity_available
        integer reorder_point
        integer reorder_quantity
        numeric estimated_cost
    }

    v_boat_anodes_with_stock {
        view "Boat anodes with catalog + stock info"
        uuid id
        uuid boat_id
        text location
        text condition
        varchar catalog_name
        varchar catalog_sku
        numeric catalog_price
        integer stock_available
        text service_status
    }
```

### View Purposes

- **transaction_details:** Optimized for Portal transaction page (invoices + payments + service logs in one query)
- **inventory_value_report:** Dashboard reporting (total inventory value)
- **all_items_needing_reorder:** Inventory management (items to reorder)
- **v_boat_anodes_with_stock:** Operations packing lists (anodes needed + stock availability)

---

## Schema Statistics

- **Total Tables:** 54
- **Total Views:** 4
- **Foreign Keys:** ~45 relationships
- **Shared Tables (Multiple Writers):** 12 (22%)
- **Single-Owner Tables:** 42 (78%)

### Tables by Service

| Service | Table Count | Shared Tables |
|---------|-------------|---------------|
| Estimator | 3 | 3 (customers, boats, service_orders) |
| Operations | 10 | 5 (boats, service_logs, boat_anodes, boat_anode_types, youtube_playlists) |
| Billing | 5 | 1 (service_logs) |
| Inventory | 14 | 3 (boat_anodes, boat_anode_types, replenishment_list) |
| Portal | 5 | 3 (addresses, customer_messages, service_requests) |
| Booking | 7 | 0 |
| Video | 1 | 1 (youtube_playlists) |
| Dashboard | 0 (read-only) | 0 |

---

## Related Documentation

- [TABLE_OWNERSHIP_MATRIX.md](../../TABLE_OWNERSHIP_MATRIX.md) - Detailed ownership rules
- [MIGRATION_SUMMARY.md](../../MIGRATION_SUMMARY.md) - Schema change history
- [service-relationship-diagram.md](./service-relationship-diagram.md) - Service data flow

---

**Document Version:** 1.0
**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Next Review:** After major schema changes
