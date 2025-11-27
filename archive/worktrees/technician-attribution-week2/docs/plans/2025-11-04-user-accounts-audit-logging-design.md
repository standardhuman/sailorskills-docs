# User Accounts & Audit Logging System - Design Document

**Date:** November 4, 2025
**Status:** Approved - Ready for Implementation
**Effort:** 4 weeks (Phase 1)
**Priority:** Critical - Q1 2026 Foundation

---

## Executive Summary

Foundation system for multi-user operations enabling safe onboarding of co-owners, technicians, and contractors with role-based permissions, comprehensive audit trails, and basic revenue attribution. Critical prerequisite for transitioning from solo operation to multi-user team.

**Phase 1 Scope (This Design):** User accounts, RBAC, audit logging, basic technician attribution
**Phase 2 (Q2 2026):** Complex multi-party revenue splits, commission automation

---

## Problem Statement

**Current State:**
- Single-user operation - no user accounts for staff
- Admin services (Operations, Billing, Inventory, Insight) use Supabase Auth but no role differentiation
- No audit trails - cannot determine who created/modified service logs, boats, invoices
- No accountability - actions are anonymous
- No way to attribute revenue to specific technicians
- Cannot safely onboard co-owners or contractors

**Business Need:**
- Transitioning from solo to multi-user: co-owners, technicians, contractors testing soon
- Need to track who does what work (accountability)
- Need to prevent unauthorized access to financial data (security)
- Need to attribute services to technicians (performance tracking, future commission basis)

**Blocking:**
- Q2 2026 Complex Revenue Splits system
- Strategic BI Insight service (needs technician attribution)
- Referral tracking (needs staff attribution)
- Multi-owner operations expansion

---

## Design Principles

1. **Database-First Security:** Server-side enforcement via Supabase RLS policies (can't be bypassed)
2. **Unified Auth:** One Supabase Auth system, differentiate staff vs. customers via metadata
3. **Automatic Audit:** Database triggers capture every change (zero manual effort)
4. **Job-Based Attribution:** Track technician per service for performance metrics (not hourly-based)
5. **Two-Phase Approach:** Basic attribution now, complex revenue splits later (lower risk, faster testing)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Auth                             │
│  auth.users (email/password + magic links)                   │
│  - user_meta_data.user_type: 'staff' | 'customer'           │
└────────────┬────────────────────────────────┬───────────────┘
             │                                 │
    ┌────────▼─────────┐              ┌───────▼────────┐
    │  users table     │              │ customers table │
    │  (internal staff)│              │ (portal clients)│
    │  + roles & perms │              │ + portal access │
    └────────┬─────────┘              └─────────────────┘
             │
    ┌────────▼──────────────────────────────────────────┐
    │         Supabase RLS Policies                      │
    │  - Check user_type = 'staff'                       │
    │  - Enforce role-based permissions                  │
    │  - Restrict data access by role                    │
    └────────┬──────────────────────────────────────────┘
             │
    ┌────────▼──────────────────────────────────────────┐
    │         Database Triggers                          │
    │  - Automatic audit logging on all tables           │
    │  - Capture user_id, action, changes, timestamp     │
    │  - Store in audit_logs table                       │
    └───────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

#### `users` table (Internal Staff)
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'technician', 'contractor', 'viewer')),
  user_type text NOT NULL CHECK (user_type IN ('owner', 'employee', 'contractor')),
  active boolean DEFAULT true,
  hire_date date,
  hourly_rate decimal(10,2), -- Optional reference, not used for payment (job-based compensation)
  phone text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Index for common queries
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

**Role Definitions:**
- **Owner:** Full access, can manage users, view all financials, modify any data
- **Admin:** Most access, can manage users (except Owner roles), view most financials
- **Technician:** Service execution, view assigned work, can't access financials
- **Contractor:** Limited to assigned work only, view own invoices, no financial visibility
- **Viewer:** Read-only access to operations data, no financials, no modifications

**User Types:**
- **Owner:** Brings their own client list, gets ownership percentage in Phase 2
- **Employee:** W-2 employee, fixed or commission-based
- **Contractor:** 1099 contractor, commission-based

#### `audit_logs` table (Comprehensive Tracking)
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  entity_type text NOT NULL, -- 'service_log', 'boat', 'invoice', etc.
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changes jsonb, -- { before: {...}, after: {...} }
  ip_address text,
  service_name text, -- 'operations', 'billing', 'inventory', 'insight', 'estimator'
  timestamp timestamptz DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_service_name ON audit_logs(service_name);
```

### Tracking Columns Added to ALL Core Tables

**Tables getting audit columns:**
- `service_logs`
- `boats`
- `boat_anodes`
- `invoices`
- `payments`
- `customers`
- `inventory`
- `service_orders`
- `scheduling_queue`
- `quotes` (Estimator)

**Columns added:**
```sql
ALTER TABLE service_logs ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN updated_by uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN created_at timestamptz DEFAULT NOW();
ALTER TABLE service_logs ADD COLUMN updated_at timestamptz DEFAULT NOW();

-- Repeat for all core tables
```

### Revenue Attribution Columns

**For Phase 1 (Basic Technician Attribution):**
```sql
-- Service logs: Track who performed the service
ALTER TABLE service_logs ADD COLUMN technician_id uuid REFERENCES users(id);

-- Invoices: Copy technician from service log for revenue attribution
ALTER TABLE invoices ADD COLUMN service_technician_id uuid REFERENCES users(id);

