import { EmployeeProfileView } from "@/components/console/employee-profile";

export default function ConsoleEmployeeProfilePage({
  params,
}: {
  params: { id: string };
}) {
  return <EmployeeProfileView employeeId={params.id} />;
}
