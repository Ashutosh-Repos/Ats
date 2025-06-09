"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Modal } from "@/components/Modal";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  description: z.string().optional(),
});

const CreateDepartment = () => {
  const onSubmit = async () => {};

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  return (
    // <main className="w-full h-screen relative overflow-y-scroll bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center max-sm:p-4 p-8">

    // </main>

    <div className="relative">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 flex flex-col items-start justify-items-center p-4 sm:p-8 bg-zinc-900 rounded-2xl w-full h-max gap-2 "
        >
          <h1 className="w-max h-max font-black text-2xl">Create Department</h1>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deepartment Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Position Name"
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
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

          <Button type="submit" className="bg-white text-black">
            Create
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateDepartment;