-- Note: total_hours already exists in service_logs (tracks actual time spent)
```

**For Phase 2 (Q2 2026 - Complex Revenue Splits):**
```sql
-- Will add: revenue_splits table for multi-party commission structures
-- Will add: commission rules at customer/boat level
-- Will add: automatic split calculations
-- (Not included in Phase 1 scope)
```

---

## Authentication Strategy

### Unified Supabase Auth Approach

**One Auth System, Two User Types:**

**Staff Users (`user_type = 'staff'`):**
- Stored in `users` table
- Has roles and permissions (owner, admin, technician, contractor, viewer)
- Access admin services (Operations, Billing, Inventory, Insight, Estimator)
- Full audit trail of actions

**Customer Users (`user_type = 'customer'`):**
- Stored in `customers` table
- Access portal only (service history, invoices, account management)
- No access to admin services
- Limited audit tracking (just their own data changes)

**Differentiation Method:**
```javascript
// Stored in auth.users.raw_user_meta_data
{
  user_type: 'staff', // or 'customer'
  role: 'technician', // for staff only
  full_name: 'John Doe'
}
```

**RLS policies check metadata:**
```sql
-- Admin service policy example
CREATE POLICY "staff_only_access" ON service_logs
  FOR ALL USING (
    (auth.jwt() ->> 'user_meta_data')::jsonb ->> 'user_type' = 'staff'
  );

-- Customer portal policy example
CREATE POLICY "customers_own_data" ON customers
  FOR SELECT USING (
    (auth.jwt() ->> 'user_meta_data')::jsonb ->> 'user_type' = 'customer'
    AND id = auth.uid()
  );
```

### Invitation & Onboarding Flow

**Inviting New Staff:**

1. **Owner/Admin goes to Operations → Settings → Team Management**
2. **Clicks "Invite Team Member"**
3. **Fills form:**
   - Email: john@example.com
   - Full Name: John Doe
   - Role: Technician (dropdown)
   - User Type: Employee / Contractor
   - Hire Date: (defaults to today)
   - Hourly Rate: (optional, for reference)
   - Phone: (optional)
4. **System sends Supabase magic link:**
   - Email with "Join Sailor Skills Team" link
   - Link includes metadata: `user_type=staff`, `role=technician`, `full_name=John Doe`
5. **New user clicks link:**
   - Sets password
   - Automatically creates record in `users` table via trigger
   - Redirected to Operations dashboard
6. **User sees role-appropriate interface:**
   - Technician sees: Service logs, boats, schedule
   - Technician doesn't see: Financial reports, user management, pricing settings

**Database Trigger (Auto-create users record):**
```sql
CREATE FUNCTION handle_new_staff_user() RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'user_type' = 'staff' THEN
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      user_type,
      active
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'role',
      NEW.raw_user_meta_data->>'user_type',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_staff_user();
```

---

## Role-Based Access Control (RBAC)

### Permission Matrix

| Feature | Owner | Admin | Technician | Contractor | Viewer |
|---------|:-----:|:-----:|:----------:|:----------:|:------:|
| **Operations** |
| View all service logs | ✅ | ✅ | ✅ | Own only | ✅ |
| Create service logs | ✅ | ✅ | ✅ | ✅ | ❌ |
| Modify any service log | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify own service log | ✅ | ✅ | ✅ | ✅ | ❌ |
| View all boats | ✅ | ✅ | ✅ | Assigned only | ✅ |
| Create/edit boats | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule services | ✅ | ✅ | ✅ | ❌ | ❌ |
| View schedule | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Billing** |
| View all invoices | ✅ | ✅ | ❌ | ❌ | ✅ |
| View own invoices | ✅ | ✅ | ✅ | ✅ | ✅ |
| Process payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify pricing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Complete services | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Inventory** |
| View inventory | ✅ | ✅ | ✅ | ✅ | ✅ |
| Place orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify inventory | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Insight (Dashboard)** |
| View all analytics | ✅ | ✅ | ❌ | ❌ | ✅ |
| View own performance | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Revenue by technician | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Estimator** |
| Create quotes | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all quotes | ✅ | ✅ | ❌ | ❌ | ✅ |
| Modify pricing | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** |
| Invite users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage any user | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage non-owner users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| View team list | ✅ | ✅ | ✅ | ✅ | ✅ |

### Two-Layer Permission Enforcement

#### Layer 1: Supabase RLS Policies (Server-Side - Cannot Be Bypassed)

**Example: Service Logs Access**
```sql
-- Owners and Admins see all service logs
-- Technicians and Contractors see only their own
-- Viewers see all (read-only)
CREATE POLICY "service_logs_select" ON service_logs
  FOR SELECT USING (
    auth.jwt() ->> 'user_meta_data'::jsonb ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin', 'viewer')
      OR technician_id = auth.uid()
    )
  );

-- Only techs/contractors can create service logs for themselves
CREATE POLICY "service_logs_insert" ON service_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'user_meta_data'::jsonb ->> 'user_type' = 'staff'
    AND get_user_role(auth.uid()) IN ('owner', 'admin', 'technician', 'contractor')
    AND (
      technician_id = auth.uid()
      OR get_user_role(auth.uid()) IN ('owner', 'admin')
    )
  );

-- Only owners/admins can update service logs
-- Techs can update their own logs
CREATE POLICY "service_logs_update" ON service_logs
  FOR UPDATE USING (
    auth.jwt() ->> 'user_meta_data'::jsonb ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin')
      OR (
        get_user_role(auth.uid()) IN ('technician', 'contractor')
        AND technician_id = auth.uid()
      )
    )
  );
