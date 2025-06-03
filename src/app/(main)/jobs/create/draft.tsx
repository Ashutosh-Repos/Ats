"use client";
import { useState } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import mongoose from "mongoose";

// ----------- API Response Type -----------
interface ApiResponse {
  message?: string;
  error?: string;
}

// ----------- Zod Schema -----------
const JobRoleCreateSchema = z
  .object({
    hr: z
      .string()
      .min(1, "Hiring Manager is required")
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid hiring manager ID"
      ),
    hiringYear: z
      .number()
      .min(new Date().getFullYear(), "Hiring year must be current or future")
      .optional(),
    positionTitle: z.string().min(1, "Position title is required").trim(),
    postingDate: z.string().optional(),
    jobDescription: z.string().optional(),
    requiredSkills: z
      .array(z.string().trim().min(1, "Skill cannot be empty"))
      .optional(),
    minQualification: z
      .string()
      .min(1, "Minimum qualification is required")
      .trim(),
    addedQualifications: z.string().optional(),
    qualificationDescription: z.string().optional(),
    hiringProcessStages: z
      .array(
        z.object({
          name: z.string().min(1, "Stage name is required").trim(),
          description: z.string().optional(),
          isMandatory: z.boolean().default(false),
          maxCandidates: z
            .number()
            .min(1, "At least 1 candidate required")
            .optional(),
          scheduledDate: z.string().optional(),
          status: z
            .enum(["upcoming", "ongoing", "completed", "skipped", "terminated"])
            .default("upcoming"),
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
    status: z.enum(["draft", "open", "closed", "cancelled"]).default("draft"),
  })
  .strict();

type JobRoleFormData = z.infer<typeof JobRoleCreateSchema>;

// ----------- Component -----------
export default function CreateJobRolePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form: UseFormReturn<JobRoleFormData> = useForm<JobRoleFormData>({
    resolver: zodResolver(JobRoleCreateSchema),
    defaultValues: {
      hr: "",
      positionTitle: "",
      minQualification: "",
      requiredSkills: [],
      hiringProcessStages: [],
      status: "draft",
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = form;

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray<JobRoleFormData>({
    control,
    name: "requiredSkills",
  });

  const {
    fields: stageFields,
    append: appendStage,
    remove: removeStage,
  } = useFieldArray<JobRoleFormData>({
    control,
    name: "hiringProcessStages",
  });

  const onSubmit = async (data: JobRoleFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL || "/api/jobrole",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create job role");
      }

      toast.success("Success", {
        description: result.message || "Job role created successfully",
      });
      reset();
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full overflow-scroll bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Job Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hiring Manager */}
            <div>
              <Label htmlFor="hr" className="text-gray-700 dark:text-gray-300">
                Hiring Manager ID
              </Label>
              <Input
                id="hr"
                {...register("hr")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="Enter hiring manager ObjectId"
                aria-invalid={errors.hr ? "true" : "false"}
                aria-describedby={errors.hr ? "hr-error" : undefined}
              />
              {errors.hr && (
                <p
                  id="hr-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.hr.message}
                </p>
              )}
            </div>

            {/* Position Title */}
            <div>
              <Label
                htmlFor="positionTitle"
                className="text-gray-700 dark:text-gray-300"
              >
                Position Title
              </Label>
              <Input
                id="positionTitle"
                {...register("positionTitle")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="e.g., Senior Software Engineer"
                aria-invalid={errors.positionTitle ? "true" : "false"}
                aria-describedby={
                  errors.positionTitle ? "positionTitle-error" : undefined
                }
              />
              {errors.positionTitle && (
                <p
                  id="positionTitle-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.positionTitle.message}
                </p>
              )}
            </div>

            {/* Hiring Year */}
            <div>
              <Label
                htmlFor="hiringYear"
                className="text-gray-700 dark:text-gray-300"
              >
                Hiring Year
              </Label>
              <Input
                id="hiringYear"
                type="number"
                {...register("hiringYear", { valueAsNumber: true })}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="e.g., 2025"
                aria-invalid={errors.hiringYear ? "true" : "false"}
                aria-describedby={
                  errors.hiringYear ? "hiringYear-error" : undefined
                }
              />
              {errors.hiringYear && (
                <p
                  id="hiringYear-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.hiringYear.message}
                </p>
              )}
            </div>

            {/* Posting Date */}
            <div>
              <Label
                htmlFor="postingDate"
                className="text-gray-700 dark:text-gray-300"
              >
                Posting Date
              </Label>
              <Input
                id="postingDate"
                type="date"
                {...register("postingDate")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                aria-invalid={errors.postingDate ? "true" : "false"}
                aria-describedby={
                  errors.postingDate ? "postingDate-error" : undefined
                }
              />
              {errors.postingDate && (
                <p
                  id="postingDate-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.postingDate.message}
                </p>
              )}
            </div>

            {/* Job Description */}
            <div>
              <Label
                htmlFor="jobDescription"
                className="text-gray-700 dark:text-gray-300"
              >
                Job Description
              </Label>
              <Textarea
                id="jobDescription"
                {...register("jobDescription")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="Describe the job role"
                rows={4}
                aria-invalid={errors.jobDescription ? "true" : "false"}
                aria-describedby={
                  errors.jobDescription ? "jobDescription-error" : undefined
                }
              />
              {errors.jobDescription && (
                <p
                  id="jobDescription-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.jobDescription.message}
                </p>
              )}
            </div>

            {/* Required Skills */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                Required Skills
              </Label>
              <div className="space-y-2 mt-1">
                {skillFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...register(`requiredSkills.${index}`)}
                      className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      placeholder="e.g., JavaScript"
                      aria-invalid={
                        errors.requiredSkills?.[index] ? "true" : "false"
                      }
                      aria-describedby={
                        errors.requiredSkills?.[index]
                          ? `requiredSkills-${index}-error`
                          : undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSkill(index)}
                      aria-label={`Remove skill ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {errors.requiredSkills?.[index] && (
                      <p
                        id={`requiredSkills-${index}-error`}
                        className="mt-1 text-sm text-red-600 dark:text-red-400"
                      >
                        {errors.requiredSkills[index].message}
                      </p>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendSkill("")}
                  className="mt-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Skill
                </Button>
              </div>
            </div>

            {/* Academic Qualifications */}
            <div>
              <Label
                htmlFor="minQualification"
                className="text-gray-700 dark:text-gray-300"
              >
                Minimum Qualification
              </Label>
              <Input
                id="minQualification"
                {...register("minQualification")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="e.g., Bachelor's in Computer Science"
                aria-invalid={errors.minQualification ? "true" : "false"}
                aria-describedby={
                  errors.minQualification ? "minQualification-error" : undefined
                }
              />
              {errors.minQualification && (
                <p
                  id="minQualification-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.minQualification.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="addedQualifications"
                className="text-gray-700 dark:text-gray-300"
              >
                Added Qualifications
              </Label>
              <Input
                id="addedQualifications"
                {...register("addedQualifications")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="e.g., Master's in Software Engineering"
                aria-invalid={errors.addedQualifications ? "true" : "false"}
                aria-describedby={
                  errors.addedQualifications
                    ? "addedQualifications-error"
                    : undefined
                }
              />
              {errors.addedQualifications && (
                <p
                  id="addedQualifications-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.addedQualifications.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="qualificationDescription"
                className="text-gray-700 dark:text-gray-300"
              >
                Qualification Description
              </Label>
              <Textarea
                id="qualificationDescription"
                {...register("qualificationDescription")}
                className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="Describe qualifications"
                rows={3}
                aria-invalid={
                  errors.qualificationDescription ? "true" : "false"
                }
                aria-describedby={
                  errors.qualificationDescription
                    ? "qualificationDescription-error"
                    : undefined
                }
              />
              {errors.qualificationDescription && (
                <p
                  id="qualificationDescription-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.qualificationDescription.message}
                </p>
              )}
            </div>

            {/* Hiring Process Stages */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                Hiring Process Stages
              </Label>
              <div className="space-y-4 mt-1">
                {stageFields.map((field, index) => (
                  <Card key={field.id} className="bg-gray-50 dark:bg-gray-700">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          Stage {index + 1}
                        </h3>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeStage(index)}
                          aria-label={`Remove stage ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label
                          htmlFor={`hiringProcessStages.${index}.name`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Stage Name
                        </Label>
                        <Input
                          id={`hiringProcessStages.${index}.name`}
                          {...register(`hiringProcessStages.${index}.name`)}
                          className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          placeholder="e.g., Application"
                          aria-invalid={
                            errors.hiringProcessStages?.[index]?.name
                              ? "true"
                              : "false"
                          }
                          aria-describedby={
                            errors.hiringProcessStages?.[index]?.name
                              ? `hiringProcessStages-${index}-name-error`
                              : undefined
                          }
                        />
                        {errors.hiringProcessStages?.[index]?.name && (
                          <p
                            id={`hiringProcessStages-${index}-name-error`}
                            className="mt-1 text-sm text-red-600 dark:text-red-400"
                          >
                            {errors.hiringProcessStages[index].name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor={`hiringProcessStages.${index}.description`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Description
                        </Label>
                        <Textarea
                          id={`hiringProcessStages.${index}.description`}
                          {...register(
                            `hiringProcessStages.${index}.description`
                          )}
                          className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          placeholder="Describe the stage"
                          aria-invalid={
                            errors.hiringProcessStages?.[index]?.description
                              ? "true"
                              : "false"
                          }
                          aria-describedby={
                            errors.hiringProcessStages?.[index]?.description
                              ? `hiringProcessStages-${index}-description-error`
                              : undefined
                          }
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`hiringProcessStages.${index}.isMandatory`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Mandatory
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setValue(
                              `hiringProcessStages.${index}.isMandatory`,
                              value === "true"
                            )
                          }
                          defaultValue={field.isMandatory ? "true" : "false"}
                        >
                          <SelectTrigger
                            className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            aria-label={`Mandatory status for stage ${index + 1}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor={`hiringProcessStages.${index}.maxCandidates`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Max Candidates
                        </Label>
                        <Input
                          id={`hiringProcessStages.${index}.maxCandidates`}
                          type="number"
                          {...register(
                            `hiringProcessStages.${index}.maxCandidates`,
                            { valueAsNumber: true }
                          )}
                          className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          placeholder="e.g., 100"
                          aria-invalid={
                            errors.hiringProcessStages?.[index]?.maxCandidates
                              ? "true"
                              : "false"
                          }
                          aria-describedby={
                            errors.hiringProcessStages?.[index]?.maxCandidates
                              ? `hiringProcessStages-${index}-maxCandidates-error`
                              : undefined
                          }
                        />
                        {errors.hiringProcessStages?.[index]?.maxCandidates && (
                          <p
                            id={`hiringProcessStages-${index}-maxCandidates-error`}
                            className="mt-1 text-sm text-red-600 dark:text-red-400"
                          >
                            {
                              errors.hiringProcessStages[index].maxCandidates
                                .message
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor={`hiringProcessStages.${index}.scheduledDate`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Scheduled Date
                        </Label>
                        <Input
                          id={`hiringProcessStages.${index}.scheduledDate`}
                          type="date"
                          {...register(
                            `hiringProcessStages.${index}.scheduledDate`
                          )}
                          className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          aria-invalid={
                            errors.hiringProcessStages?.[index]?.scheduledDate
                              ? "true"
                              : "false"
                          }
                          aria-describedby={
                            errors.hiringProcessStages?.[index]?.scheduledDate
                              ? `hiringProcessStages-${index}-scheduledDate-error`
                              : undefined
                          }
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`hiringProcessStages.${index}.status`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          Status
                        </Label>
                        <Select
                          {...register(`hiringProcessStages.${index}.status`)}
                        >
                          <SelectTrigger
                            className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            aria-label={`Status for stage ${index + 1}`}
                          >
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="skipped">Skipped</SelectItem>
                            <SelectItem value="terminated">
                              Terminated
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    appendStage({
                      name: "",
                      isMandatory: false,
                      status: "upcoming",
                    })
                  }
                  className="mt-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Stage
                </Button>
              </div>
            </div>

            {/* Status */}
            <div>
              <Label
                htmlFor="status"
                className="text-gray-700 dark:text-gray-300"
              >
                Status
              </Label>
              <Select {...register("status")}>
                <SelectTrigger
                  className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  aria-label="Job role status"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p
                  id="status-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.status.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              aria-label={
                isSubmitting ? "Submitting job role" : "Create job role"
              }
            >
              {isSubmitting ? "Creating..." : "Create Job Role"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
