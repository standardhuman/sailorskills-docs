# User Management UI - Operations Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete user management interface in Operations service allowing owners/admins to invite, view, edit, and manage staff users with role-based permissions.

**Architecture:** React components with Supabase backend, UserProvider context wrapping app, permission guards using shared auth utilities, TailwindCSS styling consistent with existing Operations UI.

**Tech Stack:** React, Vite, Supabase Client, TailwindCSS, shared auth utilities (permissions.js, user-context.js)

**Estimated Effort:** 3-4 hours (12-16 tasks)

---

## Prerequisites

This plan assumes:
- Week 1 foundation complete (database migration 016 applied)
- Shared auth utilities exist at `../shared/src/auth/`
- Operations service repository is separate from this monorepo
- Operations service has Supabase client configured
- React 18+ and Vite build system

---

## Task 1: Copy Shared Auth Utilities to Operations Service

**Files:**
- Copy: `../shared/src/auth/permissions.js` → `src/lib/auth/permissions.js`
- Copy: `../shared/src/auth/user-context.js` → `src/lib/auth/user-context.js`

**Step 1: Create lib/auth directory**

```bash
mkdir -p src/lib/auth
```

**Step 2: Copy permissions module**

```bash
cp ../shared/src/auth/permissions.js src/lib/auth/permissions.js
```

**Step 3: Copy user context module**

```bash
cp ../shared/src/auth/user-context.js src/lib/auth/user-context.js
```

**Step 4: Verify imports work**

Create test file:

```javascript
// src/lib/auth/test-import.js
import { canUserAccess } from './permissions.js';
import { useCurrentUser } from './user-context.js';

console.log('Auth utilities imported successfully');
```

Run: `node src/lib/auth/test-import.js`
Expected: "Auth utilities imported successfully"

**Step 5: Commit**

```bash
git add src/lib/auth/
git commit -m "feat(auth): add shared auth utilities to Operations service"
```

---

## Task 2: Copy User Management API Module

**Files:**
- Copy: `../docs/templates/users-api-template.js` → `src/api/users.js`
- Verify: `src/config/supabase.js` exists

**Step 1: Create api directory**

```bash
mkdir -p src/api
```

**Step 2: Copy users API template**

```bash
cp ../docs/templates/users-api-template.js src/api/users.js
```

**Step 3: Verify Supabase client exists**

Run: `cat src/config/supabase.js | head -10`
Expected: File exists with supabase client export

If missing, create:

```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 4: Test API import**

```javascript
// src/api/test-users-api.js
import { getAllUsers } from './users.js';

console.log('User API imported successfully');
```

Run: `node src/api/test-users-api.js`

**Step 5: Commit**

```bash
git add src/api/users.js src/config/supabase.js
git commit -m "feat(api): add user management API module"
```

---

## Task 3: Wrap App with UserProvider

**Files:**
- Modify: `src/main.jsx` or `src/App.jsx` (whichever is app root)

**Step 1: Find app root**

Run: `find src -name "main.jsx" -o -name "App.jsx" | head -1`

**Step 2: Import UserProvider**

Add to imports:

```javascript
import { UserProvider } from './lib/auth/user-context.js';
import { supabase } from './config/supabase.js';
```

**Step 3: Wrap app with provider**

Before:
```jsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

After:
```jsx
<React.StrictMode>
  <UserProvider supabase={supabase}>
    <App />
  </UserProvider>
</React.StrictMode>
```

**Step 4: Test in dev server**

Run: `npm run dev`
Expected: App loads without errors
Check browser console for "Error loading user" - should not appear

**Step 5: Commit**

```bash
git add src/main.jsx
git commit -m "feat(auth): wrap app with UserProvider for user context"
```

---

## Task 4: Create UserList Component

**Files:**
- Create: `src/components/users/UserList.jsx`
- Create: `src/components/users/UserList.test.jsx`

**Step 1: Create components/users directory**

```bash
mkdir -p src/components/users
```

**Step 2: Write UserList component**