```

**Example: Invoices Access**
```sql
-- Owners/Admins/Viewers see all invoices
-- Techs/Contractors see only invoices for their services
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    auth.jwt() ->> 'user_meta_data'::jsonb ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin', 'viewer')
      OR service_technician_id = auth.uid()
    )
  );

-- Only owners/admins can modify invoices
CREATE POLICY "invoices_write" ON invoices
  FOR ALL USING (
    auth.jwt() ->> 'user_meta_data'::jsonb ->> 'user_type' = 'staff'
    AND get_user_role(auth.uid()) IN ('owner', 'admin')
  );
```

**Helper Function:**
```sql
CREATE FUNCTION get_user_role(user_uuid uuid) RETURNS text AS $$
  SELECT role FROM users WHERE id = user_uuid;
$$ LANGUAGE sql STABLE;
```

#### Layer 2: UI Guards (Client-Side - UX Enhancement)

**Purpose:** Hide/disable features user can't access (cleaner UX)

**Implementation:**
```javascript
// Shared utility: /shared/src/auth/permissions.js
export function canUserAccess(feature, userRole) {
  const permissions = {
    'view_all_invoices': ['owner', 'admin', 'viewer'],
    'create_service_log': ['owner', 'admin', 'technician', 'contractor'],
    'modify_pricing': ['owner'],
    'manage_users': ['owner', 'admin'],
    'view_financials': ['owner', 'admin', 'viewer'],
    // ... full permission map
  };

  return permissions[feature]?.includes(userRole) || false;
}

// Usage in UI components
if (canUserAccess('view_all_invoices', currentUser.role)) {
  // Show "All Invoices" link
} else {
  // Hide it, show only "My Invoices"
}

// Conditional navigation items
const navItems = [
  { label: 'Dashboard', path: '/dashboard', roles: ['all'] },
  { label: 'Work', path: '/work', roles: ['all'] },
  { label: 'Customers', path: '/customers', roles: ['owner', 'admin'] },
  { label: 'Settings', path: '/settings', roles: ['owner', 'admin'] }
].filter(item =>
  item.roles.includes('all') || item.roles.includes(currentUser.role)
);
```

**Important:** UI guards are UX only. Server-side RLS policies are the real security boundary.

---

## Audit Logging Implementation

### Automatic Tracking via Database Triggers

**Trigger Function (Applied to All Core Tables):**
```sql
CREATE FUNCTION log_audit_trail() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    changes,
    ip_address,
    service_name,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('before', row_to_json(OLD))
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after', row_to_json(NEW))
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    END,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('app.service_name', true),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to all core tables
CREATE TRIGGER audit_service_logs
  AFTER INSERT OR UPDATE OR DELETE ON service_logs
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_boats
  AFTER INSERT OR UPDATE OR DELETE ON boats
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Repeat for: payments, customers, inventory, service_orders, boat_anodes, quotes, users
```

### Tables with Audit Triggers

**Critical Tables (Audit Everything):**
- `service_logs` - Who documented each service
- `boats` - Who added/modified boat records
- `boat_anodes` - Who tracked anode replacements
- `invoices` - Who created/modified invoices
- `payments` - Who processed payments
- `customers` - Who added/modified customer data
- `inventory` - Who modified inventory
- `service_orders` - Who scheduled services
- `scheduling_queue` - Who added to queue
- `users` - Who managed team members
- `quotes` - Who created estimates (Estimator)

### Audit Log Viewer UI

**Location:** Operations → Settings → Audit Logs (Owner/Admin only)

**Features:**
- **Filter by:**
  - User (dropdown: all team members)
  - Entity Type (service_log, boat, invoice, payment, etc.)
  - Date Range (last 7 days, 30 days, 90 days, custom)
  - Action Type (create, update, delete)
  - Service Name (operations, billing, inventory, etc.)
- **Search by:**
  - Entity ID (UUID or display value)
  - Customer name (searches related entities)
  - Boat name (searches related entities)
- **Display:**
  - Real-time feed (last 50 actions, auto-updates)
  - Paginated table (50 per page)
  - Columns: Timestamp, User, Action, Entity, Changes Summary, Service
  - Click row to expand full before/after JSON
- **Export:**
  - Export filtered results to CSV
  - Include: timestamp, user email, user name, action, entity type, entity ID, changes
  - Use case: Compliance audits, debugging, performance reviews

**Example Display:**
```
┌──────────────────────┬─────────────────────┬────────┬──────────────┬──────────────────────────────────┬────────────┐
│ Timestamp            │ User                │ Action │ Entity       │ Summary                          │ Service    │
├──────────────────────┼─────────────────────┼────────┼──────────────┼──────────────────────────────────┼────────────┤
│ 2025-11-04 10:23:15  │ brian@... (Owner)   │ CREATE │ service_log  │ Sea Breeze - diving, 2.5 hrs     │ Operations │
│ 2025-11-04 11:45:32  │ john@... (Contract) │ UPDATE │ invoice      │ #1234 total: $450 → $475         │ Billing    │
│ 2025-11-04 14:12:08  │ jane@... (Tech)     │ UPDATE │ boat_anode   │ Ocean Dream shaft: poor → new    │ Operations │
│ 2025-11-04 15:30:42  │ brian@... (Owner)   │ CREATE │ user         │ Added contractor: mike@...       │ Operations │
└──────────────────────┴─────────────────────┴────────┴──────────────┴──────────────────────────────────┴────────────┘
```

**Expand Row (Shows Full Changes):**
```json
{
  "before": {
    "invoice_number": "INV-1234",
    "amount": 450.00,
    "line_items": [...]
  },
  "after": {
    "invoice_number": "INV-1234",
    "amount": 475.00,
    "line_items": [...]
  }
}
```

---

## Revenue Attribution & Performance Tracking

### Phase 1: Basic Technician Attribution (Included in 4-Week Scope)

**Goal:** Track which technician performed which service for:
- Accountability (who did the work)
- Performance metrics (jobs completed, revenue generated)
- Foundation for Phase 2 commission calculations

**Data Captured:**

**At Service Completion (Billing service):**
1. Technician selects boat, enters service details
2. System automatically captures `technician_id = current_user.id`
3. Stores in `service_logs.technician_id`
4. When invoice generated, copies to `invoices.service_technician_id`

**Service Log Fields:**
- `technician_id` (uuid) - Who performed the service
- `total_hours` (decimal) - Time spent on service (tracked for reference, not payment basis)
- Standard fields: boat_id, service_date, service_type, etc.

**Invoice Fields:**
- `service_technician_id` (uuid) - Copied from service_logs.technician_id
- `amount` (decimal) - Total invoice amount
- `status` (paid, pending, overdue)
- `paid_at` (timestamptz) - When payment received

### Performance Metrics (Phase 1)

**Insight Dashboard Widgets:**

**1. Technician Performance Leaderboard**
- Revenue generated per technician (sum of paid invoices)
- Jobs completed per technician (count of service logs)
- Average job value per technician (revenue / job count)
- Jobs per week (velocity metric)
- Sort by: Revenue, Job Count, Average Value

**2. Revenue by Technician (Bar Chart)**
- X-axis: Technician names
- Y-axis: Total revenue
- Filter by: Date range (last 30 days, 90 days, YTD)
- Click bar to drill down to job list

**3. Individual Performance View**
- Each technician sees their own metrics:
  - Total revenue generated
  - Jobs completed
  - Average job value
  - Jobs per week trend (line chart)
  - Recent jobs list (last 10)

**Example Queries:**

```sql
-- Technician performance summary
SELECT
  u.full_name,
  u.role,
  COUNT(DISTINCT sl.id) as jobs_completed,
  SUM(i.amount) FILTER (WHERE i.status = 'paid') as total_revenue,
  AVG(i.amount) FILTER (WHERE i.status = 'paid') as avg_job_value,
  SUM(sl.total_hours) as total_hours_logged
