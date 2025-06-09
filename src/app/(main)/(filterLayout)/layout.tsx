"use client";
import React, { useEffect, useState } from "react";
import Card from "@/components/square-card";
import { Button } from "@/components/ui/button";
import FilterBox from "@/components/filterBox";
import SelectBox from "@/components/selectBox";
import { useRouter } from "next/navigation";
import { useJobRoles } from "@/context/JobRoleContext";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
export default function FilterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  const { data: session, status: sessionStatus } = useSession();
  const hrId = session?.user?.id;
  return (
    <main className="w-full h-screen relative overflow-y-scroll bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center">
      {/* <div className="w-full max-w-[60rem] h-12 flex items-center justify-end-safe p-2 relative gap-2">
        <div className="flex items-center justify-center gap-2">
          <FilterBox onFilterChange={setFilters} />
        </div>
        <div className="flex items-center justify-center gap-2">
          <SelectBox
            selectValues={["newest", "oldest", "name"]}
            selectLabel="sortBy"
            onSortChange={setSortBy}
          />
        </div>
        <Button
          className="w-max h-max px-2.5 bg-white text-black rounded-2xl "
          onClick={() => {
            router.push("/jobs/create");
          }}
        >
          Create New
        </Button>
      </div>
      {sessionStatus === "loading" && (
        <p className="p-4 text-center">Loading session...</p>
      )}
      {sessionStatus === "unauthenticated" && (
        <p className="p-4 text-center text-red-500">
          Please log in to view job roles.
        </p>
      )} */}
      <div className={`p-4 w-full h-full scroll-smooth`}>{children}</div>
    </main>
  );
}