```jsx
// src/components/users/UserList.jsx
import { useEffect, useState } from 'react';
import { getAllUsers } from '../../api/users.js';
import { useCurrentUser } from '../../lib/auth/user-context.js';

export default function UserList({ onEditUser }) {
  const { currentUser } = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await getAllUsers();
      if (error) {
        setError(error.message);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  if (loading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Team Members</h2>
        <span className="text-sm text-gray-600">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onEditUser(user)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Test component loads**

Run: `npm run dev`
Navigate to component in browser
Expected: Component renders without errors (may show 0 users if none exist)

**Step 4: Commit**

```bash
git add src/components/users/UserList.jsx
git commit -m "feat(users): add UserList component with table view"
```

---

## Task 5: Create InviteUserForm Component

**Files:**
- Create: `src/components/users/InviteUserForm.jsx`

**Step 1: Write InviteUserForm component**

```jsx
// src/components/users/InviteUserForm.jsx
import { useState } from 'react';
import { inviteUser } from '../../api/users.js';
import { useHasPermission } from '../../lib/auth/user-context.js';

export default function InviteUserForm({ onSuccess, onCancel }) {
  const canInvite = useHasPermission('INVITE_USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'technician',
    user_type: 'employee',
    phone: '',
    hire_date: '',
    hourly_rate: ''
  });

  if (!canInvite) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">You do not have permission to invite users.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: inviteError } = await inviteUser(formData);

    if (inviteError) {
      setError(inviteError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onSuccess?.(data);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Invite New User</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="technician">Technician</option>
            <option value="contractor">Contractor</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Type *
          </label>
          <select
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hire Date
          </label>
          <input
            type="date"
            name="hire_date"
            value={formData.hire_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate (reference only)
          </label>
          <input
            type="number"
            name="hourly_rate"
            value={formData.hourly_rate}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending Invite...' : 'Send Invite'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Test form renders**

Run: `npm run dev`
Expected: Form renders with all fields

**Step 3: Commit**

```bash
git add src/components/users/InviteUserForm.jsx
git commit -m "feat(users): add InviteUserForm component with permission guard"
```

---

## Task 6: Create Users Management Page

**Files:**
- Create: `src/pages/UsersPage.jsx` or `src/views/UsersPage.jsx`

**Step 1: Determine pages/views directory**

Run: `ls -d src/pages src/views 2>/dev/null | head -1`

Use whichever exists, or create `src/pages/`

**Step 2: Write UsersPage component**

```jsx
// src/pages/UsersPage.jsx
import { useState } from 'react';
import UserList from '../components/users/UserList.jsx';
import InviteUserForm from '../components/users/InviteUserForm.jsx';
import { useHasPermission } from '../lib/auth/user-context.js';

export default function UsersPage() {
  const canInvite = useHasPermission('INVITE_USER');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    setRefreshKey(prev => prev + 1); // Trigger UserList refresh
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage staff access and permissions
        </p>
      </div>

      {canInvite && !showInviteForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowInviteForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Invite User
          </button>
        </div>
      )}

      {showInviteForm && (
        <div className="mb-6">
          <InviteUserForm
            onSuccess={handleInviteSuccess}
            onCancel={() => setShowInviteForm(false)}
          />
        </div>
      )}

      <UserList key={refreshKey} />
    </div>
  );
}
```

**Step 3: Test page renders**

Run: `npm run dev`
Expected: Page shows with "User Management" header

**Step 4: Commit**

```bash
git add src/pages/UsersPage.jsx
git commit -m "feat(users): add UsersPage with invite flow"
```

---

## Task 7: Add Users Route to Navigation

**Files:**
- Modify: Router configuration (likely `src/App.jsx` or `src/router.jsx`)

**Step 1: Find router configuration**

Run: `grep -r "createBrowserRouter\|Routes\|Route" src/ | grep -v node_modules | head -5`

**Step 2: Import UsersPage**

Add to imports:
```javascript
import UsersPage from './pages/UsersPage.jsx';
```

**Step 3: Add users route**

If using React Router:
```jsx
<Route path="/users" element={<UsersPage />} />
```

If using array-based router:
```javascript
{
  path: '/users',
  element: <UsersPage />
}
```

**Step 4: Test route works**

Run: `npm run dev`
Navigate to: http://localhost:5173/users
Expected: UsersPage loads

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(users): add /users route to navigation"
```

---

## Task 8: Add Users Link to Navigation Menu

**Files:**
- Modify: Navigation component (likely `src/components/Navigation.jsx` or `src/components/Sidebar.jsx`)

**Step 1: Find navigation component**

Run: `find src -name "*Nav*.jsx" -o -name "*Sidebar*.jsx" | head -3`

**Step 2: Import permission hook**

Add to imports:
```javascript
import { useHasPermission } from '../lib/auth/user-context.js';
```

**Step 3: Add users link with permission guard**

Inside component:
```jsx
const canManageUsers = useHasPermission('MANAGE_USERS');

// In navigation menu
{canManageUsers && (
  <Link
    to="/users"
    className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
  >
    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    Users
  </Link>
)}
```

**Step 4: Test navigation link**

Run: `npm run dev`
Log in as admin/owner
Expected: "Users" link appears in navigation
Click link → navigates to /users

**Step 5: Commit**

```bash
git add src/components/Navigation.jsx
git commit -m "feat(users): add Users link to navigation with permission guard"
```

---

## Task 9: Test Complete Invite Flow

**Files:**
- Manual testing checklist

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Log in as owner/admin**

Use credentials: standardhuman@gmail.com / KLRss!650

**Step 3: Navigate to Users page**

Click "Users" in navigation
Expected: UserList shows (may be empty)

**Step 4: Click "Invite User"**

Expected: InviteUserForm appears

**Step 5: Fill out form**

- Email: test-tech@example.com
- Name: Test Technician
- Role: Technician
- User Type: Employee
- Phone: 555-1234
- Hire Date: 2025-11-04
- Hourly Rate: 45

**Step 6: Submit form**

Expected:
- "Sending Invite..." button state
- Success → form closes
- UserList refreshes and shows new user
- Check test-tech@example.com inbox for magic link

**Step 7: Verify in database**

Run: `bash -c 'source db-env.sh && psql "$DATABASE_URL" -c "SELECT email, full_name, role, active FROM users;"'`

Expected: New user appears in table

**Step 8: Document test results**

Create: `docs/testing/user-invite-flow-test.md`

```markdown
# User Invite Flow Test Results

**Date:** 2025-11-04
**Tester:** [Your name]

## Test Results

- [ ] Users page loads successfully
- [ ] Invite button appears for owners/admins
- [ ] Invite form renders correctly
- [ ] Form validation works
- [ ] Invite sends successfully
- [ ] User appears in database
- [ ] UserList refreshes after invite
- [ ] Magic link email sent
- [ ] Permission guard blocks non-admins

## Issues Found

[List any issues]

## Next Steps

[List follow-up work needed]
```

**Step 9: Commit test documentation**

```bash
git add docs/testing/user-invite-flow-test.md
git commit -m "docs(testing): add user invite flow test results"
```

---

## Task 10: Create EditUserForm Component

**Files:**
- Create: `src/components/users/EditUserForm.jsx`

**Step 1: Write EditUserForm component**

```jsx
// src/components/users/EditUserForm.jsx
import { useState } from 'react';
import { updateUser, deactivateUser, reactivateUser } from '../../api/users.js';
import { useHasPermission } from '../../lib/auth/user-context.js';

export default function EditUserForm({ user, onSuccess, onCancel }) {
  const canManage = useHasPermission('MANAGE_USERS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    hourly_rate: user.hourly_rate || '',
    hire_date: user.hire_date || ''
  });

  if (!canManage) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">You do not have permission to edit users.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await updateUser(user.id, formData);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onSuccess?.(data);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    const { error: toggleError } = user.active
      ? await deactivateUser(user.id)
      : await reactivateUser(user.id);

    if (toggleError) {
      setError(toggleError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onSuccess?.();
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Edit User: {user.email}</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-600">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Status:</strong> {user.active ? 'Active' : 'Inactive'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hire Date
          </label>
          <input
            type="date"
            name="hire_date"
            value={formData.hire_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate (reference only)
          </label>
          <input
            type="number"
            name="hourly_rate"
            value={formData.hourly_rate}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={loading}
            className={`px-4 py-2 rounded-md ${
              user.active
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50`}
          >
            {user.active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Test component renders**

Run: `npm run dev`

**Step 3: Commit**

```bash
git add src/components/users/EditUserForm.jsx
git commit -m "feat(users): add EditUserForm component with activate/deactivate"
```

---

## Task 11: Integrate EditUserForm into UsersPage

**Files:**
- Modify: `src/pages/UsersPage.jsx`

**Step 1: Import EditUserForm**

Add to imports:
```javascript
import EditUserForm from '../components/users/EditUserForm.jsx';
```

**Step 2: Add edit state**

Add to component state:
```jsx
const [editingUser, setEditingUser] = useState(null);
```

**Step 3: Add edit handler**

```jsx
const handleEditUser = (user) => {
  setEditingUser(user);
  setShowInviteForm(false);
};

const handleEditSuccess = () => {
  setEditingUser(null);
  setRefreshKey(prev => prev + 1);
};
```

**Step 4: Pass handler to UserList**

```jsx
<UserList key={refreshKey} onEditUser={handleEditUser} />
```

**Step 5: Render EditUserForm conditionally**

Add before UserList:
```jsx
{editingUser && (
  <div className="mb-6">
    <EditUserForm
      user={editingUser}
      onSuccess={handleEditSuccess}
      onCancel={() => setEditingUser(null)}
    />
  </div>
)}
```

**Step 6: Test edit flow**

Run: `npm run dev`
- Click "Edit" on a user
- Edit form appears
- Make changes and save
- Verify changes persist

**Step 7: Commit**

```bash
git add src/pages/UsersPage.jsx
git commit -m "feat(users): integrate EditUserForm into UsersPage"
```

---

## Task 12: Test Permission Boundaries

**Files:**
- Manual testing checklist

**Step 1: Test as owner/admin**

Log in with owner credentials
Expected:
- ✅ Can see Users in navigation
- ✅ Can view user list
- ✅ Can invite users
- ✅ Can edit users
- ✅ Can activate/deactivate users

**Step 2: Create test technician account**

Invite: tech-test@example.com, Role: technician

**Step 3: Test as technician**

Log in as tech-test@example.com
Expected:
- ❌ Cannot see Users in navigation
- ❌ Navigating to /users shows "No permission" or redirects

**Step 4: Verify RLS enforcement**

Open browser console on /users as technician
Try: `supabase.from('users').select()`
Expected: RLS blocks query or returns empty

**Step 5: Test viewer role**

Create viewer account
Log in as viewer
Expected:
- ✅ Can see Users in navigation
- ✅ Can view user list
- ❌ Cannot see "Invite User" button
- ❌ Edit buttons disabled or hidden

**Step 6: Document permission test results**

Create: `docs/testing/permission-boundary-tests.md`

```markdown
# Permission Boundary Test Results

**Date:** 2025-11-04

## Test Matrix

| Role | View Users | Invite Users | Edit Users | Deactivate |
|------|-----------|--------------|-----------|------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Technician | ❌ | ❌ | ❌ | ❌ |
| Contractor | ❌ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

## RLS Enforcement Verified

- [x] Database blocks unauthorized queries
- [x] UI hides actions based on permissions
- [x] Navigation guards prevent access
- [x] API returns proper errors for unauthorized actions

## Issues Found

[List any permission bypass issues]
```

**Step 7: Commit test documentation**

```bash
git add docs/testing/permission-boundary-tests.md
git commit -m "docs(testing): add permission boundary test results"
```

---

## Task 13: Add Loading and Error States

**Files:**
- Modify: `src/pages/UsersPage.jsx`

**Step 1: Add error boundary**

Wrap entire page content:
```jsx
import { useCurrentUser } from '../lib/auth/user-context.js';

export default function UsersPage() {
  const { currentUser, loading, error } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading user context...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">Error loading user: {error.message}</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">Please log in to access this page.</p>
      </div>
    );
  }

  // ... rest of component
}
```

**Step 2: Test loading states**

Run: `npm run dev`
- Throttle network in DevTools
- Reload page
- Expected: "Loading user context..." appears briefly

**Step 3: Test error state**

Temporarily break Supabase URL in .env
Expected: Error message displays

**Step 4: Commit**

```bash
git add src/pages/UsersPage.jsx
git commit -m "feat(users): add loading and error states to UsersPage"
```

---

## Task 14: Create README for User Management

**Files:**
- Create: `docs/USER_MANAGEMENT.md`

**Step 1: Write comprehensive guide**

```markdown
# User Management System

## Overview

The user management system allows owners and admins to invite, manage, and control staff access to the Operations service.

## Features

- **Invite Users**: Send magic link invites to new staff members
- **Role-Based Access**: 5 roles (owner, admin, technician, contractor, viewer)
- **User Editing**: Update contact info, rates, and hire dates
- **Activate/Deactivate**: Control user access without deletion
- **Audit Trail**: All changes logged automatically in database

## User Roles

### Owner
- Full access to all features
- Can invite and manage all users
- Can assign owner role to others

### Admin
- Can invite and manage users (except other owners)
- Full operational access
- Cannot modify owner roles

### Technician
- Can create and update own service logs
- Can view boats and schedules
- Cannot access user management

### Contractor
- Similar to technician
- Flagged as external for tracking

### Viewer
- Read-only access to most data
- Can view user list
- Cannot modify anything

## Permission Matrix

See `src/lib/auth/permissions.js` for complete matrix

## Database Schema

### Users Table
- `id`: UUID (links to auth.users)
- `email`: Unique email
- `full_name`: Display name
- `role`: Permission level
- `user_type`: owner/employee/contractor
- `active`: Boolean status
- `hire_date`: Optional hire date
- `hourly_rate`: Reference only (not for billing)
- `phone`: Contact number
- `preferences`: JSONB for future settings

### Audit Logs
All user management actions automatically logged to `audit_logs` table.

## Usage

### Inviting a User

1. Navigate to /users
2. Click "Invite User"
3. Fill form with:
   - Email (required)
   - Full name (required)
   - Role (required)
   - User type (required)
   - Optional: phone, hire date, rate
4. Click "Send Invite"
5. User receives magic link email

### Editing a User

1. Navigate to /users
2. Click "Edit" on user row
3. Update fields as needed
4. Click "Save Changes"

### Deactivating a User

1. Navigate to /users
2. Click "Edit" on user row
3. Click "Deactivate"
4. User loses access immediately
5. Can reactivate later

## Security

- **Row-Level Security (RLS)**: Database enforces permissions
- **Client-Side Guards**: UI hides unauthorized actions
- **Audit Trail**: All changes tracked with timestamp and actor

## Testing

See `docs/testing/` for test results:
- `user-invite-flow-test.md`
- `permission-boundary-tests.md`

## Troubleshooting

### Invite email not received
- Check spam folder
- Verify Supabase email settings
- Check email logs in Supabase dashboard

### Permission denied errors
- Verify user has correct role
- Check RLS policies in database
- Ensure auth token is valid

### User context not loading
- Check browser console for errors
- Verify UserProvider wraps app
- Ensure Supabase client configured

## Next Steps

- [ ] Add role change functionality (requires owner approval)
- [ ] Build audit log viewer
- [ ] Add user avatar uploads
- [ ] Implement user search/filter
- [ ] Add bulk user import
```

**Step 2: Commit documentation**

```bash
git add docs/USER_MANAGEMENT.md
git commit -m "docs: add comprehensive user management guide"
```

---

## Completion Checklist

After completing all tasks:

- [ ] All components created and tested
- [ ] Permission guards in place
- [ ] Database integration working
- [ ] Manual testing complete
- [ ] Documentation written
- [ ] Code committed
- [ ] Ready for Week 2 (Billing/Inventory integration)

---

## Next Phase Preview

**Week 2: Billing + Inventory Integration**
- Add technician attribution to service logs
- Copy service_technician_id to invoices on creation
- Display technician names in Billing UI
- Track inventory usage by technician
- Revenue attribution reports in Insight

This will build on the user foundation we just created.
