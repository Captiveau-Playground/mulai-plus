"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe, Loader2, MapPin, Phone, School, User } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
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

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">Settings</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Manage your personal information and preferences
          </p>
        </div>

        <Card className="student-card">
          <CardHeader className="bg-white">
            <div className="flex items-center gap-3">
              <div className="icon-box-navy">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-bricolage text-lg text-text-main">Profile Settings</CardTitle>
                <CardDescription className="font-manrope text-sm text-text-muted-custom">
                  Manage your personal information and social media handles.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-white pt-0">
            <Separator className="mb-6" />

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-inter font-semibold text-sm text-text-main">
                    <User className="h-4 w-4 text-brand-navy" />
                    Personal Information
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-manrope text-sm text-text-main">
                            Full Name (Nama Lengkap)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="bg-white font-manrope" {...field} />
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
                          <FormLabel className="flex items-center gap-1 font-manrope text-sm text-text-main">
                            <Phone className="h-3 w-3 text-text-muted-custom" />
                            WhatsApp Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="08123456789" className="bg-white font-manrope" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 font-manrope text-sm text-text-main">
                          <MapPin className="h-3 w-3 text-text-muted-custom" />
                          Address (Alamat)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Jl. Sudirman No. 1" className="bg-white font-manrope" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Education */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-inter font-semibold text-sm text-text-main">
                    <School className="h-4 w-4 text-brand-navy" />
                    Education
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="school"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-manrope text-sm text-text-main">School (Sekolah)</FormLabel>
                          <FormControl>
                            <Input placeholder="SMA N 1 Jakarta" className="bg-white font-manrope" {...field} />
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
                          <FormLabel className="font-manrope text-sm text-text-main">Level (SMA/Universitas)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white font-manrope">
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
                  <h4 className="flex items-center gap-2 font-inter font-semibold text-sm text-text-main">
                    <Globe className="h-4 w-4 text-brand-navy" />
                    Social Media
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="socialMedia.instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-manrope text-sm text-text-main">Instagram</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" className="bg-white font-manrope" {...field} />
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
                          <FormLabel className="font-manrope text-sm text-text-main">TikTok</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" className="bg-white font-manrope" {...field} />
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
                          <FormLabel className="font-manrope text-sm text-text-main">Threads</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" className="bg-white font-manrope" {...field} />
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
                          <FormLabel className="font-manrope text-sm text-text-main">LinkedIn</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" className="bg-white font-manrope" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" disabled={updateProfile.isPending} className="btn-brand-navy rounded-full">
                    {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageState>
  );
}
