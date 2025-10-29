/**
 * Integration Test: Inventory → Operations Integration
 *
 * Tests inventory management and operations coordination
 *
 * Flow:
 * 1. Inventory syncs anode catalog from boatzincs.com
 * 2. Operations generates packing list for service
 * 3. Packing list shows correct stock levels
 * 4. Service completion depletes stock
 * 5. Low stock alerts trigger
 *
 * Business Value: Ensures field team has necessary parts for services
 */

import { test, expect } from '@playwright/test';
import {
  createTestData,
  cleanupTestData,
  loginAsAdmin,
  waitForSync,
  getFromDatabase,
  verifyInDatabase,
} from './test-helpers.js';

test.describe('Inventory → Operations Integration', () => {
  let testData;
  let testAnode;
  let testInventory;

  test.beforeAll(async () => {
    testData = await createTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData(testData);

    // Cleanup test anode and inventory
    const { supabase } = await import('./test-helpers.js');
    if (testAnode?.id) {
      await supabase.from('anodes_catalog').delete().eq('id', testAnode.id);
    }
  });

  test('should create anode in catalog and verify stock levels', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create test anode in catalog
    const anodeSKU = `TEST-ANODE-${Date.now()}`;
    const { data: anode, error: anodeError } = await supabase
      .from('anodes_catalog')
      .insert({
        name: 'Test Shaft Anode - 3/4"',
        sku: anodeSKU,
        boatzincs_id: `BZ-${Date.now()}`,
        material: 'zinc',
        category: 'shaft',
        list_price: 45.00,
        sale_price: 39.99,
        is_on_sale: true,
        is_active: true,
        stock_status: 'in_stock'
      })
      .select()
      .single();

    expect(anodeError).toBeNull();
    expect(anode).toBeTruthy();
    expect(anode.name).toContain('Test Shaft Anode');

    testAnode = anode; // Save for cleanup

    // Step 2 - Create inventory record for the anode
    const { data: inventory, error: inventoryError } = await supabase
      .from('anode_inventory')
      .insert({
        anode_id: anode.id,
        quantity_on_hand: 25,
        quantity_allocated: 5,
        reorder_point: 10,
        reorder_quantity: 20,
        preferred_stock_level: 30,
        primary_location: 'Ammo Can A',
        bin_number: 'A-12',
        average_cost: 35.00,
        storage_location: 'Ammo Can A'
      })
      .select()
      .single();

    expect(inventoryError).toBeNull();
    expect(inventory).toBeTruthy();
    expect(inventory.quantity_available).toBe(20); // 25 - 5 = 20 (computed field)

    testInventory = inventory; // Save for later tests

    // Step 3 - Verify the anode can be queried with inventory details
    const { data: anodeWithInventory } = await supabase
      .from('anodes_catalog')
      .select(`
        *,
        anode_inventory (
          quantity_on_hand,
          quantity_allocated,
          quantity_available,
          storage_location,
          bin_number
        )
      `)
      .eq('id', anode.id)
      .single();

    expect(anodeWithInventory.anode_inventory).toBeTruthy();
    expect(anodeWithInventory.anode_inventory.quantity_available).toBe(20);
    expect(anodeWithInventory.anode_inventory.storage_location).toBe('Ammo Can A');

    // TODO: Once Operations packing list UI is complete, add verification:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click('a[href="#packing"]');
    // await expect(page.locator(`text=${anodeSKU}`)).toBeVisible();
    // await expect(page.locator('.stock-level:has-text("20 available")')).toBeVisible();
  });

  test('should verify catalog-inventory join relationship', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Query anodes_catalog with joined inventory data
    const { data: anodes } = await supabase
      .from('anodes_catalog')
      .select(`
        id,
        name,
        sku,
        list_price,
        anode_inventory!inner (
          quantity_on_hand,
          quantity_allocated,
          quantity_available,
          reorder_point,
          storage_location
        )
      `)
      .eq('is_active', true)
      .limit(5);

    expect(anodes).toBeTruthy();
    expect(Array.isArray(anodes)).toBeTruthy();

    // Step 2 - Verify each anode has inventory data
    if (anodes.length > 0) {
      const firstAnode = anodes[0];
      expect(firstAnode.anode_inventory).toBeTruthy();
      expect(typeof firstAnode.anode_inventory.quantity_available).toBe('number');

      // Step 3 - Verify quantity_available is calculated correctly (on_hand - allocated)
      const inventory = firstAnode.anode_inventory;
      const expectedAvailable = inventory.quantity_on_hand - inventory.quantity_allocated;
      expect(inventory.quantity_available).toBe(expectedAvailable);
    }

    // TODO: Once Operations uses this query for packing lists, verify UI shows correct stock
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click('a[href="#packing"]');
    // Verify stock levels displayed match database query
  });

  test('should link boat anodes to catalog', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Use the testAnode from the first test (assumes tests run in order)
    // If testAnode doesn't exist, create one
    if (!testAnode) {
      const { data: anode } = await supabase
        .from('anodes_catalog')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
      testAnode = anode;
    }

    // Step 1 - Create boat_anode linking test boat to catalog anode
    const { data: boatAnode, error: boatAnodeError } = await supabase
      .from('boat_anodes')
      .insert({
        boat_id: testData.boat.id,
        anode_catalog_id: testAnode.boatzincs_id, // Links to anodes_catalog.boatzincs_id
        anode_name: testAnode.name,
        location: 'Shaft',
        quantity: 2,
        condition: 'good',
        last_condition_percent: 75,
        is_active: true
      })
      .select()
      .single();

    expect(boatAnodeError).toBeNull();
    expect(boatAnode).toBeTruthy();
    expect(boatAnode.boat_id).toBe(testData.boat.id);
    expect(boatAnode.quantity).toBe(2);

    // Step 2 - Verify boat anode can be queried back
    const { data: retrievedBoatAnodes } = await supabase
      .from('boat_anodes')
      .select('*')
      .eq('boat_id', testData.boat.id);

    expect(retrievedBoatAnodes).toBeTruthy();
    expect(Array.isArray(retrievedBoatAnodes)).toBeTruthy();
    expect(retrievedBoatAnodes.length).toBeGreaterThan(0);

    const shaftAnode = retrievedBoatAnodes.find(a => a.location === 'Shaft');
    expect(shaftAnode).toBeTruthy();
    expect(shaftAnode.quantity).toBe(2);
    expect(shaftAnode.anode_catalog_id).toBe(testAnode.boatzincs_id);

    // TODO: Once Operations packing list uses boat_anodes for anode requirements:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click(`[data-boat-id="${testData.boat.id}"]`);
    // await page.click('a[href="#packing"]');
    // await expect(page.locator('text=Shaft (2 required)')).toBeVisible();
  });

  test('should create and track inventory transaction', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Use testInventory from first test
    if (!testInventory || !testAnode) {
      // Skip if test dependencies not met
      return;
    }

    // Step 1 - Get initial stock level
    const { data: initialInventory } = await supabase
      .from('anode_inventory')
      .select('quantity_on_hand, quantity_available')
      .eq('id', testInventory.id)
      .single();

    // Step 2 - Create inventory transaction (service usage - 3 anodes installed)
    const { data: transaction, error: transError } = await supabase
      .from('inventory_transactions')
      .insert({
        transaction_type: 'service_usage',
        anode_id: testAnode.id,
        inventory_id: testInventory.id,
        quantity: -3, // Negative for consumption
        quantity_change: -3,
        quantity_before: initialInventory.quantity_on_hand,
        quantity_after: initialInventory.quantity_on_hand - 3,
        reference_type: 'service_log',
        reference_id: 'test-service-123',
        reference_notes: 'Integration test - shaft anodes installed',
        performed_by: 'Test User',
        status: 'completed'
      })
      .select()
      .single();

    expect(transError).toBeNull();
    expect(transaction).toBeTruthy();
    expect(transaction.transaction_type).toBe('service_usage');
    expect(transaction.quantity).toBe(-3);

    // Step 3 - Update inventory to reflect transaction
    const { error: updateError } = await supabase
      .from('anode_inventory')
      .update({
        quantity_on_hand: initialInventory.quantity_on_hand - 3
      })
      .eq('id', testInventory.id);

    expect(updateError).toBeNull();

    // Step 4 - Verify stock decreased correctly
    const { data: updatedInventory } = await supabase
      .from('anode_inventory')
      .select('quantity_on_hand, quantity_available')
      .eq('id', testInventory.id)
      .single();

    expect(updatedInventory.quantity_on_hand).toBe(initialInventory.quantity_on_hand - 3);

    // Step 5 - Verify transaction can be queried
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('anode_id', testAnode.id)
      .eq('transaction_type', 'service_usage');

    expect(transactions).toBeTruthy();
    expect(transactions.length).toBeGreaterThan(0);

    // TODO: Once Operations service completion creates inventory transactions:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // Complete service and verify transaction is created automatically
  });

  test('should detect low stock levels', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Create anode with low stock
    const lowStockSKU = `TEST-LOW-STOCK-${Date.now()}`;
    const { data: lowStockAnode } = await supabase
      .from('anodes_catalog')
      .insert({
        name: 'Test Low Stock Anode',
        sku: lowStockSKU,
        boatzincs_id: `BZ-LOW-${Date.now()}`,
        material: 'zinc',
        category: 'shaft',
        list_price: 50.00,
        is_active: true
      })
      .select()
      .single();

    // Step 2 - Create inventory with stock below reorder point
    const { data: lowStockInventory } = await supabase
      .from('anode_inventory')
      .insert({
        anode_id: lowStockAnode.id,
        quantity_on_hand: 3,
        quantity_allocated: 0,
        reorder_point: 10, // Stock (3) is below reorder point (10)
        reorder_quantity: 20,
        preferred_stock_level: 30,
        storage_location: 'Ammo Can B'
      })
      .select()
      .single();

    expect(lowStockInventory.quantity_available).toBe(3);

    // Step 3 - Query for low stock items (quantity_available < reorder_point)
    const { data: lowStockItems } = await supabase
      .from('anode_inventory')
      .select(`
        *,
        anodes_catalog (
          name,
          sku,
          list_price
        )
      `)
      .lt('quantity_available', supabase.rpc('get_reorder_point', { inventory_id: lowStockInventory.id }));

    // Alternative query using simple comparison (more reliable)
    const { data: lowStockItemsSimple } = await supabase
      .from('anode_inventory')
      .select(`
        quantity_available,
        reorder_point,
        storage_location,
        anodes_catalog (
          name,
          sku
        )
      `)
      .eq('anode_id', lowStockAnode.id)
      .single();

    expect(lowStockItemsSimple).toBeTruthy();
    expect(lowStockItemsSimple.quantity_available).toBeLessThan(lowStockItemsSimple.reorder_point);

    // Step 4 - Calculate reorder needed
    const reorderNeeded = lowStockItemsSimple.reorder_point - lowStockItemsSimple.quantity_available;
    expect(reorderNeeded).toBe(7); // 10 - 3 = 7 units needed

    // Cleanup
    await supabase.from('anodes_catalog').delete().eq('id', lowStockAnode.id);

    // TODO: Once Operations packing list shows low stock warnings:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click('a[href="#packing"]');
    // await expect(page.locator('.low-stock-alert')).toBeVisible();
  });

  test('should verify stock availability for service planning', async () => {
    const { supabase } = await import('./test-helpers.js');

    // Step 1 - Query available stock across all anodes
    const { data: stockLevels } = await supabase
      .from('anode_inventory')
      .select(`
        quantity_available,
        quantity_allocated,
        reorder_point,
        anodes_catalog (
          name,
          sku,
          material,
          category
        )
      `)
      .gte('quantity_available', 1)
      .eq('anodes_catalog.is_active', true)
      .limit(10);

    expect(stockLevels).toBeTruthy();
    expect(Array.isArray(stockLevels)).toBeTruthy();

    // Step 2 - Verify each record has catalog linkage
    if (stockLevels.length > 0) {
      stockLevels.forEach(stock => {
        expect(stock.anodes_catalog).toBeTruthy();
        expect(stock.quantity_available).toBeGreaterThanOrEqual(0);
      });
    }

    // TODO: Once Operations uses this query for service planning:
    // await page.goto('https://sailorskills-operations.vercel.app');
    // await loginAsAdmin(page);
    // await page.click('a[href="#packing"]');
    // Verify UI shows available stock levels for each anode type
  });
});
