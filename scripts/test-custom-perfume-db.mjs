// Runs in a rolled-back transaction; never leaves test users, requests, or settings behind.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL || process.env.Direct_connection_str, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const owner = randomUUID();
const other = randomUUID();
const requestId = randomUUID();
const addressId = randomUUID();
let passed = 0;
let step = "connect";

async function identity(role, id) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
  await client.query(`set local role ${role}`);
}
async function denied(operation, code) {
  await client.query("savepoint expected_denial");
  let failure;
  try { await operation(); } catch (error) { failure = error; }
  await client.query("rollback to savepoint expected_denial");
  assert.equal(failure?.code, code);
  passed++;
}
const insert = (id) => client.query(`insert into public.custom_perfume_requests
  (id, reference_brand, reference_name, fragrance_notes, scent_preferences, bottle_size, budget, contact_name, contact_email, contact_phone, profile_acknowledged)
  values ($1, 'Test brand', 'Test scent', 'Rose and amber', 'Soft and warm', 50, 1500, 'Test Customer', 'test@example.com', '0000000000', true)`, [id]);

try {
  await client.connect();
  await client.query("begin");
  await client.query("set local statement_timeout = '10s'");
  await client.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,'{}'),($3,$4,'{}')", [owner, `scent-${owner}@example.com`, other, `scent-${other}@example.com`]);
  await client.query("update public.custom_perfume_settings set enabled = true where id = true");
  await identity("anon", "");
  await denied(() => insert(randomUUID()), "42501");
  await denied(() => client.query("select * from public.custom_perfume_requests"), "42501");
  assert.equal((await client.query("select enabled from public.custom_perfume_settings")).rows[0].enabled, true); passed++;
  await identity("authenticated", owner);
  await insert(requestId); passed++;
  assert.equal((await client.query("select auth_user_id,status from public.custom_perfume_requests where id=$1", [requestId])).rows[0].auth_user_id, owner); passed++;
  await denied(() => client.query("update public.custom_perfume_requests set status='completed' where id=$1", [requestId]), "42501");
  await denied(() => client.query("update public.custom_perfume_settings set enabled=false"), "42501");
  await denied(() => client.query("select * from public.custom_perfume_internal_notes"), "42501");
  await denied(() => client.query("select public.manage_custom_perfume_request($1,1,'completed',null,'','')", [requestId]), "42501");
  await denied(() => client.query("insert into public.custom_perfume_requests (auth_user_id) values ($1)", [other]), "42501");
  await identity("authenticated", other);
  assert.equal((await client.query("select id from public.custom_perfume_requests where id=$1", [requestId])).rowCount, 0); passed++;
  assert.equal((await client.query("select id from public.custom_perfume_updates where request_id=$1", [requestId])).rowCount, 0); passed++;
  await identity("service_role", "");
  await client.query("select public.manage_custom_perfume_request($1,1,'quoted',2000,'50ml with shipping','Private note')", [requestId]); passed++;
  await denied(() => client.query("select public.manage_custom_perfume_request($1,1,'completed',2000,'Stale quotation','Overwrite')", [requestId]), "40001");
  await identity("authenticated", owner);
  const quoted = (await client.query("select status,quotation_amount from public.custom_perfume_requests where id=$1", [requestId])).rows[0];
  assert.equal(quoted.status, "quoted");
  assert.equal(Number(quoted.quotation_amount), 2000);
  assert.equal((await client.query("select id from public.custom_perfume_updates where request_id=$1", [requestId])).rowCount, 2); passed++;
  await identity("service_role", "");
  step = "second admin quotation";
  await client.query("select public.manage_custom_perfume_request($1,2,'quoted',2000,'50ml with shipping','Private note changed')", [requestId]);
  assert.equal((await client.query("select id from public.custom_perfume_updates where request_id=$1", [requestId])).rowCount, 2); passed++;
  await identity("authenticated", owner);
  step = "insert custom order address";
  await client.query(`insert into public.delivery_addresses
    (id, auth_user_id, label, recipient_name, phone, address_line_1, city, state, postal_code, country)
    values ($1, $2, 'Default', 'Test Customer', '0000000000', '10 Test Street', 'Aligarh', 'Uttar Pradesh', '202001', 'India')`, [addressId, owner]);
  step = "accept custom perfume quote";
  const acceptedOrder = (await client.query("select public.accept_custom_perfume_quote($1,$2) as order_number", [requestId, addressId])).rows[0].order_number;
  assert.match(acceptedOrder, /^ALQ-/); passed++;
  step = "verify custom order";
  const customOrder = (await client.query("select id,custom_perfume_request_id,total from public.orders where custom_perfume_request_id=$1", [requestId])).rows[0];
  assert.equal(customOrder.custom_perfume_request_id, requestId);
  assert.equal(Number(customOrder.total), 2000); passed++;
  assert.equal((await client.query("select product_id,product_name,unit_price from public.order_items where order_id=$1", [customOrder.id])).rows[0].product_id, null); passed++;
  assert.equal((await client.query("select status from public.custom_perfume_requests where id=$1", [requestId])).rows[0].status, "in_progress"); passed++;
  step = "verify idempotent custom order acceptance";
  assert.equal((await client.query("select public.accept_custom_perfume_quote($1,$2)", [requestId, addressId])).rows[0].accept_custom_perfume_quote, acceptedOrder); passed++;
  assert.equal((await client.query("select id from public.custom_perfume_updates where request_id=$1", [requestId])).rowCount, 3); passed++;
  await identity("service_role", "");
  step = "disable new custom perfume requests";
  await client.query("update public.custom_perfume_settings set enabled = false, homepage_enabled = false where id = true");
  await identity("authenticated", owner);
  await denied(() => insert(randomUUID()), "P0001");
  assert.equal((await client.query("select id from public.custom_perfume_requests where id=$1", [requestId])).rowCount, 1); passed++;
  console.log(`PASS: ${passed} database checks (RLS, ownership, private notes, quotation history, stale writes, feature disabling). All fixtures rolled back.`);
} catch (error) {
  console.error("Database checks failed", { step, code: error.code || error.name, message: error instanceof assert.AssertionError ? error.message : "Database operation failed; no credentials logged." });
  process.exitCode = 1;
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
