import { after, before, test } from "node:test";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "club-marina-mis",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

after(async () => {
  await env.cleanup();
});

test("Unauthenticated users cannot read products", async () => {
  const db = env.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(db, "products", "security-test")));
});

test("Baseline: signed-in staff can currently write a super_admin profile", async () => {
  const db = env.authenticatedContext("ordinary-staff").firestore();

  await assertSucceeds(
    setDoc(doc(db, "users", "another-user"), {
      role: "super_admin",
      active: true,
    })
  );

  console.log(
    "SECURITY FINDING: Current rules allowed a staff user to write a super_admin profile."
  );
});
