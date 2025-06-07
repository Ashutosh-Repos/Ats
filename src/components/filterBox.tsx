"use client";
import * as React from "react";
import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu";
import { IconX } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Checked = DropdownMenuCheckboxItemProps["checked"];

const Filter = ({
  filter,
  onClick,
}: {
  filter: string;
  onClick: () => void;
}) => {
  return (
    <span
      className="w-max h-full relative rounded-xl text-xs p-2 bg-zinc-800 text-zinc-300 cursor-pointer"
      onClick={onClick}
    >
      <p>{filter}</p>
      <IconX className="w-2.5 h-2.5 absolute top-0.5 right-1" />
    </span>
  );
};

const FilterBox = ({
  onFilterChange,
}: {
  onFilterChange: (filters: { status: string[]; workType: string[] }) => void;
}) => {
  const [statusOpenFilter, setStatusOpenFilter] =
    React.useState<Checked>(false);
  const [statusClosedFilter, setStatusClosedFilter] =
    React.useState<Checked>(false);
  const [statusDraftFilter, setStatusDraftFilter] =
    React.useState<Checked>(false);
  const [statusCancelledFilter, setStatusCancelledFilter] =
    React.useState<Checked>(false);
  const [workRemoteFilter, setWorkRemoteFilter] =
    React.useState<Checked>(false);
  const [workOnsiteFilter, setWorkOnsiteFilter] =
    React.useState<Checked>(false);
  const [workHybridFilter, setWorkHybridFilter] =
    React.useState<Checked>(false);

  // Update parent component with selected filters
  React.useEffect(() => {
    const newStatusFilters = [];
    if (statusOpenFilter) newStatusFilters.push("open");
    if (statusClosedFilter) newStatusFilters.push("closed");
    if (statusDraftFilter) newStatusFilters.push("draft");
    if (statusCancelledFilter) newStatusFilters.push("cancelled");

    const newWorkTypeFilters = [];
    if (workRemoteFilter) newWorkTypeFilters.push("remote");
    if (workOnsiteFilter) newWorkTypeFilters.push("on-site");
    if (workHybridFilter) newWorkTypeFilters.push("hybrid");

    onFilterChange({
      status: newStatusFilters,
      workType: newWorkTypeFilters,
    });
  }, [
    statusOpenFilter,
    statusClosedFilter,
    statusDraftFilter,
    statusCancelledFilter,
    workRemoteFilter,
    workOnsiteFilter,
    workHybridFilter,
    onFilterChange,
  ]);

  return (
    <div className="w-max h-full flex items-center justify-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="border-0">
          <div className="w-max h-max p-1 px-3 rounded-2xl border-2 text-zinc-300 text-sm bg-zinc-800 border-zinc-800">
            Filters
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-32 bg-zinc-900 rounded-xl border-0">
          <DropdownMenuLabel className="text-zinc-700 text-xs">
            WorkType
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={workRemoteFilter}
            onCheckedChange={setWorkRemoteFilter}
          >
            Remote
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={workOnsiteFilter}
            onCheckedChange={setWorkOnsiteFilter}
          >
            On-site
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={workHybridFilter}
            onCheckedChange={setWorkHybridFilter}
          >
            Hybrid
          </DropdownMenuCheckboxItem>
          <DropdownMenuLabel className="text-zinc-700 text-xs">
            Status
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={statusDraftFilter}
            onCheckedChange={setStatusDraftFilter}
          >
            Draft
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusOpenFilter}
            onCheckedChange={setStatusOpenFilter}
          >
            Open
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusClosedFilter}
            onCheckedChange={setStatusClosedFilter}
          >
            Closed
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusCancelledFilter}
            onCheckedChange={setStatusCancelledFilter}
          >
            Cancelled
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Display active filters */}
      {[
        ...(statusOpenFilter ? ["open"] : []),
        ...(statusClosedFilter ? ["closed"] : []),
        ...(statusDraftFilter ? ["draft"] : []),
        ...(statusCancelledFilter ? ["cancelled"] : []),
        ...(workRemoteFilter ? ["remote"] : []),
        ...(workOnsiteFilter ? ["on-site"] : []),
        ...(workHybridFilter ? ["hybrid"] : []),
      ].map((filter) => (
        <Filter
          key={filter}
          filter={filter}
          onClick={() => {
            if (filter === "open") setStatusOpenFilter(false);
            if (filter === "closed") setStatusClosedFilter(false);
            if (filter === "draft") setStatusDraftFilter(false);
            if (filter === "cancelled") setStatusCancelledFilter(false);
            if (filter === "remote") setWorkRemoteFilter(false);
            if (filter === "on-site") setWorkOnsiteFilter(false);
            if (filter === "hybrid") setWorkHybridFilter(false);
          }}
        />
      ))}
    </div>
  );
};

export default FilterBox;
