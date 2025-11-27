# Roadmap Submission: User Accounts & Audit Logging System

**Submitted:** 2025-10-31
**Component:** Cross-Service Infrastructure
**Status:** Proposed
**Priority:** Critical
**Estimated Effort:** Large (3-4 weeks)

---

## Overview

Implement comprehensive user accounts and audit logging infrastructure across all Sailorskills services to track who performs what actions, enable multi-user accountability, support role-based access control, and provide foundation for revenue attribution and performance tracking.

**Strategic Importance:** This is foundational infrastructure required before transitioning to multi-user/multi-owner operations. Without user accounts and audit logging, there's no accountability, no revenue attribution, and no way to track who did what.

---

## Problem Statement

### Current State
- **No user authentication** for internal staff (admin services are open to anyone with URL)
- **No audit trails** - cannot determine who created/modified service logs, boats, invoices, schedules, inventory
- **No accountability** - actions are anonymous, no way to trace who made errors or performed work
- **No revenue tracking** - cannot attribute revenue to specific team members
- **Single-user assumption** - all services assume one person using the system
- **Customer-only auth** - Supabase Auth only used for customer portal, not staff

### Business Impact
- Cannot onboard multiple owners/contractors/employees safely
- No performance metrics or revenue attribution per user
- Cannot identify who made data entry errors
- No compliance/audit trail for business operations
- Cannot implement role-based permissions (e.g., view-only users, admin-only features)

---

## Requirements

### 1. User Account System

#### User Roles & Types
```typescript
type UserRole =
  | 'owner'          // Full access, can manage users
  | 'admin'          // Full operational access, cannot manage users
  | 'technician'     // Field work: service logs, billing, scheduling
  | 'contractor'     // Limited access: assigned services only
  | 'viewer'         // Read-only access to dashboards/reports
```

#### User Profile
```typescript
interface User {
  id: uuid                    // Primary key
  email: string               // Login email
  full_name: string           // Display name
  role: UserRole              // Access level
  type: 'owner' | 'employee' | 'contractor'  // Employment type
  active: boolean             // Enable/disable account
  hire_date: date             // Start date
  hourly_rate?: decimal       // For cost tracking
  phone?: string              // Contact info
  avatar_url?: string         // Profile photo
  preferences: jsonb          // UI preferences, notifications
  created_at: timestamp
  created_by: uuid            // Who created this account
  updated_at: timestamp
  updated_by: uuid            // Who last modified
}
```

#### Authentication Strategy
- **Option A: Supabase Auth Extension** (Recommended)
  - Leverage existing Supabase Auth infrastructure
  - Create separate auth flows for staff vs. customers
  - Use email/password + magic links
  - Existing RLS policies can reference user role

- **Option B: Custom Auth Table**
  - Separate `staff_auth` table
  - Custom JWT tokens
  - More control, more complexity

**Recommendation:** Option A (Supabase Auth) with role stored in `users` table

---

### 2. Comprehensive Audit Logging

#### Audit Trail Requirements
Every create/update/delete operation must track:
- **Who**: User ID who performed action
- **What**: Entity type and ID (e.g., service_log #12345)
- **When**: Timestamp of action
- **Action**: Created, updated, deleted, viewed (for sensitive data)
- **Changes**: Before/after values for updates
- **Context**: IP address, device info, service name

#### Database Schema

##### Audit Log Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,           -- 'service_log', 'boat', 'invoice', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                -- 'created', 'updated', 'deleted', 'viewed'
  changes JSONB,                       -- { before: {...}, after: {...} }
  ip_address INET,
  user_agent TEXT,
  service_name TEXT,                   -- 'operations', 'billing', 'inventory', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_user (user_id, created_at),
  INDEX idx_audit_service (service_name, created_at)
);
```

##### Entity Tracking Columns (Add to All Tables)
```sql
-- Standard columns to add to service_logs, boats, customers, invoices, etc.
ALTER TABLE <table_name> ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE <table_name> ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE <table_name> ADD COLUMN updated_by UUID REFERENCES users(id);
ALTER TABLE <table_name> ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

**Tables to Update:**
- `service_logs` - Track who entered service data
- `service_orders` - Track who scheduled services
- `boats` - Track who created/modified boat records
- `customers` - Track who added/updated customers
- `invoices` - Track who created/modified invoices
- `payments` - Track who processed payments
- `inventory` - Track who added/modified inventory
- `boat_anodes` - Track who updated anode data
- `service_requests` - Track who created/responded to requests

