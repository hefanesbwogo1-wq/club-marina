import { after, before, test } from "node:test";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "club-marina-mis",
    firestore: {
      rules: fs.readFileSync("firestore.candidate.rules", "utf8"),
    },
  });

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    const profiles = [
      ["ordinary-staff", "cashier", true],
      ["manager-user", "manager", true],
      ["admin-user", "admin", true],
      ["inactive-user", "cashier", false],
    ];

    for (const [uid, role, active] of profiles) {
      await setDoc(doc(db, "staff", uid), { role, active });
      await setDoc(doc(db, "users", uid), { role, active });
      await setDoc(doc(db, "appUsers", uid), { role, active });
    }

    await setDoc(doc(db, "staff", "another-user"), {
      role: "waiter",
      active: true,
    });

    await setDoc(doc(db, "users", "another-user"), {
      role: "waiter",
      active: true,
    });

    await setDoc(doc(db, "products", "test-product"), {
      name: "Test product",
    });
  });
});

after(async () => {
  if (env) await env.cleanup();
});

test("Unauthenticated users cannot read products", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "products", "test-product")));
});

test("Active cashier can read products", async () => {
  const db = env.authenticatedContext("ordinary-staff").firestore();
  await assertSucceeds(getDoc(doc(db, "products", "test-product")));
});

test("Inactive staff cannot read products", async () => {
  const db = env.authenticatedContext("inactive-user").firestore();
  await assertFails(getDoc(doc(db, "products", "test-product")));
});

test("Cashier cannot promote their own users profile", async () => {
  const db = env.authenticatedContext("ordinary-staff").firestore();
  await assertFails(
    setDoc(doc(db, "users", "ordinary-staff"), {
      role: "super_admin",
      active: true,
    })
  );
});

test("Cashier cannot write another staff profile", async () => {
  const db = env.authenticatedContext("ordinary-staff").firestore();
  await assertFails(
    setDoc(doc(db, "staff", "another-user"), {
      role: "super_admin",
      active: true,
    })
  );
});

test("Manager can read staff profiles", async () => {
  const db = env.authenticatedContext("manager-user").firestore();
  await assertSucceeds(getDoc(doc(db, "staff", "another-user")));
});

test("Administrator can read another user's profile", async () => {
  const db = env.authenticatedContext("admin-user").firestore();
  await assertSucceeds(getDoc(doc(db, "users", "another-user")));
});
