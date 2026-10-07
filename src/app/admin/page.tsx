import { requireStaff } from "@/server/authz";

export default async function AdminHomePage() {
  // Layouts don't re-run on every navigation, so each page checks access itself.
  const staff = await requireStaff();

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <h1 className="text-2xl font-semibold">Welcome, {staff.name}</h1>
      <p>
        {staff.role === "ADMIN"
          ? "You have full access: you can view and change everything in the admin area."
          : "You have view-only access: you can see everything in the admin area but cannot change anything."}
      </p>
    </div>
  );
}
