"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

const hiringStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  description: z.string().optional(),
  isMandatory: z.boolean(),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  status: z.string().optional(),
  maxCandidates: z.coerce.number().optional(),
});

const formSchema = z.object({
  hr: z.string().min(1, "Hiring Manager ID is required"),
  positionTitle: z.string().min(1, "Position title is required"),
  postingDate: z.string().optional(),
  jobDescription: z.string().min(1, "Job description is required"),
  requiredSkills: z.string().optional(),
  minQualification: z.string().min(1, "Minimum qualification is required"),
  addedQualifications: z.string().optional(),
  qualificationDescription: z.string().optional(),
  hiringProcessStages: z.array(hiringStageSchema),
});

type FormSchema = z.infer<typeof formSchema>;

export default function CreateJob() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hr: "",
      positionTitle: "",
      postingDate: "",
      jobDescription: "",
      requiredSkills: "",
      minQualification: "",
      addedQualifications: "",
      qualificationDescription: "",
      hiringProcessStages: [
        { name: "", isMandatory: false, scheduledDate: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "hiringProcessStages",
  });

  useEffect(() => {
    if (session?.user?.id) {
      form.setValue("hr", session.user.id);
    }
  }, [session, form]);

  async function onSubmit(values: FormSchema) {
    try {
      setLoading(true);
      const response = await fetch("/api/jobRole", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          requiredSkills: values.requiredSkills
            ? values.requiredSkills.split(",").map((s) => s.trim())
            : [],
        }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("Job role created successfully!");
        form.reset();
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 dark:bg-zinc-900 bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 dark:text-white text-gray-900">
        Create New Job Role
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {[
            "positionTitle",
            "postingDate",
            "jobDescription",
            "requiredSkills",
            "minQualification",
            "addedQualifications",
            "qualificationDescription",
          ].map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name as keyof FormSchema}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-white capitalize text-gray-900">
                    {name
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                  </FormLabel>
                  <FormControl>
                    {name === "jobDescription" ||
                    name === "qualificationDescription" ? (
                      <Textarea placeholder={`Enter ${name}`} {...field} />
                    ) : (
                      <Input placeholder={`Enter ${name}`} {...field} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <div className="space-y-4">
            <FormLabel className="dark:text-white text-gray-900">
              Hiring Process Stages
            </FormLabel>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-xl dark:bg-zinc-800 bg-zinc-50"
              >
                <FormField
                  control={form.control}
                  name={`hiringProcessStages.${index}.name` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Technical Interview"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`hiringProcessStages.${index}.scheduledDate` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`hiringProcessStages.${index}.isMandatory` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mandatory</FormLabel>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`hiringProcessStages.${index}.description` as const}
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Optional description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`hiringProcessStages.${index}.maxCandidates` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Candidates</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          placeholder="Optional"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({ name: "", isMandatory: false, scheduledDate: "" })
              }
            >
              Add Stage
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Create Job"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
