import {
  getUsers,
  updateUserProfile,
  inviteUser,
  deleteUser,
} from '../lib/user-service.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';

let users = [];
let currentEditUserId = null;

// Initialize
async function init() {
  // Initialize global navigation with Settings sub-pages
  initNavigation({
    currentPage: 'settings',
    currentSubPage: 'src/views/users'
  });

  await loadUsers();
  setupEventListeners();
}

// Load users
async function loadUsers() {
  try {
    users = await getUsers();
    renderUsersTable();
  } catch (error) {
    console.error('Failed to load users:', error);
    document.getElementById('users-table-body').innerHTML = `
      <tr>
        <td colspan="6" class="loading-row" style="color: #f44336;">
          Failed to load users. Please refresh the page.
        </td>
      </tr>
    `;
  }
}

// Render users table
function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-row">No users found.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.email}</td>
      <td>
        <span class="role-badge role-${user.role}">
          ${user.role}
        </span>
      </td>
      <td>
        <div class="service-tags">
          ${user.service_access.length > 0
            ? user.service_access.map(service =>
                `<span class="service-tag">${service}</span>`
              ).join('')
            : '<span style="color: #999; font-size: 12px;">No access</span>'
          }
        </div>
      </td>
      <td>
        <span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">
          ${user.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>${user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}</td>
      <td>
        <button class="btn btn-secondary btn-small edit-user-btn" data-user-id="${user.id}">
          Edit
        </button>
      </td>
    </tr>
  `).join('');

  // Add click handlers
  tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showEditModal(btn.dataset.userId);
    });
  });
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Show invite modal
function showInviteModal() {
  document.getElementById('invite-form').reset();
  document.getElementById('invite-modal').style.display = 'flex';
}

// Show edit modal
function showEditModal(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  currentEditUserId = userId;

  // Populate form
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-email').value = user.email;
  document.getElementById('edit-role').value = user.role;
  document.getElementById('edit-is-active').checked = user.is_active;

  // Set service access checkboxes
  document.querySelectorAll('#edit-services input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = user.service_access.includes(checkbox.value);
  });

  document.getElementById('edit-modal').style.display = 'flex';
}

// Handle invite form submit
async function handleInviteSubmit(e) {
  e.preventDefault();

  const email = document.getElementById('invite-email').value;
  const role = document.getElementById('invite-role').value;

  // Get selected services
  const serviceAccess = Array.from(
    document.querySelectorAll('#invite-services input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  try {
    await inviteUser(email, role, serviceAccess);
    alert(`Invitation sent to ${email}!`);
    document.getElementById('invite-modal').style.display = 'none';
    await loadUsers();
  } catch (error) {
    console.error('Failed to invite user:', error);
    alert('Failed to send invitation. Please try again.');
  }
}

// Handle edit form submit
async function handleEditSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const role = document.getElementById('edit-role').value;
  const isActive = document.getElementById('edit-is-active').checked;

  // Get selected services
  const serviceAccess = Array.from(
    document.querySelectorAll('#edit-services input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  try {
    await updateUserProfile(userId, {
      role,
      service_access: serviceAccess,
      is_active: isActive,
    });

    alert('User updated successfully!');
    document.getElementById('edit-modal').style.display = 'none';
    await loadUsers();
  } catch (error) {
    console.error('Failed to update user:', error);
    alert('Failed to update user. Please try again.');
  }
}

// Handle user delete
async function handleDeleteUser() {
  if (!currentEditUserId) return;

  const user = users.find(u => u.id === currentEditUserId);
  if (!user) return;

  if (!confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
    return;
  }

  try {
    await deleteUser(currentEditUserId);
    alert('User deleted successfully.');
    document.getElementById('edit-modal').style.display = 'none';
    await loadUsers();
  } catch (error) {
    console.error('Failed to delete user:', error);
    alert('Failed to delete user. Please try again.');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Invite button
  document.getElementById('invite-user-btn').addEventListener('click', showInviteModal);

  // Form submits
  document.getElementById('invite-form').addEventListener('submit', handleInviteSubmit);
  document.getElementById('edit-form').addEventListener('submit', handleEditSubmit);

  // Delete button
  document.getElementById('delete-user-btn').addEventListener('click', handleDeleteUser);

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });

  // Role change - auto-check relevant services
  document.getElementById('invite-role').addEventListener('change', (e) => {
    autoCheckServices(e.target.value, 'invite-services');
  });

  document.getElementById('edit-role').addEventListener('change', (e) => {
    autoCheckServices(e.target.value, 'edit-services');
  });
}

// Auto-check services based on role
function autoCheckServices(role, containerId) {
  const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]`);

  if (role === 'admin') {
    // Admin gets all services
    checkboxes.forEach(cb => cb.checked = true);
  } else if (role === 'technician') {
    // Technician gets operations and inventory
    checkboxes.forEach(cb => {
      cb.checked = ['operations', 'inventory'].includes(cb.value);
    });
  } else {
    // Viewer gets nothing by default
    checkboxes.forEach(cb => cb.checked = false);
  }
}

// Initialize on page load
init();
