"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, CheckCircle2, HelpCircle, Loader2, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { ProgramRegistration } from "@/components/front/program-registration";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export default function ProgramDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: program, isLoading } = useQuery(
    orpc.programs.public.get.queryOptions({
      input: { slug },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="container py-10 text-center">
        <h1 className="font-bold text-2xl">Program Not Found</h1>
        <p className="text-muted-foreground">The program you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      {/* Header Section */}
      <div className="mb-10 space-y-4">
        <h1 className="font-extrabold text-4xl tracking-tight sm:text-5xl">{program.name}</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">{program.description}</p>
        <div className="flex items-center gap-4 text-muted-foreground text-sm">{/* Duration moved to batches */}</div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-10 lg:col-span-2">
          {/* Benefits */}
          {program.benefits.length > 0 && (
            <section>
              <h2 className="mb-6 flex items-center gap-2 font-bold text-2xl">
                <CheckCircle2 className="h-6 w-6 text-primary" /> What You'll Get
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {program.benefits.map((benefit) => (
                  <Card key={benefit.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    </CardHeader>
                    {benefit.description && (
                      <CardContent>
                        <p className="text-muted-foreground text-sm">{benefit.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Syllabus */}
          {program.syllabus.length > 0 && (
            <section>
              <h2 className="mb-6 flex items-center gap-2 font-bold text-2xl">
                <BookOpen className="h-6 w-6 text-primary" /> Syllabus
              </h2>
              <Accordion className="w-full">
                {program.syllabus.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>
                      <span className="text-left">
                        <span className="mr-2 font-semibold text-primary">Week {item.week}:</span>
                        {item.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.outcome || "No detailed outcome provided."}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Mentors */}
          {program.mentors.length > 0 && (
            <section>
              <h2 className="mb-6 flex items-center gap-2 font-bold text-2xl">
                <Users className="h-6 w-6 text-primary" /> Meet Your Mentors
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {program.mentors.map((mentor) => (
                  <Card key={mentor.user.id} className="overflow-hidden">
                    <CardContent className="flex items-center gap-4 p-6">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={mentor.user.image || ""} />
                        <AvatarFallback>{mentor.user.name?.charAt(0) || "M"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{mentor.user.name}</h3>
                        <p className="text-muted-foreground text-sm">{mentor.user.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* FAQs */}
          {program.faqs.length > 0 && (
            <section>
              <h2 className="mb-6 flex items-center gap-2 font-bold text-2xl">
                <HelpCircle className="h-6 w-6 text-primary" /> FAQ
              </h2>
              <Accordion className="w-full">
                {program.faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left font-medium">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}
        </div>

        {/* Sidebar / Batches */}
        <div className="space-y-6">
          <div className="sticky top-20">
            <Card className="border-2 border-primary/10 bg-secondary/5">
              <CardHeader>
                <CardTitle>Available Batches</CardTitle>
                <CardDescription>Choose a batch that fits your schedule.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {program.batches.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">No batches available at the moment.</p>
                ) : (
                  program.batches.map((batch) => (
                    <div key={batch.id} className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{batch.name}</h4>
                        <Badge
                          variant={
                            batch.status === "open"
                              ? "default"
                              : batch.status === "closed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-muted-foreground text-sm">
                        <div className="flex items-center justify-between">
                          <span>Start:</span>
                          <span className="font-medium text-foreground">
                            {format(new Date(batch.startDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>End:</span>
                          <span className="font-medium text-foreground">
                            {format(new Date(batch.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Registration:</span>
                          <span className="font-medium text-foreground">
                            {format(new Date(batch.registrationEndDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        {/* Timeline Highlights */}
                        {(batch.verificationStartDate ||
                          batch.assessmentStartDate ||
                          batch.announcementDate ||
                          batch.onboardingDate) && (
                          <div className="mt-3 space-y-1 border-t pt-2">
                            <p className="font-semibold text-foreground text-xs">Timeline Highlights</p>
                            {batch.verificationStartDate && (
                              <div className="flex items-center justify-between text-xs">
                                <span>Verification:</span>
                                <span>{format(new Date(batch.verificationStartDate), "MMM d")}</span>
                              </div>
                            )}
                            {batch.assessmentStartDate && (
                              <div className="flex items-center justify-between text-xs">
                                <span>Assessment:</span>
                                <span>{format(new Date(batch.assessmentStartDate), "MMM d")}</span>
                              </div>
                            )}
                            {batch.announcementDate && (
                              <div className="flex items-center justify-between text-xs">
                                <span>Announcement:</span>
                                <span>{format(new Date(batch.announcementDate), "MMM d")}</span>
                              </div>
                            )}
                            {batch.onboardingDate && (
                              <div className="flex items-center justify-between text-xs">
                                <span>Onboarding:</span>
                                <span>{format(new Date(batch.onboardingDate), "MMM d")}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Quota display if needed */}
                        {batch.quota > 0 && (
                          <div className="flex items-center justify-between">
                            <span>Quota:</span>
                            <span className="font-medium text-foreground">{batch.quota}</span>
                          </div>
                        )}
                      </div>
                      <ProgramRegistration programId={program.id} batch={batch} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
