import React from "react";
import Card from "@/components/square-card";
import { Button } from "@/components/ui/button";
import FilterBox from "@/components/filterBox";
import SelectBox from "@/components/selectBox";
const Jobs = () => {
  return (
    <>
      <br />
      <div className="w-full max-w-[60rem] h-12 flex items-center justify-end-safe p-2 relative gap-2">
        <div className="flex items-center justify-center gap-2">
          <FilterBox />
        </div>
        <div className="flex items-center justify-center gap-2">
          <SelectBox
            selectValues={["newest", "oldest", "name"]}
            selectLabel="sortBy"
            handler={() => {}}
          />
        </div>
        <Button className="w-max h-max px-2.5 bg-white text-black rounded-2xl ">
          Create New
        </Button>
      </div>
      <div
        className={`p-4 w-full h-max grid max-sm:grid-cols-1 max-md:grid-cols-2 max-lg:grid-cols-3 max-2xl:grid-cols-4 grid-cols-5 gap-4 scroll-smooth`}
      >
        <Card
          status="draft"
          pay={12}
          currStage="coding round 1"
          nextStage="Technical Interview"
          workType="on-site"
          totalApplication={26000}
          appearing={1300}
        />
        <Card
          status="open"
          pay={12}
          currStage="coding round 1"
          nextStage="Hr Interview"
          workType="remote"
          totalApplication={32000}
          appearing={700}
        />
        <Card
          status="closed"
          pay={12}
          currStage="coding round 1"
          nextStage="Hr Interview"
          workType="hybrid"
          totalApplication={32000}
          appearing={700}
        />
        <Card
          status="cancelled"
          pay={12}
          currStage="coding round 1"
          nextStage="Hr Interview"
          workType="hybrid"
          totalApplication={32000}
          appearing={700}
        />
      </div>
    </>
  );
};

export default Jobs;
