"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

import { z } from "zod";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  IconBrandGoogleFilled,
  IconBrandGithubFilled,
} from "@tabler/icons-react";

import { Separator } from "@/components/ui/separator";

// import { registerValidation } from "@/zod/zodFormSchemas/authFormValidation";
import Link from "next/link";
import {
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
  roleName: z.string(),
});

const Register = () => {
  const form = useForm<z.infer<typeof registerValidation>>({
    resolver: zodResolver(registerValidation),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      roleName: "hiringManager",
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
        className="w-full max-w-96 gap-4 flex flex-col h-max p-4 border-0 rounded-2xl relative bg-zinc-200 dark:bg-zinc-900 backdrop-blur-sm"
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
            <FormItem>
              <FormLabel>
                <h1 className="text-sm text-zinc-500">Name</h1>
              </FormLabel>
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
              <FormLabel>
                <h1 className="text-sm text-zinc-500">E-mail</h1>
              </FormLabel>
              <FormControl>
                <Input placeholder="email" {...field} type={`email`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roleName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <h1 className="text-sm text-zinc-500">Sign in as</h1>
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex text-white"
                >
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroupItem value="hiringManager" />
                    </FormControl>
                    <FormLabel className="font-light text-xs text-zinc-500">
                      Hiring Manager
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroupItem value="interviewer" />
                    </FormControl>
                    <FormLabel className="font-light text-xs text-zinc-500">
                      Interviewer
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroupItem value="admin" />
                    </FormControl>
                    <FormLabel className="font-light text-xs text-zinc-500">
                      Admin
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>
                <h1 className="text-sm text-zinc-500">Password</h1>
              </FormLabel>
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
            className="cursor-pointer bg-white text-black"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Registering..." : "Register"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default Register;
