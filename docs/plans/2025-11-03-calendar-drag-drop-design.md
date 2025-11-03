# Schedule Calendar: Drag-and-Drop Rescheduling

**Date:** 2025-11-03
**Status:** Design Approved
**Service:** sailorskills-operations
**Estimated Effort:** 7-9 hours

## Overview

Add drag-and-drop functionality to the Schedule Calendar, allowing users to quickly reschedule services by dragging boat markers from one date to another. This feature will be built using React and @dnd-kit/core, positioning the codebase for future React Native mobile app development.

## Context & Requirements

### User Story
As an admin user, I want to reschedule services by dragging boat markers to different dates on the calendar, so I can manage my schedule more efficiently without opening modals or navigating away from the calendar view.

### Key Requirements
- **Multi-device support:** Desktop (mouse), tablet (touch), and mobile (touch)
- **Future-proof:** Built with React to enable easier React Native migration
- **Preserve existing features:** Keep modal-based reschedule, filters, month navigation
- **Touch-optimized:** Long press to activate drag, prevent accidental drags during scrolling
- **Visual feedback:** Ghost element, drop zone highlighting, smooth animations
- **Error handling:** Optimistic updates with rollback on failure

### Success Metrics
- 80%+ of reschedules done via drag-and-drop (vs. modal)
- Average reschedule time: <10 seconds (vs. 60+ seconds with modal)
- Zero data loss during drag operations
- Works smoothly on desktop, tablet, and mobile devices

## Architecture

### Component Structure

```
Schedule.jsx (new React component)
├── ScheduleHeader
│   ├── Month navigation (prev/next)
│   └── Service interval filters (1-mo, 2-mo, 3-mo, one-time)
├── DndContext (@dnd-kit wrapper)
│   ├── CalendarGrid
│   │   ├── CalendarCell (droppable)
│   │   │   ├── Cell date
│   │   │   └── ServiceMarker[] (draggable)
│   └── DragOverlay (ghost element during drag)
├── ServiceDetailModal (existing, kept)
├── RescheduleModal (existing, kept)
└── DueThisMonth (existing, kept)
```

### Technology Stack

**New Dependencies:**
- `react` (^18.3.1) - UI framework
- `react-dom` (^18.3.1) - DOM rendering
- `@dnd-kit/core` (~20KB) - Drag-and-drop library with excellent touch support
- `@vitejs/plugin-react` - Vite plugin for JSX support

**Existing Tech (No Changes):**
- Vite (build system, already configured)
- Supabase (database, accessed via `window.app.supabase`)
- Vanilla JS modals/toasts (reused as-is)

### Why React + @dnd-kit?

**React:**
- Future React Native migration planned
- Shared component logic between web and mobile
- Modern development experience with hooks

**@dnd-kit/core:**
- Excellent touch support (critical for "all devices" requirement)
- Accessible (keyboard navigation, screen readers)
- Lightweight (~20KB gzipped)
- Actively maintained
- Supports mouse, touch, and keyboard sensors

**Alternative Considered:**
- **Custom Pointer Events:** Lighter weight, no framework dependency, but all drag logic would need to be rewritten for React Native later. Rejected due to React Native plans.

## Implementation Details

### 1. React Migration

**File Structure:**
```
src/views/
├── schedule.js → schedule.legacy.js (backup)
├── Schedule.jsx (new React component)
└── schedule-components/
    ├── ScheduleHeader.jsx
    ├── CalendarGrid.jsx
    ├── CalendarCell.jsx
    └── ServiceMarker.jsx
```

**Vite Configuration:**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ... existing config
});
```

**Router Integration:**
```javascript
// src/main.js
import { createRoot } from 'react-dom/client';
import Schedule from './views/Schedule.jsx';

function loadSchedulePage() {
  const container = document.getElementById('schedule-calendar');
  const root = createRoot(container);
  root.render(<Schedule />);
}
```

### 2. Drag-and-Drop Implementation

**DndContext Setup:**
```jsx
import { DndContext, DragOverlay, useSensors, useSensor, MouseSensor, TouchSensor } from '@dnd-kit/core';

