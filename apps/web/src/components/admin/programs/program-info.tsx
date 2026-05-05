"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

const programSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programSchema>;

export interface Program {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export function ProgramInfo({ program }: { program: Program }) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation(
    orpc.programs.admin.update.mutationOptions({
      onSuccess: () => {
        toast.success("Program updated");
        queryClient.invalidateQueries({
          queryKey: orpc.programs.admin.get.key({ input: { id: program.id } }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<ProgramFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch
    resolver: zodResolver(programSchema) as any,
    defaultValues: {
      name: program.name,
      slug: program.slug,
      description: program.description || "",
    },
  });

  const onSubmit = (values: ProgramFormValues) => {
    updateMutation.mutate({
      id: program.id,
      ...values,
    });
  };

  return (
    <Card className="mentor-card">
      <CardHeader className="bg-white">
        <CardTitle className="font-bricolage text-lg text-text-main">Program Information</CardTitle>
        <CardDescription className="font-manrope text-text-muted-custom">
          Update the basic details of the program.
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-white">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Program Name" {...field} />
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
                    <Textarea placeholder="Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="program-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="btn-mentor rounded-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
