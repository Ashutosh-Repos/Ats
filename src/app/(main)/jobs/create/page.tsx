"use client";
import { useState } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { YearPicker } from "@/components/YearPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import mongoose from "mongoose";
import { Calendar } from "@/components/ui/calendar";

const hiringProcessSchema = z.object({
  name: z.string().min(1, "Stage name is required").trim(),
  description: z.string().optional(),
  isMandatory: z.boolean().optional(),
  maxCandidates: z.number().min(1, "At least 1 candidate required").optional(),
  scheduledDate: z.string().optional(),
  // scheduledDate: z.union([z.string(), z.date()]).optional(),
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
});

const JobRoleCreateSchema = z
  .object({
    hiringYear: z
      .number()
      .min(new Date().getFullYear(), "Hiring year must be current or future")
      .optional(),
    positionTitle: z.string().min(1, "Position title is required").trim(),
    postingDate: z.string().optional(),
    jobDescription: z.string().optional(),
    requiredSkills: z
      .array(z.object({ name: z.string().trim().optional() }))
      .optional(),
    minQualification: z
      .string()
      .min(1, "Minimum qualification is required")
      .trim(),
    addedQualifications: z.string().optional(),
    qualificationDescription: z.string().optional(),
    hiringProcessStages: z.array(hiringProcessSchema.optional()).optional(),
    status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
  })
  .strict();

const CreateJobRole = () => {
  const date = new Date();
  const form = useForm<z.infer<typeof JobRoleCreateSchema>>({
    resolver: zodResolver(JobRoleCreateSchema),
    defaultValues: {
      hiringYear: date.getFullYear(),
      positionTitle: "",
      postingDate: date.toISOString(),
      jobDescription: "",
      requiredSkills: undefined,
      minQualification: "",
      addedQualifications: "",
      qualificationDescription: "",
      hiringProcessStages: [],
    },
  });

  const { control } = form;

  const reqSkilArray = useFieldArray({
    control,
    name: "requiredSkills",
  });

  const hiringStageArray = useFieldArray({
    control,
    name: "hiringProcessStages",
  });

  const onSubmit = (values: z.infer<typeof JobRoleCreateSchema>) => {
    console.log(values);
    toast.success(JSON.stringify(values));
  };

  const gridClass =
    "p-4 bg-zinc-900 rounded-2xl w-full h-max grid max-sm:grid-cols-1 max-md:grid-cols-2 max-lg:grid-cols-3 max-2xl:grid-cols-4 grid-cols-5 gap-4 scroll-smooth";
  return (
    <>
      <br />
      <Form {...form}>
        <h1 className="w-full h-max p-4 font-black text-2xl">Create Job</h1>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 flex flex-wrap items-start justify-items-center p-4 bg-zinc-900 rounded-2xl w-full h-max gap-8 "
        >
          <FormField
            control={form.control}
            name="positionTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input
                    placeholder="position"
                    {...field}
                    className="border border-zinc-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>JobDescription</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Job Description"
                    {...field}
                    className="w-64 border border-zinc-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hiringYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hiring Year</FormLabel>
                <FormControl>
                  <YearPicker
                    value={field.value}
                    onChange={(year) => field.onChange(year)}
                    className="bg-zinc-800 border-0"
                    triggerClassName="border border-zinc-700"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postingDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Job Posting Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                          "border border-zinc-700"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-zinc-800 border-0 rounded-2xl"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      onSelect={(date) => field.onChange(date?.toISOString())}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className=""
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiredSkills"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Required Skills</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    {reqSkilArray.fields.map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <Input
                          {...form.register(`requiredSkills.${index}.name`)}
                          className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          placeholder={`Skill #${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => reqSkilArray.remove(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => reqSkilArray.append({ name: "" })}
                      className="w-max"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Skill
                    </Button>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minQualification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Qualification</FormLabel>
                <FormControl>
                  <Input
                    placeholder="minimun qualification"
                    {...field}
                    className="border border-zinc-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="addedQualifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Added Qualification</FormLabel>
                <FormControl>
                  <Input
                    placeholder="addedQualifications"
                    {...field}
                    className="border border-zinc-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="qualificationDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qualification Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="qualificationDescription"
                    {...field}
                    className="border border-zinc-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hiringProcessStages"
            render={() => (
              <FormItem>
                <FormLabel>Hiring Process Stages</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-4">
                    {hiringStageArray.fields.map((item, index) => (
                      <Card key={item.id} className="bg-zinc-800 p-4">
                        <CardHeader className="flex flex-row justify-between items-center">
                          <CardTitle>Stage #{index + 1}</CardTitle>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => hiringStageArray.remove(index)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                          <FormField
                            control={form.control}
                            name={`hiringProcessStages.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Stage Name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`hiringProcessStages.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    placeholder="Description"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`hiringProcessStages.${index}.maxCandidates`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Max Candidates"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`hiringProcessStages.${index}.isMandatory`}
                            render={({ field }) => (
                              <FormItem className="flex gap-2 items-center">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value ?? false} // Map field.value to checked
                                    onChange={(e) =>
                                      field.onChange(e.target.checked)
                                    } // Update with checked state
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormLabel>Mandatory</FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`hiringProcessStages.${index}.status`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value ?? ""}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="upcoming">
                                        Upcoming
                                      </SelectItem>
                                      <SelectItem value="ongoing">
                                        Ongoing
                                      </SelectItem>
                                      <SelectItem value="completed">
                                        Completed
                                      </SelectItem>
                                      <SelectItem value="skipped">
                                        Skipped
                                      </SelectItem>
                                      <SelectItem value="terminated">
                                        Terminated
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`hiringProcessStages.${index}.scheduledDate`}
                            render={({ field }) => (
                              <FormItem>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="w-full"
                                      >
                                        {field.value
                                          ? format(new Date(field.value), "PPP")
                                          : "Pick a date"}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 bg-zinc-800 border-0">
                                    <Calendar
                                      mode="single"
                                      selected={
                                        field.value
                                          ? new Date(field.value)
                                          : undefined
                                      }
                                      onSelect={(date) =>
                                        field.onChange(date?.toISOString())
                                      }
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        hiringStageArray.append({
                          name: "",
                          description: "",
                          isMandatory: false,
                          maxCandidates: 1,
                          status: "upcoming",
                          scheduledDate: undefined,
                          appearedCandidates: [],
                          disqualifiedCandidates: [],
                          qualifiedCandidates: [],
                        })
                      }
                      className="w-max"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Stage
                    </Button>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="bg-white text-black">
            Submit
          </Button>
        </form>
      </Form>
    </>
  );
};

export default CreateJobRole;