function Schedule() {
  const [services, setServices] = useState([]);
  const [activeService, setActiveService] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,    // Long press on mobile
        tolerance: 5   // Allow 5px movement before canceling
      }
    })
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CalendarGrid services={services} />
      <DragOverlay>
        {activeService && <ServiceMarkerGhost service={activeService} />}
      </DragOverlay>
    </DndContext>
  );
}
```

**Draggable Service Marker:**
```jsx
import { useDraggable } from '@dnd-kit/core';

function ServiceMarker({ service }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: service.id,
    data: service
  });

  const normalizedInterval = normalizeServiceInterval(service.service_interval);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`service-marker interval-${normalizedInterval} ${isDragging ? 'dragging' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        openServiceDetailModal(service);
      }}
    >
      {service.boat?.name?.substring(0, 10)}
    </div>
  );
}
```

**Droppable Calendar Cell:**
```jsx
import { useDroppable } from '@dnd-kit/core';

function CalendarCell({ date, services }) {
  const { setNodeRef, isOver } = useDroppable({
    id: date,
    data: { date }
  });

  return (
    <div
      ref={setNodeRef}
      className={`calendar-cell ${isOver ? 'drop-target' : ''}`}
      data-date={date}
    >
      <div className="cell-date">{new Date(date).getDate()}</div>
      <div className="cell-services">
        {services.map(s => <ServiceMarker key={s.id} service={s} />)}
      </div>
    </div>
  );
}
```

**Drop Handler:**
```jsx
async function handleDragEnd(event) {
  const { active, over } = event;
  setActiveService(null);

  if (!over) return; // Dropped outside calendar

  const serviceId = active.id;
  const service = active.data.current;
  const oldDate = service.scheduled_date;
  const newDate = over.data.current.date;

  if (oldDate === newDate) return; // No change

  // Optimistic update
  setServices(prev =>
    prev.map(s => s.id === serviceId
      ? { ...s, scheduled_date: newDate }
      : s
    )
  );

  try {
    const { error } = await window.app.supabase
      .from('service_orders')
      .update({
        scheduled_date: newDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId);

    if (error) throw error;

    showToast(`✅ ${service.boat.name} rescheduled to ${formatDate(newDate)}`, 'success');
  } catch (error) {
    // Rollback on failure
    setServices(prev =>
      prev.map(s => s.id === serviceId
        ? { ...s, scheduled_date: oldDate }
        : s
      )
    );
    showToast(`❌ Failed to reschedule: ${error.message}`, 'error');
    console.error('Reschedule error:', error);
  }
}
```

### 3. Visual Feedback & Styling

**CSS for Drag States:**
```css
/* Draggable cursor states */
.service-marker {
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none; /* Prevent scroll during drag on touch */
}

.service-marker:active {
  cursor: grabbing;
}

/* During drag - original marker fades */
.service-marker.dragging {
  opacity: 0.4;
  cursor: grabbing;
}

/* Drop zone highlighting */
.calendar-cell.drop-target {
  background: var(--ss-success-light, #e8f5e9);
  border: 2px dashed var(--ss-success, #4caf50);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
  transition: all 0.2s ease;
}

/* Ghost element in DragOverlay */
.drag-overlay {
  opacity: 0.9;
  transform: rotate(2deg) scale(1.05);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 9999;
}
```

**Animation:**
- @dnd-kit provides smooth transitions automatically
- Drop animation duration: ~200ms
- Failed drops animate back to origin
- CSS transitions for hover/focus states

### 4. Data Management

**State Management:**
```jsx
function Schedule() {
  const [services, setServices] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState({
    '1-mo': true,
    '2-mo': true,
    '3-mo': true,
    'one-time': true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices(currentMonth);
  }, [currentMonth]);

  return (/* ... */);
}
```

**Data Fetching (Same as Vanilla JS):**
```javascript
async function loadServices(month) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const { data, error } = await window.app.supabase
    .from('service_orders')
    .select(`
      *,
      boat:boats(name),
      customer:customers(name)
    `)
    .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
    .lte('scheduled_date', endOfMonth.toISOString().split('T')[0])
    .in('status', ['pending', 'confirmed']);

  if (error) {
    console.error('Error loading services:', error);
    return;
  }

  setServices(data || []);
}
```

