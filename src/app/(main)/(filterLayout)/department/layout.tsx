export default function DeparmentLayout({
  children,
  createDepartment,
}: {
  children: React.ReactNode;
  createDepartment: React.ReactNode;
}) {
  return (
    <div
      className="w-full md:h-full h-[calc(100vh-3.5rem)] border-2 border-green-500 overflow-y-scroll relative flex"
      style={{ scrollbarWidth: "thin" }}
    >
      {createDepartment}
      {children}
    </div>
  );
}