FROM users u
LEFT JOIN service_logs sl ON sl.technician_id = u.id
LEFT JOIN invoices i ON i.service_technician_id = u.id
WHERE u.role IN ('technician', 'contractor')
  AND sl.service_date >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.full_name, u.role
ORDER BY total_revenue DESC NULLS LAST;

-- Individual technician detail
SELECT
  sl.service_date,
  b.boat_name,
  c.customer_name,
  sl.service_type,
  i.invoice_number,
  i.amount,
  i.status as payment_status,
  sl.total_hours
FROM service_logs sl
JOIN boats b ON b.id = sl.boat_id
JOIN customers c ON c.id = b.customer_id
LEFT JOIN invoices i ON i.service_technician_id = sl.technician_id
  AND i.service_date = sl.service_date
WHERE sl.technician_id = $1
ORDER BY sl.service_date DESC
LIMIT 20;
```

### What Phase 1 Does NOT Include

**Phase 2 (Q2 2026) Will Add:**
- Multi-party revenue splits (tech, owner, referrer, hub)
- Commission rules stored at customer/boat level
- Automatic commission calculations when invoice paid
- Variable split percentages per client/boat
- Commission reports by party
- Commission payment tracking

**For Phase 1:** Manual commission calculations in spreadsheets using exported data (technician, invoice amount, client owner, etc.)

---

## User Management Interface

**Location:** Operations → Settings → Team Management

### User List View

**Display:**
- Table with columns:
  - Name (sortable)
  - Email
  - Role (badge with color: Owner=purple, Admin=blue, Technician=green, Contractor=orange, Viewer=gray)
  - Type (Employee/Contractor)
  - Status (Active/Inactive badge)
  - Hire Date
  - Actions (Edit, Deactivate, View Activity)
- **Sort by:** Name, Role, Hire Date, Status
- **Filter by:** Role (dropdown), Type (Employee/Contractor), Status (Active/Inactive/All)
- **Search:** Name or email (text input, real-time filter)
- **Permissions:**
  - Owner: See all, edit all
  - Admin: See all, edit all except other owners
  - Others: See all (names/roles only), edit own profile only

### Invite New User

**Button:** "Invite Team Member" (top right)

**Modal Form:**
```
Invite Team Member
──────────────────
Email *: [                    ]
Full Name *: [                    ]
Role *: [Technician ▼]
         - Owner
         - Admin
         - Technician
         - Contractor
         - Viewer
User Type *: ( ) Employee  ( ) Contractor
Hire Date: [2025-11-04  📅]
Hourly Rate (optional): [$         ] (for reference only)
Phone (optional): [                    ]

                [Cancel]  [Send Invite]