### 5. Error Handling

**Error Scenarios:**

| Scenario | Handling |
|----------|----------|
| Network failure | Rollback optimistic update, show error toast |
| RLS policy denial | Rollback, show permission error |
| Invalid date (past date) | Prevent drop, show validation error |
| Concurrent modification | Last-write-wins (acceptable for MVP) |
| Drag outside calendar | Cancel operation, no database call |
| Drag to same date | No-op, no database call |

**Rollback Pattern:**
```javascript
// Store original state
const originalDate = service.scheduled_date;

// Apply optimistic update
setServices(/* new state */);

try {
  await updateDatabase();
} catch (error) {
  // Restore original state
  setServices(prev =>
    prev.map(s => s.id === serviceId
      ? { ...s, scheduled_date: originalDate }
      : s
    )
  );
  showError(error);
}
```

### 6. Touch & Mobile Optimization

**Touch Sensor Configuration:**
```javascript
useSensor(TouchSensor, {
  activationConstraint: {
    delay: 150,      // Require 150ms press before drag activates
    tolerance: 5     // Allow 5px movement (prevents cancel during normal tap)
  }
})
```

**Prevent Scroll During Drag:**
```css
.service-marker {
  touch-action: none; /* Prevent browser scrolling when touching marker */
}
```

**Haptic Feedback (Progressive Enhancement):**
```javascript
function handleDragStart(event) {
  setActiveService(event.active.data.current);

  // Haptic feedback on supported devices
  if (navigator.vibrate) {
    navigator.vibrate(10); // Short 10ms vibration
  }
}
```

### 7. Accessibility

**Keyboard Support:**
- Existing click behavior preserved (Tab to focus, Enter to open modal)
- Drag-and-drop keyboard support deferred to future enhancement
- Screen reader users can use existing reschedule modal

**ARIA Attributes:**
```jsx
<div
  role="button"
  tabIndex={0}
  aria-label={`${service.boat.name} - ${service.service_type}`}
  {...listeners}
  {...attributes}
>
```

**Screen Reader Announcements:**
```javascript
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

// Usage
announceToScreenReader(`Rescheduled ${service.boat.name} to ${formatDate(newDate)}`);
```

## Testing Plan

### Desktop Testing (Mouse)
- [ ] Drag service marker to different date
- [ ] Verify ghost element follows cursor
- [ ] Verify drop zone highlighting
- [ ] Verify database update succeeds
- [ ] Test drag to same date (no-op)
- [ ] Test drag outside calendar (cancel)
- [ ] Verify existing click behavior works (modal opens)

### Tablet Testing (iPad)
- [ ] Long press to activate drag
- [ ] Verify no accidental drags during scroll
- [ ] Verify ghost element appears
- [ ] Verify drop zone highlighting
- [ ] Test landscape and portrait orientations

### Mobile Testing (iPhone)
- [ ] Long press to activate drag
- [ ] Verify scroll works normally (no interference)
- [ ] Verify ghost element visible
- [ ] Verify drop zones large enough for finger
- [ ] Test in Chrome and Safari

### Error Scenario Testing
- [ ] Disconnect network, verify rollback
- [ ] Modify RLS policy, verify permission error
- [ ] Drag to past date, verify validation
- [ ] Concurrent updates (two tabs), verify no data corruption

### Integration Testing
- [ ] Verify filters still work
- [ ] Verify month navigation works
- [ ] Verify "Due This Month" list updates
- [ ] Verify service detail modal opens
- [ ] Verify reschedule modal still works
- [ ] Verify scheduling mode (from Needs Scheduling) works

### Performance Testing
- [ ] Load calendar with 100+ services
- [ ] Verify smooth drag performance
- [ ] Check React DevTools for unnecessary re-renders
- [ ] Measure bundle size increase (target: <200KB)

## Implementation Phases

