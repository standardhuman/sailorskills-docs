# Integration Testing Checklist

**Migration Status:** ✅ COMPLETED
**Date:** 2025-10-26

Now that the database migration is complete, test each fix to verify everything works.

---

## 🧪 Test #1: Operations Packing Lists

### Steps:
1. Navigate to: https://ops.sailorskills.com
2. Login: `standardhuman@gmail.com` / `KLRss!650`
3. Click the **"Packing Lists"** tab in navigation
4. Check **Monthly View** (should be selected by default)

### Expected Results:
✅ **NO** "Error loading packing list" message
✅ Page loads successfully (may show "No services scheduled this month" if empty)
✅ **Browser console shows NO 400 errors** for `service_orders`
✅ **Browser console shows NO 400 errors** for `boat_service_flags`

### If you see services:
✅ Boat names display correctly
✅ "Anodes to Retrieve" section appears (if any flagged)
✅ Storage locations show for retrieval items

### Console Check:
Open browser DevTools (F12) → Console tab
- Look for: ✅ No red 400 errors on `/rest/v1/service_orders`
- Look for: ✅ No red 400 errors on `/rest/v1/boat_service_flags`

---

## 🧪 Test #2: Inventory Orders (Replenishment Queue)

### Steps:
1. Navigate to: https://sailorskills-inventory-kqes0q8hl-brians-projects-bc2d3592.vercel.app
2. Login with password if prompted
3. Click the **"Orders"** tab in navigation
4. Look at **"📋 Replenishment Queue"** section (top of page)

### Expected Results:
✅ **NO** "Error loading data" message
✅ Section loads successfully
✅ **Browser console shows NO 400 errors** for `replenishment_queue`

### If queue is empty:
✅ Shows empty state with icon and message: "Items will appear here when services require reordering"

### If queue has items:
✅ Table displays with columns: Priority, Item, Type, Quantity, etc.
✅ Priority badges show colors (red=urgent, orange=high, etc.)
✅ Status badges show (yellow=pending, blue=ordered, etc.)
✅ Action buttons appear (📦 Mark Ordered, ❌ Cancel)

### Console Check:
Open browser DevTools (F12) → Console tab
- Look for: ✅ No red 400 errors on `/rest/v1/replenishment_queue`

---

## 🧪 Test #3: Billing Modal Stock Display

### Steps:
1. Navigate to: https://billing.sailorskills.com
2. Login: `standardhuman@gmail.com` / `KLRss!650`
3. Find a boat with multiple anodes (e.g., "Maris" or any test boat)
4. Create or open a service
5. Assign different statuses to anodes:
   - At least 1 anode: **"retrieve"** status
   - At least 1 anode: **"order"** status
6. Click **"Review Inventory Actions"** button

### Expected Results:

#### For "Retrieve" anodes:
✅ Shows: `(X in stock, Y available)` format
✅ Example: `(1 in stock, 0 available)` or `(3 in stock, 3 available)`
✅ **NOT** just `(0 available)` - must show BOTH numbers

#### For "Order" anodes:
✅ Shows: `(X in stock - need to order more)` or `(stock unknown - will order)`
✅ **NOT** hardcoded `(out of stock)` for all items
✅ Shows actual stock level if known

#### Stock Warning Banner:
✅ If low stock, shows: "⚠️ Low stock alert: Only X units available"
✅ Banner count should make sense with item counts

---

## 🧪 Test #4: Complete Integration Workflow

This tests the full cycle: Billing → Database → Inventory → Operations

### Step 1: Create Order in Billing
1. Go to Billing service
2. Process a service with anode marked as **"order"** (out of stock)
3. Click "Review Inventory Actions"
4. Verify modal shows order will be created
5. Click "Confirm & Finalize Service"
6. Wait for success message

### Step 2: Verify in Inventory Orders
1. Go to Inventory service → Orders tab
2. **SHOULD SEE:** New item in Replenishment Queue
3. **Verify details:**
   - ✅ Item name matches the anode
   - ✅ Priority is "high" (red or orange badge)
   - ✅ Status is "pending" (yellow badge)
   - ✅ Source shows "customer_charge"
   - ✅ Reference shows "service_log"

### Step 3: Process Order in Inventory
1. Click **"📦 Mark Ordered"** button
2. **SHOULD SEE:** Status changes to "ordered" (blue badge)
3. Click **"✅ Mark Received"** button
4. Confirm the popup: "Mark as received? This will increment inventory."
5. **SHOULD SEE:** Status changes to "received" (green badge)
6. **SHOULD SEE:** Inventory quantity incremented

### Step 4: Create Retrieval Task in Billing
1. Go back to Billing
2. Process another service with anode marked as **"retrieve"**
3. Click "Review Inventory Actions"
4. Verify modal shows:
   - Storage location (📍 storage or actual location)
   - Stock info: `(X in stock, Y available)`
5. Click "Confirm & Finalize Service"

### Step 5: Verify in Operations Packing List
1. Go to Operations → Packing Lists
2. Select **Monthly View** or **Daily View**
3. **SHOULD SEE:** Boat appears in "Anodes to Retrieve" section
4. **Verify details:**
   - ✅ Shows anode name
   - ✅ Shows storage location
   - ✅ Shows retrieval instructions

### Success Criteria:
✅ Data flows from Billing → Database
✅ Inventory displays and manages orders
✅ Operations displays retrieval tasks
✅ Stock levels update correctly
✅ No errors in any service

---

## 🎯 Summary Test Results

Fill this out as you test:

### Operations Packing Lists:
- [ ] Loads without errors
- [ ] No 400 errors in console
- [ ] Displays services (if any scheduled)
- [ ] Shows retrieval tasks (if any created)

### Inventory Orders:
- [ ] Replenishment Queue loads
- [ ] No 400 errors in console
- [ ] Can mark items as ordered
- [ ] Can mark items as received
- [ ] Inventory increments correctly

### Billing Modal:
- [ ] Shows stock in `(X in stock, Y available)` format
- [ ] Order items show actual stock (not hardcoded)
- [ ] Warning banner shows correct count

### End-to-End:
- [ ] Can create order in Billing
- [ ] Order appears in Inventory
- [ ] Can process order through workflow
- [ ] Can create retrieval task in Billing
- [ ] Task appears in Operations

---

## 🐛 If You Find Issues:

1. **Take screenshot** of the error
2. **Copy console errors** (F12 → Console)
3. **Note which step** failed
4. **Check browser network tab** for failed requests
5. Report back with details

---

## 🎉 If Everything Works:

Congratulations! The integration is complete and working. All three services are now connected:

- ✅ Billing creates inventory actions
- ✅ Inventory manages replenishment
- ✅ Operations displays packing tasks
- ✅ Data flows correctly between services

---

**Start testing now and report back what you find!** 🚀
