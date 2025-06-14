import { JobRoleProvider } from "@/context/JobRoleContext";
export default function JobsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <JobRoleProvider>
      <main className="w-full h-screen relative overflow-y-scroll bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center">
        {children}
      </main>
    </JobRoleProvider>
  );
}