```

**Validation:**
- Email: Must be valid, not already in system
- Full Name: Required
- Role: Required selection
- User Type: Required selection
- Hire Date: Defaults to today

**Flow:**
1. Owner/Admin fills form, clicks "Send Invite"
2. System calls Supabase Admin API to send magic link:
   ```javascript
   const { data, error } = await supabase.auth.admin.inviteUserByEmail(
     email,
     {
       data: {
         user_type: 'staff',
         role: selectedRole,
         full_name: fullName,
         user_type_detail: userType // 'employee' or 'contractor'
       },
       redirectTo: 'https://ops.sailorskills.com'
     }
   );
   ```
3. User receives email: "You've been invited to join Sailor Skills"
4. Clicks link, sets password, redirected to Operations
5. Database trigger creates record in `users` table automatically
6. User logs in, sees role-appropriate interface

### Edit User

**Click "Edit" on user row → Modal:**

```
Edit Team Member: John Doe
──────────────────────────
Email: john@example.com (read-only)

Full Name: [John Doe              ]
Role: [Technician ▼]
User Type: ( ) Employee  (•) Contractor
Hire Date: [2024-06-15  📅]
Hourly Rate: [$45.00     ]
Phone: [555-1234          ]
Status: (•) Active  ( ) Inactive

                [Cancel]  [Save Changes]
```

**What Can Be Changed:**
- Full Name, Role, User Type, Hire Date, Hourly Rate, Phone, Status
- Cannot change: Email (linked to auth.users)

**Permissions:**
- Owner: Can edit any user
- Admin: Can edit any user EXCEPT other Owners (can't change Owner roles, can't deactivate Owners)
- Others: Can only edit own profile (Name, Phone)

**Deactivate User:**
- Sets `active = false` in users table
- User can no longer log in (Supabase RLS blocks inactive users)
- Historical data preserved (service logs, audit trails still show their name)
- Can reactivate later

**View Activity:**
- Click "View Activity" → Opens Audit Logs filtered for this user
- Shows all actions this user has performed
- Useful for: Performance review, debugging, accountability checks

### User Profile (Self-Edit)

**Location:** Top right dropdown → "My Profile"

**Fields:**
- Full Name (editable)
- Email (read-only)
- Role (read-only badge)
- User Type (read-only)
- Phone (editable)
- Hire Date (read-only)
- Account created (read-only)

**Additional Sections:**
- **My Performance:**
  - Jobs completed this month
  - Total revenue generated
  - Average job value
  - Link to "View Detailed Performance" (opens Insight filtered for current user)
- **Change Password:**
  - Uses Supabase Auth password reset flow
- **Preferences:**
  - Theme: Light/Dark (future)
  - Notifications: Email preferences (future)

---

## Service Integration Plan

### 4-Week Rollout Strategy

#### Week 1: Foundation + Operations

**Database (Days 1-2):**
- Create `users` table
- Create `audit_logs` table
- Add tracking columns to all core tables (`created_by`, `updated_by`, `created_at`, `updated_at`)
- Add `technician_id` to `service_logs`
- Add `service_technician_id` to `invoices`
- Create audit logging triggers for all tables
- Create RLS policies for staff access
- Create helper functions (`get_user_role`, etc.)
- Migration script + testing

**Auth Integration (Days 2-3):**
- Configure Supabase Auth metadata handling
- Create trigger to auto-create `users` record on signup
- Update shared auth package to differentiate staff vs. customers
- Test invitation flow end-to-end

**Operations Service (Days 3-5):**
- **User Management UI:**
  - Team Management page (user list, invite, edit)
  - User profile page
  - Audit log viewer
- **Update existing features:**
  - Service log form: Capture current user as technician_id automatically
  - Boat detail: Show created_by, updated_by, last modified info
  - Schedule: Show who scheduled each service
  - All forms: Send current user_id in `created_by`/`updated_by` fields
- **RLS integration:**
  - Test technician seeing only their own service logs
  - Test contractor seeing only assigned boats
  - Test viewer read-only access
- **UI guards:**
  - Hide financial data from technicians
  - Hide user management from non-admins
  - Show role-appropriate navigation

**Testing:**
- Create test users: Owner, Admin, Technician, Contractor, Viewer
- Test permissions for each role
- Test audit logging captures all changes
- Test user invite flow

#### Week 2: Billing + Inventory

**Billing Service (Days 6-8):**
- **Update service completion flow:**
  - Auto-capture technician_id when completing service
  - Copy technician_id to invoice.service_technician_id on invoice creation
  - Show technician name on invoice display
- **RLS policies:**
  - Owners/Admins see all invoices
  - Technicians/Contractors see only their own invoices
  - Viewers see all (read-only)
- **UI updates:**
  - Invoice list: Add "Technician" column
  - Invoice detail: Show "Service performed by: John Doe"
  - Hide pricing controls from non-owners
- **Audit logging:**
  - Capture who processes payments
  - Capture who modifies invoices
  - Log all billing actions to audit_logs

**Inventory Service (Days 8-10):**
- **RLS policies:**
  - Contractors: View-only access
  - Technicians: View + use inventory (mark items used)
  - Owners/Admins: Full access (place orders, modify stock)
- **UI guards:**
  - Hide "Place Order" button for contractors/technicians
  - Hide "Modify Inventory" for non-admins
- **Audit logging:**
  - Log inventory modifications
  - Log stock orders
  - Capture who used which items (for future cost tracking)

**Testing:**
- Test technician completes service, sees own invoice
- Test contractor cannot see other contractors' invoices
- Test viewer can see financials but can't modify
- Test inventory view-only for contractors
- Test audit logs capture all billing/inventory actions

#### Week 3: Insight + Estimator

**Insight Service (Days 11-13):**
- **Technician Performance Widgets:**
  - Leaderboard: Revenue, jobs, avg value per technician
  - Revenue by Technician bar chart
  - Individual performance view (for techs to see own metrics)
- **RLS policies:**
  - Owners/Admins/Viewers see all analytics
  - Technicians/Contractors see only their own performance
  - Hide financial analytics from contractors
- **Queries:**
  - Performance summary by technician (last 30 days, 90 days, YTD)
  - Individual technician detail (job list with revenue)
- **UI guards:**
  - Hide full financial reports from non-owners/admins
  - Show "My Performance" to techs/contractors

**Estimator Service (Days 13-15):**
- **Track quote creation:**
  - Capture who creates each quote (`created_by`)
  - Capture who modifies pricing (`updated_by` in audit_logs)
- **RLS policies:**
  - Technicians can create quotes (for field estimates)
  - Contractors cannot create quotes
  - All staff can view quotes (for reference)
- **Audit logging:**
  - Log quote creation
  - Log pricing modifications
  - Log quote conversions to customers

**Testing:**
- Test Insight shows correct performance metrics
- Test technician sees only their own performance
- Test Estimator tracks quote creators
- Test audit logs capture quote/customer actions

#### Week 4: Testing, Polish & Onboarding

**Integration Testing (Days 16-18):**
- **Cross-service tests:**
  - Create service log in Operations → shows in Insight performance
  - Complete service in Billing → revenue attributed to correct tech
  - Invite new user → can log in and access appropriate features
  - Test all 5 roles across all 5 services (25 test combinations)
- **Permission boundary tests:**
  - Contractor tries to access financial reports (should fail)
  - Technician tries to modify another tech's service log (should fail)
  - Viewer tries to create invoice (should fail)
  - Admin tries to change Owner role (should fail)
- **Audit log tests:**
  - Verify all CRUD actions logged
  - Verify correct user_id, entity_type, changes captured
  - Test audit log viewer filtering and export

**Bug Fixes & Polish (Days 18-19):**
- Fix any permission gaps discovered in testing
- Polish user management UI (loading states, error handling)
- Polish audit log viewer (better formatting, more useful summaries)
- Improve error messages for permission denials
- Add helpful tooltips/explanations for roles

**Documentation (Day 19):**
- User guide: "Team Management for Owners"
- User guide: "Understanding Your Role & Permissions"
- Technical doc: "RLS Policies Reference"
- Technical doc: "Audit Logging Architecture"

**Real User Onboarding (Day 20):**
- Invite first real users (co-owners, initial contractors)
- Walk through invitation process
- Test with real workflows
- Gather feedback
- Make any critical fixes

**Go-Live:**
- Deploy to production
- Monitor for issues
- Support first users
- Iterate based on feedback

---

## Technical Implementation Details

### Shared Package Updates

**New modules in `/shared/src/auth/`:**

**`permissions.js`** - Permission matrix and checking:
```javascript
export const PERMISSIONS = {
  // Operations
  VIEW_ALL_SERVICE_LOGS: ['owner', 'admin', 'viewer'],
  CREATE_SERVICE_LOG: ['owner', 'admin', 'technician', 'contractor'],
  MODIFY_ANY_SERVICE_LOG: ['owner', 'admin'],
  MODIFY_OWN_SERVICE_LOG: ['owner', 'admin', 'technician', 'contractor'],
  VIEW_ALL_BOATS: ['owner', 'admin', 'technician', 'viewer'],
  CREATE_BOAT: ['owner', 'admin', 'technician'],
  SCHEDULE_SERVICE: ['owner', 'admin', 'technician'],

  // Billing
  VIEW_ALL_INVOICES: ['owner', 'admin', 'viewer'],
  PROCESS_PAYMENT: ['owner', 'admin'],
  MODIFY_PRICING: ['owner'],

  // Inventory
  VIEW_INVENTORY: ['owner', 'admin', 'technician', 'contractor', 'viewer'],
  PLACE_ORDER: ['owner', 'admin'],
  MODIFY_INVENTORY: ['owner', 'admin'],

  // Insight
  VIEW_ALL_ANALYTICS: ['owner', 'admin', 'viewer'],
  VIEW_FINANCIALS: ['owner', 'admin', 'viewer'],

  // User Management
  INVITE_USER: ['owner', 'admin'],
  MANAGE_USERS: ['owner', 'admin'],
  MANAGE_OWNER_ROLES: ['owner'],
  VIEW_AUDIT_LOGS: ['owner', 'admin']
};

