"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/utils/orpc";

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  school: z.string().optional(),
  educationLevel: z.string().optional(),
  socialMedia: z
    .object({
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      threads: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function StudentSettingsPage() {
  const { data: user, isLoading, refetch } = useQuery(orpc.user.getProfile.queryOptions());
  const updateProfile = useMutation(orpc.user.updateProfile.mutationOptions());

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      school: "",
      educationLevel: "",
      socialMedia: {
        instagram: "",
        tiktok: "",
        threads: "",
        linkedin: "",
      },
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        address: user.address || "",
        phoneNumber: user.phoneNumber || "",
        school: user.school || "",
        educationLevel: user.educationLevel || "",
        socialMedia: {
          instagram: user.socialMedia?.instagram || "",
          tiktok: user.socialMedia?.tiktok || "",
          threads: user.socialMedia?.threads || "",
          linkedin: user.socialMedia?.linkedin || "",
        },
      });
    }
  }, [user, form]);

  async function onSubmit(data: ProfileFormValues) {
    try {
      await updateProfile.mutateAsync(data);
      toast.success("Profile updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="font-medium text-lg">Profile Settings</h3>
        <p className="text-muted-foreground text-sm">Manage your personal information and social media handles.</p>
      </div>
      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Personal Information</h4>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name (Nama Lengkap)</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Alamat)</FormLabel>
                  <FormControl>
                    <Input placeholder="Jl. Sudirman No. 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input placeholder="08123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Education */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Education</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School (Sekolah)</FormLabel>
                    <FormControl>
                      <Input placeholder="SMA N 1 Jakarta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="educationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level (SMA/Universitas)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SMA">SMA / SMK</SelectItem>
                        <SelectItem value="Universitas">Universitas</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Social Media */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Social Media</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="socialMedia.instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMedia.tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMedia.threads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threads</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMedia.linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
