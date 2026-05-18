import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminArusLoginClient from "./AdminArusLoginClient";

export const revalidate = 0;

export default async function AdminArusLoginPage() {
  const session = await auth();

  // If already logged in as ADMIN or CASHIER, redirect to their respective dashboard
  if (session?.user) {
    const role = session.user.role;
    if (role === "ADMIN") {
      redirect("/admin");
    } else if (role === "CASHIER") {
      redirect("/admin/cashier");
    }
    // We do not redirect CUSTOMERs or other roles, in case they are trying to log in
    // with their Admin or Cashier credentials to perform admin operations.
  }

  return <AdminArusLoginClient />;
}