export function canUserAccess(permission, userRole) {
  return PERMISSIONS[permission]?.includes(userRole) || false;
}

export function getUserPermissions(userRole) {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([permission]) => permission);
}
```

**`user-context.js`** - Current user management:
```javascript
import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user from Supabase
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata.user_type === 'staff') {
        // Fetch full user record with role
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(data);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useCurrentUser must be within UserProvider');
  return context;
}
```

**`ProtectedRoute.jsx`** - Route-level permission checks:
```javascript
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from './user-context';
import { canUserAccess } from './permissions';

export function ProtectedRoute({ permission, children }) {
  const { currentUser, loading } = useCurrentUser();

  if (loading) return <div>Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;
  if (permission && !canUserAccess(permission, currentUser.role)) {
    return <div>Access Denied</div>;
  }

  return children;
}
```

### Service-Specific Integration

**Each service adds:**

**1. User context initialization:**
```javascript
// In each service's main.js
import { UserProvider } from '/shared/src/auth/user-context.js';

document.addEventListener('DOMContentLoaded', () => {
  // Wrap app in UserProvider
  const root = document.getElementById('app');
  ReactDOM.render(
    <UserProvider>
      <App />
    </UserProvider>,
    root
  );
});
```

**2. Set current user in database context:**
```javascript
// Before any Supabase query, set user context
await supabase.rpc('set_current_user', { user_id: currentUser.id });

