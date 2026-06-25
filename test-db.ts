// test-db.ts (delete after testing)
import { connectToDatabase } from "@/lib/mongodb";

async function test() {
  const conn = await connectToDatabase();
  console.log("Connected:", conn.connection.readyState === 1);
}

test();