#### Audit Log Edge Function
```typescript
// Supabase Edge Function: audit-logger
export async function logAction(params: {
  userId: string,
  entityType: string,
  entityId: string,
  action: 'created' | 'updated' | 'deleted' | 'viewed',
  changes?: { before: any, after: any },
  serviceName: string,
  request: Request
}) {
  // Insert into audit_logs table
  // Called from all services on data mutations
}
```

---

### 3. Role-Based Access Control (RBAC)

#### Permission Matrix

| Feature | Owner | Admin | Technician | Contractor | Viewer |
|---------|-------|-------|------------|------------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Service Logs | ✅ | ✅ | ✅ | Own only | ✅ |
| Create/Edit Service Logs | ✅ | ✅ | ✅ | Own only | ❌ |
| View Customers | ✅ | ✅ | ✅ | Assigned only | ✅ |
| Create/Edit Customers | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Invoices | ✅ | ✅ | ✅ | Own only | ✅ |
| Create/Edit Invoices | ✅ | ✅ | ✅ | Own only | ❌ |
| Process Payments | ✅ | ✅ | ✅ | Own only | ❌ |
| Manage Inventory | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule Services | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Financial Reports | ✅ | ✅ | ❌ | ❌ | ✅ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Implementation
- **Database RLS Policies**: Supabase Row-Level Security based on user role
- **UI-Level Guards**: Hide/disable features based on role
- **API Validation**: Edge functions verify user has permission

---

### 4. Revenue Attribution & Performance Tracking

#### Revenue Tracking
```sql
-- Add to invoices table
ALTER TABLE invoices ADD COLUMN service_technician_id UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN commission_amount DECIMAL(10,2);

-- Add to service_logs table
ALTER TABLE service_logs ADD COLUMN technician_id UUID REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN revenue_generated DECIMAL(10,2);
```

#### Performance Metrics (Dashboard Widgets)
- **Revenue by User**: Total revenue generated per technician
- **Services by User**: Count of services completed per user
- **Average Revenue per Service**: By user
- **Efficiency Metrics**: Revenue per hour by user
- **Commission Tracking**: Calculated commission amounts
- **Activity Timeline**: Recent actions by user

#### Reports
- Monthly revenue report by user
- User performance comparison
- Commission payout reports
- Time tracking vs. revenue correlation

---

## Implementation Phases

### **Phase 1: User Account Foundation** (Week 1)
- [ ] Design user account schema and authentication flow
- [ ] Create `users` table with role/type fields
- [ ] Set up Supabase Auth for staff (separate from customer auth)
- [ ] Build user management UI (create/edit/deactivate users)
- [ ] Implement login flow for admin services
- [ ] Create user profile page
- [ ] Migration: Create initial admin user accounts

**Deliverables:**
- Users can log in to admin services with email/password
- User management interface in Dashboard or Settings
- Basic role assignment (owner, admin, technician)

---

### **Phase 2: Audit Logging Infrastructure** (Week 1-2)
- [ ] Create `audit_logs` table with indexes
- [ ] Build audit logging edge function
- [ ] Add `created_by`, `updated_by`, timestamps to core tables
- [ ] Implement audit log middleware for all data mutations
- [ ] Create audit log viewer UI (filter by user, entity, date)
- [ ] Migration: Backfill existing data with system user

**Deliverables:**
- All create/update/delete operations logged to audit_logs
- Audit log viewer in Dashboard
- Historical tracking enabled for all entities

---

### **Phase 3: RBAC Implementation** (Week 2-3)
- [ ] Define permission matrix for all features
- [ ] Implement Supabase RLS policies based on user role
- [ ] Add UI-level permission guards (hide/disable features)
- [ ] Add API-level permission validation
- [ ] Test each role's access restrictions
- [ ] Create permission documentation

**Deliverables:**
- Role-based access working across all services
- Contractors can only see assigned work
- Viewers have read-only access
- Owners can manage users

---

### **Phase 4: Service Integration** (Week 3-4)
Integrate user accounts and audit logging into each service:

**Operations:**
- [ ] Add "Created by" to service log creation
- [ ] Add "Assigned to" picker when scheduling services
- [ ] Track who schedules/reschedules services
- [ ] Audit log for boat creation/modification

**Billing/Completion:**
- [ ] Track who initiates billing
- [ ] Track who processes payments
- [ ] Track who enters service conditions
- [ ] Link invoice to service technician for revenue attribution