// Or use a wrapper:
async function withUserContext(fn) {
  await supabase.rpc('set_current_user', { user_id: currentUser.id });
  return fn();
}
```

**3. UI permission guards:**
```javascript
// Example: Hide financial data from technicians
import { canUserAccess } from '/shared/src/auth/permissions.js';

function InvoiceList() {
  const { currentUser } = useCurrentUser();
  const canViewAll = canUserAccess('VIEW_ALL_INVOICES', currentUser.role);

  return (
    <div>
      <h2>{canViewAll ? 'All Invoices' : 'My Invoices'}</h2>
      {/* ... */}
    </div>
  );
}
```

**4. Audit log integration:**
```javascript
// Audit logging happens automatically via database triggers
// Services just need to set created_by/updated_by fields:

async function createServiceLog(data) {
  const { currentUser } = useCurrentUser();

  const { data: serviceLog, error } = await supabase
    .from('service_logs')
    .insert({
      ...data,
      technician_id: currentUser.id, // Auto-capture technician
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  // Audit log entry created automatically by trigger
  return serviceLog;
}
```

---

## Migration Strategy

### Database Migration Script

**File:** `/migrations/015_user_accounts_audit_logging.sql`

```sql
-- Migration 015: User Accounts & Audit Logging System
-- Date: 2025-11-04
-- Description: Add user accounts, roles, RBAC, and comprehensive audit logging

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'technician', 'contractor', 'viewer')),
  user_type text NOT NULL CHECK (user_type IN ('owner', 'employee', 'contractor')),
  active boolean DEFAULT true,
  hire_date date,
  hourly_rate decimal(10,2),
  phone text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'Internal staff accounts with roles and permissions';
COMMENT ON COLUMN users.role IS 'Permission level: owner, admin, technician, contractor, viewer';
COMMENT ON COLUMN users.user_type IS 'Employment relationship: owner, employee, contractor';
COMMENT ON COLUMN users.hourly_rate IS 'Reference only, not used for job-based compensation';

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changes jsonb,
  ip_address text,
  service_name text,
  timestamp timestamptz DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_service_name ON audit_logs(service_name);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all data changes';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB with before/after values: {before: {...}, after: {...}}';

-- ============================================================
-- ADD TRACKING COLUMNS TO CORE TABLES
-- ============================================================

-- Service logs
ALTER TABLE service_logs ADD COLUMN technician_id uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN updated_by uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN created_at timestamptz DEFAULT NOW();
ALTER TABLE service_logs ADD COLUMN updated_at timestamptz DEFAULT NOW();

-- Invoices
ALTER TABLE invoices ADD COLUMN service_technician_id uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN updated_by uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN updated_at timestamptz DEFAULT NOW();

-- Boats
ALTER TABLE boats ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE boats ADD COLUMN updated_by uuid REFERENCES users(id);
ALTER TABLE boats ADD COLUMN created_at timestamptz DEFAULT NOW();
ALTER TABLE boats ADD COLUMN updated_at timestamptz DEFAULT NOW();

-- Repeat for: payments, customers, inventory, service_orders, boat_anodes, quotes, scheduling_queue

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE FUNCTION get_user_role(user_uuid uuid) RETURNS text AS $$
  SELECT role FROM users WHERE id = user_uuid AND active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_user_role IS 'Get user role for RLS policies';

-- ============================================================
-- AUDIT LOGGING TRIGGER FUNCTION
-- ============================================================

CREATE FUNCTION log_audit_trail() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    changes,
    ip_address,
    service_name,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('before', row_to_json(OLD))
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after', row_to_json(NEW))
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    END,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('app.service_name', true),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_audit_trail IS 'Automatically log all table changes to audit_logs';

-- ============================================================
-- APPLY AUDIT TRIGGERS TO ALL CORE TABLES
-- ============================================================

CREATE TRIGGER audit_service_logs
  AFTER INSERT OR UPDATE OR DELETE ON service_logs
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_boats
  AFTER INSERT OR UPDATE OR DELETE ON boats
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Repeat for all core tables: boat_anodes, service_orders, scheduling_queue, quotes

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Users table: Staff can view all, only owners/admins can modify
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_staff" ON users
  FOR SELECT USING (
    (auth.jwt() ->> 'user_meta_data')::jsonb ->> 'user_type' = 'staff'
  );

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
    OR id = auth.uid() -- Can edit own profile
  );

-- Audit logs: Only owners/admins can view
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- Service logs: Owners/admins see all, techs see own
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_logs_select" ON service_logs
  FOR SELECT USING (
    (auth.jwt() ->> 'user_meta_data')::jsonb ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin', 'viewer')
      OR technician_id = auth.uid()
    )
  );

CREATE POLICY "service_logs_insert" ON service_logs
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin', 'technician', 'contractor')
  );

CREATE POLICY "service_logs_update" ON service_logs
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
    OR (
      get_user_role(auth.uid()) IN ('technician', 'contractor')
      AND technician_id = auth.uid()
    )
  );

-- Invoices: Owners/admins/viewers see all, techs see own
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    (auth.jwt() ->> 'user_meta_data')::jsonb ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin', 'viewer')
      OR service_technician_id = auth.uid()
    )
  );

CREATE POLICY "invoices_write" ON invoices
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- Repeat RLS policies for all other tables based on permission matrix

-- ============================================================
-- AUTO-CREATE USER RECORD ON AUTH SIGNUP
-- ============================================================

