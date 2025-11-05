# User Management API Implementation Guide

## Overview

This directory contains templates for implementing user management functionality in individual Sailorskills services. Since each service has its own repository, these templates should be copied and adapted to each service as needed.

## Files

### users-api-template.js

API module for user management operations. Provides functions for:
- Fetching all users
- Fetching user by ID
- Inviting new users (sends Supabase magic link)
- Updating user details
- Activating/deactivating users

## Implementation Steps

### For Operations Service (sailorskills-operations)

1. Copy `users-api-template.js` to `src/api/users.js` in the Operations service repository
2. Ensure Supabase client is configured at `src/config/supabase.js`
3. Update the `redirectTo` URL in `inviteUser()` function to match your service's URL
4. Import and use in your UI components

### For Other Services

Each service that needs user management capabilities should:

1. Copy the template to its own `src/api/users.js`
2. Adjust the `redirectTo` URL in `inviteUser()` to redirect to the appropriate service
3. Modify functions as needed for service-specific requirements

## Usage Example

```javascript
import { getAllUsers, inviteUser, updateUser } from './api/users.js';

// Fetch all users
const { data: users, error } = await getAllUsers();

// Invite a new technician
const { data: newUser, error } = await inviteUser({
  email: 'tech@example.com',
  full_name: 'John Technician',
  role: 'technician',
  user_type: 'employee',
  hire_date: '2025-11-04',
  hourly_rate: 45.00,
  phone: '555-1234'
});

// Update user details
const { data: updated, error } = await updateUser(userId, {
  phone: '555-5678',
  hourly_rate: 50.00
});
```

## Shared Utilities

All services should import shared auth utilities from the monorepo shared package:

- `shared/src/auth/permissions.js` - Permission matrix and access control
- `shared/src/auth/user-context.js` - React context and hooks for current user

## Database Access

All user operations enforce Row Level Security (RLS) policies at the database level:

- Staff can view all users
- Only owners/admins can invite users
- Only owners/admins can modify users (except users updating their own profile)
- Only owners can delete users

These policies are defined in migration `016_user_accounts_audit_logging.sql`.

## Next Steps

After implementing the API module in your service:

1. Create UI components for user management (list, invite form, edit form)
2. Wrap your app with `UserProvider` from `shared/src/auth/user-context.js`
3. Use `useCurrentUser()` and `useHasPermission()` hooks for access control
4. Test all permission boundaries