**Inventory:**
- [ ] Track who adds/modifies inventory
- [ ] Track who places orders
- [ ] Audit log for stock adjustments

**Dashboard:**
- [ ] Revenue by user widget
- [ ] User performance metrics
- [ ] Activity timeline by user
- [ ] Audit log explorer

**Estimator:**
- [ ] Track who creates quotes
- [ ] Attribution: which user brought in customer

**Portal:**
- [ ] No changes (customer-facing only)

**Deliverables:**
- All services tracking user actions
- Revenue attribution working
- Performance metrics available in Dashboard

---

### **Phase 5: Reporting & Analytics** (Week 4)
- [ ] Build user performance dashboard
- [ ] Revenue attribution reports
- [ ] Commission calculation reports
- [ ] Activity summary reports
- [ ] Export audit logs to CSV
- [ ] User activity heatmaps

**Deliverables:**
- Comprehensive user performance reporting
- Commission/revenue tracking ready
- Audit trail export capability

---

## Database Schema Summary

### New Tables
```sql
-- User accounts
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'technician', 'contractor', 'viewer')),
  type TEXT NOT NULL CHECK (type IN ('owner', 'employee', 'contractor')),
  active BOOLEAN DEFAULT true,
  hire_date DATE,
  hourly_rate DECIMAL(10,2),
  phone TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Audit logging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed')),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  service_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_service ON audit_logs(service_name, created_at);
```

### Existing Tables to Update
```sql
-- Add to: service_logs, service_orders, boats, customers, invoices, payments, inventory, etc.
ALTER TABLE <table_name> ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE <table_name> ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE <table_name> ADD COLUMN updated_by UUID REFERENCES users(id);
ALTER TABLE <table_name> ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Revenue attribution
ALTER TABLE invoices ADD COLUMN service_technician_id UUID REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN technician_id UUID REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN revenue_generated DECIMAL(10,2);
```

---

## Technical Implementation

### Authentication Flow
1. User visits admin service (Operations, Dashboard, etc.)
2. If not authenticated, redirect to login page
3. Login with email/password or magic link
4. Supabase Auth creates session
5. Fetch user profile from `users` table (includes role)
6. Store user context in app state
7. All API calls include user ID in headers
8. Edge functions validate user permissions

### Audit Logging Flow
1. User performs action (create/update/delete)
2. Frontend calls edge function with data
3. Edge function validates user permission
4. Edge function performs operation
5. Edge function logs to `audit_logs` table
6. Response returned to frontend

### Shared Package Integration
Create shared utilities in `sailorskills-shared`:
```typescript
// shared/src/auth/userContext.js
export function getCurrentUser()
export function hasPermission(feature, action)
export function requireRole(role)

// shared/src/audit/logger.js
export function logAction(params)
export function getEntityHistory(entityType, entityId)
```

---

## UI Mockups & Features

### User Management Page (Dashboard)
```
[Users]
┌─────────────────────────────────────────────────────┐
│ [+ Add User]                    [Search] [Filter▾]  │
├─────────────────────────────────────────────────────┤
│ Name             Role         Type        Active     │
│ Brian Smith      Owner        Owner       ✅         │
│ Jane Doe         Technician   Employee    ✅         │
│ John Contractor  Contractor   Contractor  ✅         │
│ View Only User   Viewer       Employee    ❌         │
└─────────────────────────────────────────────────────┘
```

### User Profile Page
```
[User Profile: Jane Doe]
┌─────────────────────────────────────────────────────┐
│ [Avatar]                                            │
│                                                     │
│ Full Name: Jane Doe                                │
│ Email: jane@sailorskills.com                       │
│ Role: Technician                                   │
│ Type: Employee                                     │
│ Hire Date: 2024-05-15                              │
│ Hourly Rate: $45.00                                │
│ Active: ✅                                          │
│                                                     │
│ [Save Changes] [Deactivate Account]                │
└─────────────────────────────────────────────────────┘
```

### Audit Log Viewer (Dashboard)
```
[Audit Logs]
┌─────────────────────────────────────────────────────┐
│ Filter: [User▾] [Entity Type▾] [Date Range]        │
├─────────────────────────────────────────────────────┤
│ 2025-10-31 14:32 | Jane Doe | Created service_log  │
│ 2025-10-31 14:15 | Brian Smith | Updated boat #123 │
│ 2025-10-31 13:45 | Jane Doe | Processed payment   │
│ 2025-10-31 12:10 | John Contractor | Created log  │
└─────────────────────────────────────────────────────┘
```