CREATE FUNCTION handle_new_staff_user() RETURNS trigger AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'user_type') = 'staff' THEN
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      user_type,
      active
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'role',
      COALESCE(NEW.raw_user_meta_data->>'user_type_detail', 'employee'),
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_staff_user();

-- ============================================================
-- CLEANUP
-- ============================================================

-- Grant permissions
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON DATABASE postgres IS 'Sailor Skills multi-user database with comprehensive audit logging';
```

### Rollback Plan

**File:** `/migrations/015_user_accounts_audit_logging_rollback.sql`

```sql
-- Rollback migration 015

-- Drop triggers
DROP TRIGGER IF EXISTS audit_service_logs ON service_logs;
DROP TRIGGER IF EXISTS audit_boats ON boats;
-- ... (drop all audit triggers)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS log_audit_trail();
DROP FUNCTION IF EXISTS handle_new_staff_user();
DROP FUNCTION IF EXISTS get_user_role(uuid);

-- Drop tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Remove added columns (careful - may lose data)
ALTER TABLE service_logs DROP COLUMN IF EXISTS technician_id;
ALTER TABLE service_logs DROP COLUMN IF EXISTS created_by;
ALTER TABLE service_logs DROP COLUMN IF EXISTS updated_by;
-- ... (drop all tracking columns)
```

---

## Success Metrics

### Phase 1 Completion Criteria

**Must Have (Blockers for Go-Live):**
- ✅ All 5 services integrated (Operations, Billing, Inventory, Insight, Estimator)
- ✅ All 5 roles tested (Owner, Admin, Technician, Contractor, Viewer)
- ✅ RLS policies enforced server-side (cannot be bypassed)
- ✅ Audit logging active on all core tables
- ✅ User invitation flow working end-to-end
- ✅ At least 3 real users onboarded successfully

**Performance Targets:**
- Zero permission bypasses in security testing
- 100% user accountability (every action tracked)
- Audit log viewer loads < 2 seconds for 1000 entries
- User management UI responsive (< 500ms interactions)

**User Feedback:**
- Users can find and use role-appropriate features
- Permission denials have clear, helpful error messages
- Audit log summaries are understandable (not just raw JSON)
- Invitation flow is straightforward (< 2 minutes to onboard new user)

---

## Future Enhancements (Phase 2 - Q2 2026)

### Complex Revenue Splits

**When:** Q2 2026, after Phase 1 tested with multiple users

**What:**
- `revenue_splits` table: Store multi-party commission structures
- Commission rules at customer/boat level (variable percentages)
- Automatic split calculations when invoice paid
- Commission reports by party (tech, owner, referrer, hub)
- Commission payment tracking

**Example Split Structure:**
```sql
CREATE TABLE revenue_splits (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  boat_id uuid REFERENCES boats(id),
  split_type text CHECK (split_type IN ('customer_level', 'boat_level')),
  splits jsonb NOT NULL,
  -- splits structure:
  -- [
  --   {party_type: 'technician', party_id: uuid, percentage: 35, role: 'service_performer'},
  --   {party_type: 'owner', party_id: uuid, percentage: 20, role: 'client_owner'},
  --   {party_type: 'owner', party_id: uuid, percentage: 10, role: 'referrer'},
  --   {party_type: 'company', party_id: null, percentage: 35, role: 'hub'}
  -- ]
  effective_date date,
  notes text,
  created_at timestamptz DEFAULT NOW(),
  created_by uuid REFERENCES users(id)
);
```

**Phase 2 Effort:** 2-3 additional weeks

---

## Appendix

### Glossary

- **RBAC:** Role-Based Access Control - permission system based on user roles
- **RLS:** Row Level Security - Supabase/PostgreSQL server-side permission enforcement
- **Audit Trail:** Historical record of all data changes with who/what/when
- **Magic Link:** Passwordless authentication link sent via email (Supabase Auth)
- **Attribution:** Linking revenue/work to specific users for performance tracking
- **User Type:** Employment relationship (owner, employee, contractor)
- **Role:** Permission level (owner, admin, technician, contractor, viewer)
- **Job-Based Compensation:** Payment per service/boat (vs. hourly rate)

### Related Documents

- `/docs/roadmap/2026-Q1-ACTIVE.md` - Full Q1 2026 roadmap
- `/docs/plans/2025-11-02-dashboard-to-insight-rename.md` - Insight service rename
- `/docs/plans/2025-10-31-revenue-efficiency-metrics-widget.md` - Efficiency metrics
- `/docs/architecture/SCHEMA_AUDIT_2025-10-27.md` - Current database schema

### Questions & Answers

**Q: Why unified Supabase Auth instead of separate systems?**
A: Simplicity + existing auth in place. One auth system to maintain, clear separation via RLS policies. Less overhead, same security.

**Q: Why database triggers for audit logging instead of application code?**
A: Can't be bypassed. Application code can be skipped (bugs, direct SQL, etc.). Triggers guarantee every change is logged.

**Q: Why two-phase approach instead of full revenue split system now?**
A: Lower risk, faster testing. Phase 1 (4 weeks) gets you onboarding users. Phase 2 (2-3 weeks) adds complexity after validating foundation. Complex commission logic is high-risk if requirements aren't fully defined.

**Q: Why job-based instead of hourly tracking?**
A: Business model is per-service pricing, not hourly billing. Compensation will be based on revenue share per job, not hours worked. Hours tracked for reference only.

---

**Document Status:** Approved
**Next Step:** Phase 5 - Worktree Setup (if implementing now)
**Author:** Claude Code + Brian
**Last Updated:** November 4, 2025
