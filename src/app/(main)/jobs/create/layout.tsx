export default function JobsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="w-full h-screen relative overflow-y-scroll bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center max-sm:p-4 p-8">
      {children}
    </main>
  );
}
