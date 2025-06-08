"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

import { z } from "zod";
import { toast } from "sonner";

import { userSchema } from "@/zod/userSchema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";
import {
  IconBrandGoogleFilled,
  IconBrandGithubFilled,
} from "@tabler/icons-react";

import { Separator } from "@/components/ui/separator";

// import { registerValidation } from "@/zod/zodFormSchemas/authFormValidation";
import Link from "next/link";
import {
  ageValidation,
  emailValidation,
  nameValidation,
  passwordValidation,
} from "@/zod/commonValidations";
import { RoleName } from "@/db/models";

const registerValidation = z.object({
  name: nameValidation,
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: passwordValidation,
  roleName: z.nativeEnum(RoleName).optional(),
});

const Register = () => {
  const form = useForm<z.infer<typeof registerValidation>>({
    resolver: zodResolver(registerValidation),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      roleName: RoleName.HiringManager,
    },
    mode: "onChange",
  });

  const onSubmit = async (data: z.infer<typeof registerValidation>) => {
    try {
      const response = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      console.log(response);
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Something went wrong";
        toast.error(errorMessage);
        return;
      }

      toast.success("Registration successful! Please check your email.");
    } catch (error) {
      console.log(error);
      toast.error("Network error. Please try again later.");
    } finally {
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form
        className="w-full max-w-96 gap-4 flex flex-col h-max p-4 border-0 rounded-2xl relative bg-transparent backdrop-blur-sm"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <h1 className="w-full text-center text-xl font-bold">Register</h1>

        <div className="w-full h-8 flex items-center justify-evenly">
          <IconBrandGoogleFilled
            className="h-8 cursor-pointer"
            onClick={() => signIn("google")}
          />
          <Separator orientation="vertical" />
          <IconBrandGithubFilled
            className="h-8 cursor-pointer"
            onClick={() => signIn("github")}
          />
        </div>
        <div className="w-full flex items-center justify-center gap-2">
          <span className="grow border-[1px]"></span>
          <span className="px-2">or</span>
          <span className="grow border-[1px]"></span>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input placeholder="fullname" {...field} type={`text`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input placeholder="email" {...field} type={`email`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem className="relative">
                <FormControl>
                  <Input placeholder="age" {...field} type={`number`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> 
        </div>*/}
        <FormField
          control={form.control}
          name="roleName"
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={RoleName.HiringManager}>
                    Hiring Manager
                  </SelectItem>
                  <SelectItem value={RoleName.Interviewer}>
                    Interviewer
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input placeholder="password" {...field} type={`password`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem className="relative">
              <FormControl>
                <Input
                  placeholder="confirm password"
                  {...field}
                  type={`password`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <Link href={`/auth/login`}>
            <p className="text-xs cursor-pointer text-zinc-400 pl-2.5">
              Already registered
            </p>
          </Link>
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default Register;
