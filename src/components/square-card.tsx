import React from "react";
import {
  IconBuildings,
  IconWorld,
  IconCurrencyDollar,
} from "@tabler/icons-react";

const Card = ({
  workType,
  pay,
  status,
  currStage,
  appearing,
  nextStage,
  totalApplication,
}: {
  workType: string;
  pay: number;
  status: string;
  currStage: string;
  nextStage: string;
  appearing: number;
  totalApplication: number;
}) => {
  return (
    <div className="w-full max-w-96 mx-auto rounded-2xl bg-zinc-900 text-white aspect-video flex flex-col p-4 cursor-pointer">
      <div className="flex items-center justify-between">
        <h1 className="w-max font-bold">Backend-Software-Engineer</h1>
        <span className="w-max p-2 rounded-xl text-xs bg-zinc-800">
          <p>{status}</p>
        </span>
      </div>
      <div className="flex items-center justify-between w-max gap-8 text-sm">
        <span className="flex gap-0.5 items-center text-xs">
          {workType === "on-site" ? (
            <IconBuildings size={14} />
          ) : workType === "hybrid" ? (
            <>
              <IconBuildings size={14} />
              <IconWorld size={14} />
            </>
          ) : (
            <IconWorld size={14} />
          )}
          <p>{workType}</p>
        </span>

        <span className="flex gap-0.5 items-center text-xs">
          <IconCurrencyDollar size={14} />
          <p>{pay} Lpa</p>
        </span>
      </div>
      <br />
      <div className="grid grid-cols-2 grid-rows-2 place-items-start gap-2 text-center">
        <span className="w-full h-full rounded place-items-center grid relative p-4">
          <p className="absolute top-0 text-xs text-zinc-500">Current Stages</p>
          <h6 className="text-sm">{currStage}</h6>
        </span>
        <span className="w-full h-full rounded place-items-center grid relative">
          <p className="absolute top-0 text-xs text-zinc-500">Appearing</p>
          <h6 className="text-sm">{appearing}</h6>
        </span>
        <span className="w-full h-full rounded place-items-center grid relative">
          <p className="absolute top-0 text-xs text-zinc-500">Next Stage</p>
          <h6 className="text-sm">{nextStage}</h6>
        </span>
        <span className="w-full h-full rounded place-items-center grid relative">
          <p className="absolute top-0 text-xs text-zinc-500">
            Total applicants
          </p>
          <h6 className="text-sm">{totalApplication}</h6>
        </span>
      </div>
    </div>
  );
};

export default Card;
