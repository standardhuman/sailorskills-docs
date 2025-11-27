# Debug Service Completion - Reload Recovery

## Test Steps

1. **Open Browser Console** (F12)

2. **Start Service for Maris**:
   ```
   Expected console output:
   ✅ Service started - service_log created: <uuid>
   ```

3. **Check Database** (before reload):
   ```sql
   SELECT id, boat_id, service_date, service_started_at, in_progress
   FROM service_logs
   WHERE in_progress = true
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Reload Page**

5. **Select Maris Again**:
   ```
   Watch console for:
   - handleBoatSelection() called
   - checkExistingServiceLog() running
   - Query results
   ```

## Expected Database State

After "Start Service":
```json
{
  "id": "<uuid>",
  "boat_id": "<maris-boat-id>",
  "service_date": "2025-11-06",
  "service_started_at": "2025-11-06T18:30:15.123Z",
  "in_progress": true,
  "service_ended_at": null
}
```

## Common Issues

### Issue 1: RLS Policy Blocking Read
**Symptom**: Query returns no rows even though record exists

**Fix**: Check RLS policies on `service_logs` table
```sql
-- View policies
SELECT * FROM pg_policies WHERE tablename = 'service_logs';

-- Test with service role (bypasses RLS)
-- If this returns data, RLS is the issue
```

### Issue 2: Date Mismatch
**Symptom**: service_date doesn't match today's date

**Check timezone**:
```javascript
// In console
console.log('Browser timezone:', new Date().toISOString());
console.log('Service date format:', new Date().toISOString().split('T')[0]);
```

### Issue 3: service_date Column Missing
**Symptom**: Query fails or returns unexpected results

**Verify schema**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'service_logs' 
  AND column_name IN ('service_date', 'service_started_at', 'in_progress');
```

## Add Debug Logging

Add this to `checkExistingServiceLog()`:

```javascript
async function checkExistingServiceLog(boatId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('🔍 Checking for in-progress service:', { boatId, today });

    const { data: existingLog, error } = await window.app.supabase
      .from('service_logs')
      .select('*')
      .eq('boat_id', boatId)
      .eq('service_date', today)
      .eq('in_progress', true)
      .single();

    console.log('📊 Query result:', { existingLog, error });

    // ... rest of function
  }
}
```
