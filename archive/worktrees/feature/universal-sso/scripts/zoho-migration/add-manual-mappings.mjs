#!/usr/bin/env node
import fs from 'fs';

const mapping = JSON.parse(fs.readFileSync('customer-mapping.json'));

console.log('Current mappings:', mapping.length);

// Add the 5 manual mappings
const manualMappings = [
  {
    zoho_customer_id: '3732358000000089015',
    zoho_name: 'John Danielson',
    zoho_email: 'johncd@jps.net',
    sailor_customer_id: 'de6f0741-a2cd-4df0-af5c-3572d8e19e66',
    sailor_name: 'John Danielson',
    sailor_email: 'john.c.danielson@gmail.com'
  },
  {
    zoho_customer_id: '3732358000000088147',
    zoho_name: 'paul weismann',
    zoho_email: 'pweismann@healthyavocado.com',
    sailor_customer_id: 'fda5f6d6-a12f-4cea-afd3-9574703e87a4',
    sailor_name: 'Paul Weismann',
    sailor_email: 'paul@healthyavocado.com'
  },
  {
    zoho_customer_id: '3732358000000487017',
    zoho_name: 'Suliana Baldwin',
    zoho_email: 'jwainiqolo@gmail.com',
    sailor_customer_id: '5730012b-a2e8-4126-918f-bdb44fdfff9d',
    sailor_name: 'Suliana Baldwin',
    sailor_email: 'jwaniqolo@gmail.com'
  },
  {
    zoho_customer_id: '3732358000000490033',
    zoho_name: 'Craig Aufenkamp',
    zoho_email: 'sailing@shtudda.com',
    sailor_customer_id: 'beb3b487-a61c-4049-a2f4-146e7ac65122',
    sailor_name: 'Craig Aufenkamp',
    sailor_email: 'craig.aufenkamp@gmail.com'
  },
  {
    zoho_customer_id: '3732358000000499001',
    zoho_name: 'Stacey Sing',
    zoho_email: 'staceysing7@gmail.com',
    sailor_customer_id: '8d0dde29-80d4-4c5a-a8a7-10570ee09be7',
    sailor_name: 'Stacey Sing',
    sailor_email: 'Stacysing7@gmail.com'
  }
];

// Add to mapping
mapping.push(...manualMappings);

// Write back
fs.writeFileSync('customer-mapping.json', JSON.stringify(mapping, null, 2));

console.log('✅ Added 5 manual mappings');
console.log('New total:', mapping.length, 'mappings');
