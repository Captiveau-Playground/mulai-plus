"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  class: z.string().min(1, "Class is required"),
  school: z.string().min(1, "School is required"),
  major: z.string().min(1, "Major is required"),
  domicile: z.string().min(1, "Domicile is required"),
  reason: z.string().min(1, "Reason is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface ProgramRegistrationProps {
  programId: string;
  batch: {
    id: string;
    name: string;
    status: string;
    registrationStartDate: Date | string;
    registrationEndDate: Date | string;
    quota: number;
  };
}

export function ProgramRegistration({ programId, batch }: ProgramRegistrationProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);

  const { data: applicationStatus, isLoading: isLoadingStatus } = useQuery(
    orpc.programs.student.checkApplication.queryOptions({
      input: {
        programId,
        batchId: batch.id,
      },
      enabled: !!session.data,
    }),
  );

  const applyMutation = useMutation(
    orpc.programs.apply.mutationOptions({
      onSuccess: () => {
        toast.success("Application submitted successfully!");
        setIsOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: session.data?.user.name || "",
      email: session.data?.user.email || "",
      class: "",
      school: "",
      major: "",
      domicile: "",
      reason: "",
      phone: "",
    },
  });

  const handleRegisterClick = () => {
    if (!session.data) {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }

    // Check dates locally for immediate feedback (also checked on server)
    const now = new Date();
    const start = new Date(batch.registrationStartDate);
    const end = new Date(batch.registrationEndDate);

    if (now < start) {
      toast.error("Registration has not started yet.");
      return;
    }
    if (now > end) {
      toast.error("Registration has ended.");
      return;
    }

    setIsOpen(true);
  };

  const onSubmit = (values: RegistrationFormValues) => {
    applyMutation.mutate({
      programId,
      batchId: batch.id,
      answers: values,
    });
  };

  const isRegistrationOpen =
    batch.status === "open" ||
    (batch.status === "upcoming" &&
      new Date() >= new Date(batch.registrationStartDate) &&
      new Date() <= new Date(batch.registrationEndDate));

  if (batch.status === "closed" || batch.status === "completed") {
    return (
      <Button className="w-full" disabled variant="secondary">
        Registration Closed
      </Button>
    );
  }

  if (session.data && isLoadingStatus) {
    return (
      <Button className="w-full" disabled variant="secondary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (applicationStatus?.hasApplied) {
    let label = "Already Applied";
    if (applicationStatus.status === "applied") {
      label = "Application Pending";
    } else if (applicationStatus.status === "accepted") {
      label = "Application Accepted";
    } else if (applicationStatus.status === "rejected") {
      label = "Application Rejected";
    }

    return (
      <Button className="w-full" disabled variant="secondary">
        {label}
      </Button>
    );
  }

  return (
    <>
      <Button className="w-full" onClick={handleRegisterClick} disabled={!isRegistrationOpen}>
        {isRegistrationOpen ? "Register Now" : "Registration Closed"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Register for {batch.name}</DialogTitle>
            <DialogDescription>Please fill in your details to apply for this program batch.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="0812..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="domicile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domicile (City)</FormLabel>
                      <FormControl>
                        <Input placeholder="Jakarta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <FormControl>
                        <Input placeholder="SMA..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class/Grade</FormLabel>
                      <FormControl>
                        <Input placeholder="12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="major"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Major</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>Select major</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IPA">IPA (Science)</SelectItem>
                        <SelectItem value="IPS">IPS (Social)</SelectItem>
                        <SelectItem value="Lainnya">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Joining</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Why do you want to join this program?"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={applyMutation.isPending}>
                {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
