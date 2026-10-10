import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "club-marina-mis";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8")
    }
  });

  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    for (const [uid, role, active] of [
      ["manager-1", "manager", true],
      ["cashier-1", "cashier", true],
      ["storekeeper-1", "storekeeper", true],
      ["inactive-1", "manager", false]
    ]) {
      await setDoc(doc(db, "staff", uid), { uid, role, active });
    }

    await setDoc(doc(db, "products", "test-product"), {
      name: "Test product",
      stock: 10
    });

    await setDoc(doc(db, "settings", "config"), {
      managerPin: "test-only"
    });
  });
});

after(async () => {
  if (env) await env.cleanup();
});

test("unauthenticated users cannot read products", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "products", "test-product"))
  );
});

test("active cashier can read products", async () => {
  await assertSucceeds(
    getDoc(doc(env.authenticatedContext("cashier-1").firestore(), "products", "test-product"))
  );
});

test("cashier cannot change product stock", async () => {
  await assertFails(
    updateDoc(
      doc(env.authenticatedContext("cashier-1").firestore(), "products", "test-product"),
      { stock: 999 }
    )
  );
});

test("cashier cannot change a staff role", async () => {
  await assertFails(
    updateDoc(
      doc(env.authenticatedContext("cashier-1").firestore(), "staff", "cashier-1"),
      { role: "admin" }
    )
  );
});

test("inactive staff cannot read products", async () => {
  await assertFails(
    getDoc(doc(env.authenticatedContext("inactive-1").firestore(), "products", "test-product"))
  );
});

test("unlisted collections are denied", async () => {
  await assertFails(
    getDoc(doc(env.authenticatedContext("cashier-1").firestore(), "privateInternalData", "secret"))
  );
});

test("cashier cannot change settings", async () => {
  await assertFails(
    updateDoc(
      doc(env.authenticatedContext("cashier-1").firestore(), "settings", "config"),
      { managerPin: "changed" }
    )
  );
});

test("manager can update products", async () => {
  await assertSucceeds(
    updateDoc(
      doc(env.authenticatedContext("manager-1").firestore(), "products", "test-product"),
      { stock: 11 }
    )
  );
});
