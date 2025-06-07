"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useForm,
  useFieldArray,
  FormProvider,
  Control,
  FieldArrayWithId,
  UseFormHandleSubmit,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import mongoose from "mongoose";

// Register Chart.js components
ChartJS.register(...registerables);

// Types
type Candidate = { _id: string; name: string };

interface LeanJobRole {
  _id: string;
  positionTitle: string;
  jobDescription?: string;
  pay?: number;
  workType: "on-site" | "remote" | "hybrid";
  status: "draft" | "open" | "closed" | "cancelled";
  hiringManager: mongoose.Types.ObjectId;
  academicQualifications: {
    minQualification: string;
    addedQualifications?: string;
    description?: string;
  };
  hiringProcessStages: {
    name: string;
    description?: string;
    isMandatory?: boolean;
    maxCandidates?: number;
    scheduledDate?: string;
    status?: "upcoming" | "ongoing" | "completed" | "skipped" | "terminated";
    appearedCandidates?: string[];
    qualifiedCandidates?: string[];
    disqualifiedCandidates?: string[];
  }[];
}

// Type for CandidateManager stage prop
interface CandidateManagerStage {
  name: string;
  appearedCandidates?: string[];
  qualifiedCandidates?: string[];
  disqualifiedCandidates?: string[];
}

// Zod schema
const JobRoleUpdateSchema = z
  .object({
    positionTitle: z
      .string()
      .min(1, "Position title is required")
      .trim()
      .optional(),
    jobDescription: z.string().optional(),
    pay: z.number().min(0, "Pay must be non-negative").optional(),
    workType: z.enum(["on-site", "remote", "hybrid"]).optional(),
    minQualification: z
      .string()
      .min(1, "Minimum qualification is required")
      .trim()
      .optional(),
    addedQualifications: z.string().optional(),
    qualificationDescription: z.string().optional(),
    status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
    hiringProcessStages: z
      .array(
        z.object({
          name: z.string().min(1, "Stage name is required").trim(),
          description: z.string().optional(),
          isMandatory: z.boolean().optional(),
          maxCandidates: z
            .number()
            .min(1, "At least 1 candidate required")
            .optional(),
          scheduledDate: z.date().optional(),
          status: z
            .enum(["upcoming", "ongoing", "completed", "skipped", "terminated"])
            .optional(),
          appearedCandidates: z
            .array(
              z.string().refine(
                (id) => mongoose.Types.ObjectId.isValid(id),
                (val) => ({ message: `Invalid candidate ID: ${val}` })
              )
            )
            .optional(),
          disqualifiedCandidates: z
            .array(
              z.string().refine(
                (id) => mongoose.Types.ObjectId.isValid(id),
                (val) => ({ message: `Invalid candidate ID: ${val}` })
              )
            )
            .optional(),
          qualifiedCandidates: z
            .array(
              z.string().refine(
                (id) => mongoose.Types.ObjectId.isValid(id),
                (val) => ({ message: `Invalid candidate ID: ${val}` })
              )
            )
            .optional(),
        })
      )
      .optional(),
  })
  .strict();

// Form values type
type FormValues = z.infer<typeof JobRoleUpdateSchema>;

// Candidate Manager Component
const CandidateManager = ({
  stage,
  index,
  candidates,
  handleCandidateAction,
}: {
  stage: CandidateManagerStage;
  index: number;
  candidates: Candidate[];
  handleCandidateAction: (
    stageIndex: number,
    candidateId: string,
    action: "qualify" | "disqualify"
  ) => void;
}) => (
  <div className="mt-4">
    <h4 className="text-sm font-medium mb-2 text-white">Manage Candidates</h4>
    <div className="space-y-2">
      {candidates
        .filter((candidate) =>
          (stage.appearedCandidates ?? []).includes(candidate._id)
        )
        .map((candidate) => (
          <div key={candidate._id} className="flex gap-2 items-center">
            <span className="text-white">{candidate.name}</span>
            <Button
              variant="outline"
              onClick={() =>
                handleCandidateAction(index, candidate._id, "qualify")
              }
              disabled={(stage.qualifiedCandidates ?? []).includes(
                candidate._id
              )}
              className="border-zinc-700 text-white"
              aria-label={`Qualify candidate ${candidate.name}`}
            >
              Qualify
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                handleCandidateAction(index, candidate._id, "disqualify")
              }
              disabled={(stage.disqualifiedCandidates ?? []).includes(
                candidate._id
              )}
              aria-label={`Disqualify candidate ${candidate.name}`}
            >
              Disqualify
            </Button>
          </div>
        ))}
    </div>
  </div>
);

