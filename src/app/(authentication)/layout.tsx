export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="w-screen h-screen grid place-items-center bg-zinc-100 dark:bg-zinc-950">
      {children}
    </main>
  );
}
