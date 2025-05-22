"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { signIn } from "next-auth/react";
import { emailValidation, passwordValidation } from "@/zod/commonValidations";
import Link from "next/link";
// import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  IconBrandGoogleFilled,
  IconBrandGithubFilled,
} from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
const formSchema = z.object({
  identifier: emailValidation,
  password: passwordValidation,
});
const Login = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
    },
  });
  const onSubmit = async (formValues: z.infer<typeof formSchema>) => {
    console.log(formValues);
    const result = await signIn("credentials", {
      identifier: formValues.identifier,
      password: formValues.password,
      redirect: false, // Prevent `signIn()` from handling the redirect
    });

    console.log(result);
    toast(`${JSON.stringify(result)}`);
  };
  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-96 gap-4 flex flex-col h-max p-4 border-0 rounded-2xl relative bg-zinc-200 dark:bg-zinc-900 backdrop-blur-sm"
        >
          <h1 className="w-full text-center text-xl font-bold">Login</h1>

          <div className="w-full h-8 flex items-center justify-evenly">
            <IconBrandGoogleFilled
              className="h-8 cursor-pointer"
              onClick={() => signIn("google")}
            />
            <Separator
              orientation="vertical"
              className="bg-zinc-400 dark:bg-zinc-200"
            />
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
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="username or email"
                    {...field}
                    type={`text`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="password" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between">
            <Link href={`forgot`}>
              <p className="text-xs cursor-pointer text-zinc-400 pl-2.5 hover:underline">
                forgot password ?
              </p>
            </Link>
            <Button
              type="submit"
              className="cursor-pointer bg-zinc-900 dark:bg-zinc-200"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
          <Link href={`sign-up`}>
            <p className="w-full text-center text-xs text-zinc-500 dark:text-zinc-300 hover:underline">
              Register new user
            </p>
          </Link>
        </form>
      </Form>
    </>
  );
};

export default Login;