// Hiring Stage Form Component
const HiringStageForm = ({
  stage,
  index,
  control,
  remove,
  candidates,
  handleCandidateAction,
}: {
  stage: FieldArrayWithId<FormValues, "hiringProcessStages", "id">;
  index: number;
  control: Control<FormValues>;
  remove: (index: number) => void;
  candidates: Candidate[];
  handleCandidateAction: (
    stageIndex: number,
    candidateId: string,
    action: "qualify" | "disqualify"
  ) => void;
}) => (
  <div className="border p-4 rounded-lg border-zinc-700 mb-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-lg font-medium text-white">
        Stage {index + 1}: {stage.name}
      </h3>
      <Button
        variant="destructive"
        onClick={() => remove(index)}
        disabled={
          stage.isMandatory || ["Application", "Screening"].includes(stage.name)
        }
        aria-label={`Delete stage ${stage.name}`}
      >
        <Trash2 size={16} />
      </Button>
    </div>
    <FormField
      control={control}
      name={`hiringProcessStages.${index}.name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Stage Name</FormLabel>
          <FormControl>
            <Input
              {...field}
              className="border-zinc-700 bg-zinc-800 text-white"
              disabled={
                stage.isMandatory ||
                ["Application", "Screening"].includes(stage.name)
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name={`hiringProcessStages.${index}.description`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Description</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              className="border-zinc-700 bg-zinc-800 text-white"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name={`hiringProcessStages.${index}.maxCandidates`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Max Candidates</FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="border-zinc-700 bg-zinc-800 text-white w-32"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name={`hiringProcessStages.${index}.scheduledDate`}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-white">Scheduled Date</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-white bg-zinc-800"
                >
                  {field.value
                    ? format(new Date(field.value), "PPP")
                    : "Pick a date"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-800 border-zinc-700">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={field.onChange}
                disabled={(date) =>
                  date < new Date() && stage.status !== "completed"
                }
                aria-label="Select scheduled date"
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name={`hiringProcessStages.${index}.status`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Stage Status</FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name={`hiringProcessStages.${index}.isMandatory`}
      render={({ field }) => (
        <FormItem className="flex gap-2 items-center">
          <FormControl>
            <input
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              disabled={["Application", "Screening"].includes(stage.name)}
              className="text-white"
            />
          </FormControl>
          <FormLabel className="text-white">Mandatory</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
    <CandidateManager
      stage={stage}
      index={index}
      candidates={candidates}
      handleCandidateAction={handleCandidateAction}
    />
  </div>
);

// Job Details Form Component
const JobDetailsForm = ({
  control,
  handleSubmit,
  onSubmit,
  isSubmitting,
}: {
  control: Control<FormValues>;
  handleSubmit: UseFormHandleSubmit<FormValues>;
  onSubmit: (data: FormValues) => void;
  isSubmitting: boolean;
}) => (
  <section className="bg-zinc-900 p-6 rounded-lg mb-6">
    <h2 className="text-xl font-semibold mb-4 text-white">Job Details</h2>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={control}
        name="positionTitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Position Title</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="jobDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Job Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="pay"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Pay (in LPA)</FormLabel>
            <FormControl>
              <Input
                type="number"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="border-zinc-700 bg-zinc-800 text-white w-32"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="workType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Work Type</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="on-site">On-site</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Job Status</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="minQualification"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Minimum Qualification</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="addedQualifications"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Added Qualifications</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="qualificationDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">
              Qualification Description
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-white text-black"
        aria-label="Update job details"
      >
        {isSubmitting ? "Updating..." : "Update Job Details"}
      </Button>
    </form>
  </section>
);

// Main Component
const ManageJobPage = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const [jobRole, setJobRole] = useState<LeanJobRole | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(JobRoleUpdateSchema),
    defaultValues: {
      positionTitle: "",
      jobDescription: "",
      pay: 0,
      workType: "on-site" as const,
      minQualification: "",
      addedQualifications: "",
      qualificationDescription: "",
      status: "draft" as const,
      hiringProcessStages: [],
    },
  });

  const { control, handleSubmit, reset } = form;
  const {
    fields: stageFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "hiringProcessStages",
  });

  // Fetch job role and candidates
  useEffect(() => {
    const fetchData = async () => {
      if (!params.id || typeof params.id !== "string") {
        toast.error("Invalid job ID");
        return;
      }
      setIsLoading(true);
      try {
        const [jobResponse, candidateResponse] = await Promise.all([
          fetch(`/api/jobRole/${params.id}`),
          fetch(`/api/candidates?jobRoleId=${params.id}`),
        ]);

        const jobResult = await jobResponse.json();
        if (jobResult.success) {
          setJobRole(jobResult.data);
          reset({
            positionTitle: jobResult.data.positionTitle,
            jobDescription: jobResult.data.jobDescription ?? "",
            pay: jobResult.data.pay ?? 0,
            workType: jobResult.data.workType ?? "on-site",
            minQualification:
              jobResult.data.academicQualifications.minQualification,
            addedQualifications:
              jobResult.data.academicQualifications.addedQualifications ?? "",
            qualificationDescription:
              jobResult.data.academicQualifications.description ?? "",
            status: jobResult.data.status ?? "draft",
            hiringProcessStages: jobResult.data.hiringProcessStages.map(
              (stage: LeanJobRole["hiringProcessStages"][0]) => ({
                ...stage,
                scheduledDate: stage.scheduledDate
                  ? new Date(stage.scheduledDate)
                  : undefined,
              })
            ),
          });
        } else {
          toast.error(jobResult.error || "Failed to fetch job role");
        }

        const candidateResult = await candidateResponse.json();
        if (candidateResult.success) {
          setCandidates(candidateResult.data);
        } else {
          toast.error(candidateResult.error || "Failed to fetch candidates");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id, reset]);

  // Authentication check
  if (sessionStatus === "loading")
    return <div className="text-white">Loading...</div>;
  if (sessionStatus !== "authenticated" || !session?.user?.id) {
    router.push("/login");
    return <div className="text-white">Please log in to manage job roles.</div>;
  }

  if (isLoading) return <div className="text-white">Loading job role...</div>;
  if (!jobRole) return <div className="text-white">Job role not found.</div>;

  if (jobRole.hiringManager.toString() !== session.user.id) {
    return (
      <div className="text-white">
        Unauthorized: You are not the hiring manager for this job role.
      </div>
    );
  }

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (data.hiringProcessStages) {
      const requiredStages = ["application", "screening"];
      for (const stage of requiredStages) {
        if (
          !data.hiringProcessStages.some((s) => s.name.toLowerCase() === stage)
        ) {
          toast.error(`Missing required stage: ${stage}`);
          return;
        }
      }
    }

    const updatePayload: Partial<LeanJobRole> = {};
    if (data.positionTitle) updatePayload.positionTitle = data.positionTitle;
    if (data.jobDescription) updatePayload.jobDescription = data.jobDescription;
    if (data.pay) updatePayload.pay = data.pay;
    if (data.workType) updatePayload.workType = data.workType;
    if (data.status) updatePayload.status = data.status;
    if (
      data.minQualification ||
      data.addedQualifications ||
      data.qualificationDescription
    ) {
      updatePayload.academicQualifications = {
        minQualification:
          data.minQualification ??
          jobRole.academicQualifications.minQualification,
        ...(data.addedQualifications && {
          addedQualifications: data.addedQualifications,
        }),
        ...(data.qualificationDescription && {
          description: data.qualificationDescription,
        }),
      };
    }
    if (data.hiringProcessStages) {
      updatePayload.hiringProcessStages = data.hiringProcessStages.map(
        (stage) => ({
          ...stage,
          scheduledDate: stage.scheduledDate
            ? stage.scheduledDate.toISOString()
            : undefined,
        })
      );
    }

    if (Object.keys(updatePayload).length === 0) {
      toast.info("No changes to update.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/jobRole/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      toast.success(result.message || "Job role updated successfully");
      setJobRole(result.data);
      reset(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle job deletion
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this job role?")) return;
    try {
      const response = await fetch(`/api/jobRole/${params.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      toast.success(result.message || "Job role deleted successfully");
      router.push("/jobs");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    }
  };

  // Handle candidate action
  const handleCandidateAction = async (
    stageIndex: number,
    candidateId: string,
    action: "qualify" | "disqualify"
  ) => {
    // const stage = jobRole.hiringProcessStages[stageIndex];
    const updatePayload: Partial<LeanJobRole> = {
      hiringProcessStages: jobRole.hiringProcessStages.map((s, i) => {
        if (i !== stageIndex) return s;
        const updatedStage = {
          ...s,
          appearedCandidates: s.appearedCandidates ?? [],
          qualifiedCandidates: s.qualifiedCandidates ?? [],
          disqualifiedCandidates: s.disqualifiedCandidates ?? [],
        };
        updatedStage.appearedCandidates =
          updatedStage.appearedCandidates.filter((id) => id !== candidateId);
        if (action === "qualify") {
          updatedStage.qualifiedCandidates.push(candidateId);
        } else {
          updatedStage.disqualifiedCandidates.push(candidateId);
        }
        return updatedStage;
      }),
    };

    try {
      const response = await fetch(`/api/jobRole/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      toast.success(
        `Candidate ${action === "qualify" ? "qualified" : "disqualified"} successfully`
      );
      setJobRole(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    }
  };

  // Chart data
  const chartData = {
    labels: jobRole?.hiringProcessStages.map((stage) => stage.name) || [],
    datasets: [
      {
        label: "Appeared Candidates",
        data:
          jobRole?.hiringProcessStages.map(
            (stage) => stage.appearedCandidates?.length || 0
          ) || [],
        backgroundColor: "#3b82f6",
        borderColor: "#1e40af",
        borderWidth: 1,
      },
      {
        label: "Qualified Candidates",
        data:
          jobRole?.hiringProcessStages.map(
            (stage) => stage.qualifiedCandidates?.length || 0
          ) || [],
        backgroundColor: "#10b981",
        borderColor: "#047857",
        borderWidth: 1,
      },
      {
        label: "Disqualified Candidates",
        data:
          jobRole?.hiringProcessStages.map(
            (stage) => stage.disqualifiedCandidates?.length || 0
          ) || [],
        backgroundColor: "#ef4444",
        borderColor: "#b91c1c",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Candidates",
          color: "#ffffff",
        },
        ticks: { color: "#ffffff" },
        grid: { color: "#4b5563" },
      },
      x: {
        title: { display: true, text: "Hiring Stages", color: "#ffffff" },
        ticks: { color: "#ffffff" },
        grid: { color: "#4b5563" },
      },
    },
    plugins: {
      legend: { labels: { color: "#ffffff" } },
    },
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">
        Manage Job Role: {jobRole.positionTitle}
      </h1>

      {/* Job Details */}
      <FormProvider {...form}>
        <JobDetailsForm
          control={control}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
        <Button
          variant="destructive"
          onClick={handleDelete}
          className="mb-6"
          aria-label="Delete job role"
        >
          Delete Job Role
        </Button>
      </FormProvider>

      {/* Hiring Process Stages */}
      <section className="bg-zinc-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Hiring Process Stages
        </h2>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {stageFields.map((stage, index) => (
              <HiringStageForm
                key={stage.id}
                stage={stage}
                index={index}
                control={control}
                remove={remove}
                candidates={candidates}
                handleCandidateAction={handleCandidateAction}
              />
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                append({
                  name: "",
                  description: "",
                  isMandatory: false,
                  maxCandidates: 1,
                  status: "upcoming",
                  appearedCandidates: [],
                  disqualifiedCandidates: [],
                  qualifiedCandidates: [],
                })
              }
              className="bg-zinc-700 text-white"
              aria-label="Add new stage"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Stage
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-black"
              aria-label="Update stages"
            >
              {isSubmitting ? "Updating..." : "Update Stages"}
            </Button>
          </form>
        </FormProvider>
      </section>

      {/* Hiring Process Chart */}
      <section className="bg-zinc-900 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Hiring Process Overview
        </h2>
        <Bar data={chartData} options={chartOptions} />
      </section>
    </div>
  );
};

export default ManageJobPage;
