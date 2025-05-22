import NavbarDemo from "@/components/navigation-bar";
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="w-full h-screen flex flex-col items-center justify-center relative overflow-y-scroll bg-zinc-100 dark:bg-zinc-950">
      <NavbarDemo />
      {children}
    </main>
  );
}
