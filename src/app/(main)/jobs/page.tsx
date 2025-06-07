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
import { IJobRole } from "@/db/models/JobRole";
const Jobs = () => {
  const router = useRouter();
  const context = useJobRoles();
  console.log("the context is", context);
  const { jobRoles, isLoading, error, fetchJobRoles } = context;
  const { data: session, status: sessionStatus } = useSession();
  const hrId = session?.user?.id;
  useEffect(() => {
    if (hrId && sessionStatus === "authenticated") {
      fetchJobRoles(hrId)
        .then(() => {
          if (jobRoles.length === 0) {
            toast.info("No job roles found for this HR.");
          }
        })
        .catch((err) => {
          toast.error(err.message || "Failed to fetch job roles");
        });
    } else if (sessionStatus === "unauthenticated") {
      toast.error("Please log in to view job roles.");
    }
  }, [jobRoles.length, hrId, sessionStatus, fetchJobRoles]);

  const getCardProps = (job: IJobRole) => {
    const currentStage =
      job.hiringProcessStages.find((stage) => stage.status === "ongoing") ||
      job.hiringProcessStages[0];
    const nextStageIndex =
      currentStage && job.hiringProcessStages.length > 0
        ? job.hiringProcessStages.indexOf(currentStage) + 1
        : -1;
    const nextStage =
      nextStageIndex >= 0 && nextStageIndex < job.hiringProcessStages.length
        ? job.hiringProcessStages[nextStageIndex]
        : null;

    return {
      id: job._id.toString(),
      position: job.positionTitle,
      status: job.status || "draft",
      pay: job.pay, // Placeholder: Add to schema or derive
      currStage: currentStage?.name || "N/A",
      nextStage: nextStage?.name || "N/A",
      workType: job.workType || "N/A", // Placeholder: Add to schema
      totalApplication: job.hiringProcessStages.reduce(
        (sum, stage) => sum + (stage.appearedCandidates?.length || 0),
        0
      ),
      appearing: currentStage?.appearedCandidates?.length || 0,
    };
  };

  const [filters, setFilters] = useState<{
    status: string[];
    workType: string[];
  }>({
    status: [],
    workType: [],
  });
  const [sortBy, setSortBy] = useState<string>("newest");

  const filteredAndSortedJobs = React.useMemo(() => {
    let result = [...jobRoles];

    // Apply filters
    if (filters.status.length > 0) {
      result = result.filter((job) =>
        filters.status.includes(job.status || "draft")
      );
    }
    if (filters.workType.length > 0) {
      result = result.filter((job) =>
        filters.workType.includes(job.workType || "hybrid")
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime()
        );
      } else if (sortBy === "oldest") {
        return (
          new Date(a.postingDate).getTime() - new Date(b.postingDate).getTime()
        );
      } else if (sortBy === "name") {
        return a.positionTitle.localeCompare(b.positionTitle);
      }
      return 0;
    });

    return result;
  }, [jobRoles, filters, sortBy]);
  return (
    <>
      <div className="w-full max-w-[60rem] h-12 flex items-center justify-end-safe p-2 relative gap-2">
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
      )}
      {sessionStatus === "authenticated" && (
        <>
          {isLoading && <p className="p-4 text-center">Loading job roles...</p>}
          {error && (
            <div className="p-4 text-center">
              <p className="text-red-500">{error}</p>
              <Button
                variant="outline"
                onClick={() => hrId && fetchJobRoles(hrId)}
              >
                Retry
              </Button>
            </div>
          )}
          {!isLoading &&
            !error &&
            jobRoles.length === 0 &&
            filteredAndSortedJobs.length === 0 && (
              <p className="p-4 text-center">No job roles found.</p>
            )}
          <div
            className={`p-4 w-full h-max grid max-sm:grid-cols-1 max-md:grid-cols-2 max-lg:grid-cols-3 max-2xl:grid-cols-4 grid-cols-5 gap-4 scroll-smooth`}
          >
            {filteredAndSortedJobs.map((job) => (
              <Card key={job._id.toString()} {...getCardProps(job)} />
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Jobs;