### Phase 1: React Setup (0.5 hours)
- Install dependencies: `react`, `react-dom`, `@dnd-kit/core`, `@vitejs/plugin-react`
- Update `vite.config.js` with React plugin
- Update `package.json`
- Test: Run `npm run dev`, verify Vite still works

### Phase 2: Component Conversion (2-3 hours)
- Create `Schedule.jsx` with basic structure
- Convert calendar rendering logic
- Convert month navigation
- Convert filters
- Convert data fetching (Supabase queries)
- Keep modals as vanilla JS imports (no conversion needed)
- Test: Calendar displays correctly, all existing features work

### Phase 3: Drag-and-Drop Integration (2-3 hours)
- Wrap calendar in `DndContext`
- Make service markers draggable with `useDraggable`
- Make calendar cells droppable with `useDroppable`
- Implement `onDragEnd` handler
- Add database update logic
- Test: Can drag and drop, database updates correctly

### Phase 4: Visual Feedback (1 hour)
- Add `DragOverlay` for ghost element
- Style `.dragging` state
- Style `.drop-target` state
- Add CSS animations
- Test: Visual feedback smooth and clear

### Phase 5: Error Handling (0.5 hours)
- Implement optimistic updates
- Add rollback logic
- Add error toasts
- Test: Network failures handled gracefully

### Phase 6: Testing & Polish (1.5 hours)
- Desktop testing (mouse)
- Tablet testing (touch)
- Mobile testing (touch)
- Cross-browser testing (Chrome, Safari, Firefox)
- Fix bugs, refine animations

### Phase 7: Deployment (0.5 hours)
- Update router to load React version
- Remove or hide legacy schedule.js
- Deploy to Vercel preview
- Test in production environment
- Merge to main

## Rollback Plan

**If Issues Arise:**
1. Revert router to load `schedule.legacy.js`
2. No database changes, so no migration rollback needed
3. Remove React dependencies if not used elsewhere

**Backup Strategy:**
- Keep `schedule.legacy.js` indefinitely
- Document how to switch back in code comments
- Monitor error logs first 48 hours after deploy

## Future Enhancements

**Post-MVP Features (Not in Initial Scope):**
- Conflict detection / capacity warnings (5 bookings per day)
- Undo functionality (toast with "Undo" button)
- Keyboard-only drag (Tab + Space + Arrow keys for accessibility)
- Batch drag (select multiple services, drag together)
- Drag from "Needs Scheduling" queue directly to calendar
- Multi-technician calendar (drag to assign technician)
- Time-slot-based drag (not just dates, but specific times)

## Dependencies

**New NPM Packages:**
- `react@^18.3.1`
- `react-dom@^18.3.1`
- `@dnd-kit/core@^6.1.0`
- `@vitejs/plugin-react@^4.3.4`

**Existing Dependencies (No Changes):**
- `@supabase/supabase-js` (database)
- `vite` (build system)
- Vanilla JS modals/toasts

**Database (No Schema Changes):**
- `service_orders` table (existing)
- `scheduled_date` column (existing)
- No migrations required

## Success Criteria

**Launch Criteria:**
- ✅ Can drag service markers to different dates
- ✅ Database updates correctly
- ✅ Works on desktop, tablet, and mobile
- ✅ Existing features still work (modal, filters, navigation)
- ✅ Error handling prevents data loss
- ✅ No performance degradation

**Post-Launch Metrics:**
- 80%+ of reschedules use drag-and-drop (vs. modal)
- Average reschedule time < 10 seconds
- Zero data loss incidents
- 90%+ user satisfaction with drag-and-drop UX

## Documentation

**Files to Update:**
- `sailorskills-operations/CLAUDE.md` - Add React to tech stack
- `sailorskills-operations/README.md` - Document drag-and-drop feature
- `docs/roadmap/2025-Q4-ACTIVE.md` - Mark task as completed
- `sailorskills-operations/package.json` - New dependencies

**Code Comments:**
- Document drag-and-drop logic in Schedule.jsx
- Add comments explaining optimistic updates
- Document touch sensor configuration
- Add rollback instructions if needed

---

**Design Approved:** 2025-11-03
**Ready for Implementation**