### Revenue by User Widget (Dashboard)
```
[Revenue by User - October 2025]
┌─────────────────────────────────────────────────────┐
│ Jane Doe:        $12,450  (18 services)            │
│ Brian Smith:     $8,320   (11 services)            │
│ John Contractor: $3,200   (5 services)             │
│                                                     │
│ [View Detailed Report]                             │
└─────────────────────────────────────────────────────┘
```

---

## Success Metrics

### Adoption & Usage
- **100% user accountability**: Every action tracked to a user
- **Multi-user onboarding**: 3+ users onboarded within first week
- **Zero anonymous actions**: No untracked creates/updates/deletes
- **Audit coverage**: 100% of core entities have audit trails

### Performance
- **Login time**: < 2 seconds
- **Audit log write**: < 100ms overhead per operation
- **Audit log queries**: < 500ms for filtered searches
- **User management**: < 1 second page load

### Business Impact
- **Revenue attribution**: 100% of invoices linked to technician
- **Performance tracking**: Revenue/service metrics per user available
- **Accountability**: Ability to trace any data change to source user
- **Multi-owner ready**: Can safely onboard multiple owners/contractors

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex Supabase Auth setup | High | Use existing customer auth as reference, test thoroughly |
| Performance degradation from audit logging | Medium | Async logging, database indexes, monitor query performance |
| Users forget to log in / log out | Low | Session persistence, auto-logout after inactivity |
| Backfilling existing data attribution | Medium | Create "System User" for historical data, document gaps |
| Role permission bugs (over-permissive) | High | Thorough testing of each role, security review |
| Audit log storage growth | Low | Implement log rotation/archival after 2 years |

---

## Dependencies

### Internal Dependencies
- **Supabase database**: Core infrastructure (✅ exists)
- **Supabase Auth**: Already used for customer portal auth (✅ exists)
- **Shared package**: For auth/audit utilities (✅ exists)

### External Dependencies
- **None** - all functionality built on existing Supabase infrastructure

### Blocks / Enables
**This initiative blocks:**
- Q2 2026 Ownership & Attribution Tracking (needs user accounts first)
- Multi-owner profit sharing (needs revenue attribution)
- Team/technician assignment features (needs user roles)

**This initiative enables:**
- Safe multi-user operations
- Performance-based compensation
- Compliance/audit requirements
- Future features: time tracking, scheduling optimization, workload balancing

---

## Alternative Approaches Considered

### Alternative 1: Third-Party User Management (Auth0, Clerk)
- **Pros:** Feature-rich, minimal development, SSO support
- **Cons:** Monthly cost ($25-100+/mo), vendor lock-in, Supabase integration complexity
- **Decision:** Build on Supabase Auth (already paying for it, full control)

### Alternative 2: Minimal Audit Logging (Only Critical Actions)
- **Pros:** Simpler implementation, less storage
- **Cons:** Incomplete accountability, harder to debug issues, compliance gaps
- **Decision:** Comprehensive logging is worth the effort for multi-user operations

### Alternative 3: Defer to Q2 with Ownership Tracking
- **Pros:** Less immediate work
- **Cons:** Cannot safely onboard users now, ownership tracking is blocked
- **Decision:** Prioritize for Q1 as foundational infrastructure

---

## Questions for Roadmap Review

1. **Priority:** Should this be Q1 2026 or earlier (Q4 2025)? Multi-user need is urgent.
2. **Scope:** Start with basic auth + audit logging, defer RBAC to Phase 2?
3. **Migration:** How to handle backfilling existing data with "System User"?
4. **Roles:** Are 5 roles (owner/admin/technician/contractor/viewer) sufficient?
5. **Integration:** Should customer portal auth be migrated to unified system or stay separate?
6. **Commission:** Should commission calculation be part of Phase 1 or deferred?

---

## Related Work

- **Depends On:** None (foundational)
- **Blocks:** Q2 2026 Ownership & Attribution Tracking System
- **Enables:** All multi-user features, performance tracking, RBAC

---

## References

- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security
- Existing customer portal auth: `sailorskills-portal/src/auth/`
- Design inspiration: Linear, Notion, Asana user management

---

**Submitted by:** Claude Code Agent (on behalf of Brian)
**Contact:** brian@sailorskills.com
**Review Date:** TBD
