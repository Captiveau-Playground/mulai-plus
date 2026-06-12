"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Trophy,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

const accColors: Record<string, string> = {
  Unggul: "border-green-500/20 bg-green-500/10 text-green-600",
  "Baik Sekali": "border-blue-500/20 bg-blue-500/10 text-blue-600",
  Baik: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
  Terakreditasi: "border-gray-500/20 bg-gray-500/10 text-gray-600",
};

export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const { data: _uni, isLoading } = useQuery({
    ...api.pddikti.getUniversity.queryOptions({ input: { id } }),
    staleTime: 1000 * 60 * 5,
  });

  const uni = _uni as any;

  if (isLoading) {
    return (
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!uni) {
    return (
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">University not found</h3>
          <Button variant="outline" onClick={() => router.push("/admin/pddikti/universities" as any)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const totalStudents = uni.studyPrograms?.reduce((s: number, p: any) => s + (p.totalStudents ?? 0), 0) ?? 0;
  const totalLecturers =
    uni.lecturerCounts?.totalLecturers ??
    uni.studyPrograms?.reduce((s: number, p: any) => s + (p.totalLecturers ?? 0), 0) ??
    0;

  return (
    <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/admin/pddikti/universities" as any)}
          className="mb-4 flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Universities
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">{uni.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                {uni.shortName && <span>{uni.shortName}</span>}
                {uni.code && (
                  <>
                    <span>·</span>
                    <span>Code: {uni.code}</span>
                  </>
                )}
                {uni.province && (
                  <>
                    <span>·</span>
                    <MapPin className="inline h-3 w-3" />
                    <span>{uni.province}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                uni.type === "Negeri"
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                  : uni.type === "Agama"
                    ? "border-green-500/20 bg-green-500/10 text-green-600"
                    : "border-orange-500/20 bg-orange-500/10 text-orange-600"
              }
            >
              {uni.type}
            </Badge>
            {uni.accreditation && (
              <Badge variant="outline" className={accColors[uni.accreditation] ?? ""}>
                <Trophy className="mr-1 h-3 w-3" />
                {uni.accreditation}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                uni.status === "Aktif"
                  ? "border-green-500/20 bg-green-500/10 text-green-600"
                  : "border-red-500/20 bg-red-500/10 text-red-600"
              }
            >
              {uni.status ?? "-"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs {uni.totalPrograms ? `(${uni.totalPrograms})` : ""}</TabsTrigger>
          <TabsTrigger value="students">Students & Lecturers</TabsTrigger>
          <TabsTrigger value="snpmb">SNPMB Data</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW ═══ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-xs">Programs</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{uni.totalPrograms ?? "-"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-xs">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{totalStudents.toLocaleString() || "-"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-xs">Lecturers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{totalLecturers.toLocaleString() || "-"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-xs">Tuition Range</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-sm">{uni.tuitionRange ?? "-"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* University Details Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contact & Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {uni.details?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={uni.details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline"
                    >
                      {uni.details.website}
                    </a>
                  </div>
                )}
                {uni.details?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{uni.details.email}</span>
                  </div>
                )}
                {uni.details?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{uni.details.phone}</span>
                  </div>
                )}
                {uni.details?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {uni.details.address}
                      {uni.details?.postalCode ? `, ${uni.details.postalCode}` : ""}
                    </span>
                  </div>
                )}
                {uni.details?.foundedDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>Founded: {uni.details.foundedDate}</span>
                  </div>
                )}
                {!uni.details && (
                  <p className="py-4 text-center text-muted-foreground">No contact details available.</p>
                )}
              </CardContent>
            </Card>

            {/* Accreditation & Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Accreditation &amp; Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PT Accreditation:</span>
                  <Badge variant="outline" className={accColors[uni.accreditation ?? ""] ?? ""}>
                    {uni.accreditation ?? "-"}
                  </Badge>
                </div>
                {uni.details?.accreditationStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Detail Status:</span>
                    <span>{uni.details.accreditationStatus}</span>
                  </div>
                )}
                {uni.graduationRates?.graduationRate != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Graduation Rate:</span>
                    <span className="font-semibold">{uni.graduationRates.graduationRate}%</span>
                  </div>
                )}
                {uni.studentStats && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Graduates/yr:</span>
                    <span>{uni.studentStats.avgGraduates?.toLocaleString() ?? "-"}</span>
                  </div>
                )}
                {uni.studentStats && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg New Students/yr:</span>
                    <span>{uni.studentStats.avgNewStudents?.toLocaleString() ?? "-"}</span>
                  </div>
                )}
                {uni.lecturerCounts?.totalLecturers != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Lecturers:</span>
                    <span>{uni.lecturerCounts.totalLecturers.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Study Durations */}
          {uni.studyDurations && uni.studyDurations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Study Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {uni.studyDurations.map((d: any) => (
                    <div key={d.id} className="rounded-lg border p-3 text-center">
                      <div className="font-medium text-muted-foreground text-xs">{d.level}</div>
                      <div className="font-bold text-lg">{d.avgDurationYears ?? "-"}</div>
                      <div className="text-[10px] text-muted-foreground">years</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Name History */}
          {uni.nameHistories && uni.nameHistories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Name History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uni.nameHistories.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                      <span>{h.oldName}</span>
                      <Badge variant="secondary">{h.yearChanged}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ PROGRAMS ═══ */}
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Study Programs ({uni.studyPrograms?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="border-b">
                      <th className="p-2 text-left font-medium">Code</th>
                      <th className="p-2 text-left font-medium">Name</th>
                      <th className="p-2 text-left font-medium">Level</th>
                      <th className="p-2 text-left font-medium">Accreditation</th>
                      <th className="p-2 text-center font-medium">Students</th>
                      <th className="p-2 text-center font-medium">Lecturers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uni.studyPrograms?.length ? (
                      uni.studyPrograms.map((p: any) => (
                        <tr key={p.idSms} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-mono">{p.code ?? "-"}</td>
                          <td className="p-2 font-medium">{p.name}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[10px]">
                              {p.level ?? "-"}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className={accColors[p.accreditation] ?? "text-[10px]"}>
                              {p.accreditation ?? "-"}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">{p.totalStudents?.toLocaleString() ?? "-"}</td>
                          <td className="p-2 text-center">{p.totalLecturers ?? "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          No study programs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ STUDENTS & LECTURERS ═══ */}
        <TabsContent value="students" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Student Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Students (all programs):</span>
                  <span className="font-semibold">{totalStudents.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Graduates/year:</span>
                  <span>{uni.studentStats?.avgGraduates?.toLocaleString() ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg New Students/year:</span>
                  <span>{uni.studentStats?.avgNewStudents?.toLocaleString() ?? "-"}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lecturer Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Lecturers (count):</span>
                  <span className="font-semibold">{uni.lecturerCounts?.totalLecturers?.toLocaleString() ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Lecturers (from programs):</span>
                  <span>{totalLecturers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Graduation Rate:</span>
                  <span>
                    {uni.graduationRates?.graduationRate != null ? `${uni.graduationRates.graduationRate}%` : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          {uni.studyDurations && uni.studyDurations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Study Duration per Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {uni.studyDurations.map((d: any) => (
                    <div key={d.id} className="rounded-lg border p-3 text-center">
                      <div className="font-medium text-muted-foreground text-xs">{d.level}</div>
                      <div className="font-bold text-lg">{d.avgDurationYears ?? "-"}</div>
                      <div className="text-[10px] text-muted-foreground">years</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ SNPMB ═══ */}
        <TabsContent value="snpmb" className="space-y-4">
          {uni?.universityMappings?.length ? (
            uni.universityMappings.map((m: any) => (
              <div key={m.idPtn}>
                {/* Mapping info */}
                <Card className="mb-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">SNPMB Mapping</CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        {m.matchType} ({m.matchSimilarity?.toFixed(2)})
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">PTN ID:</span>
                      <p className="font-medium">{m.idPtn}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PTN Name:</span>
                      <p className="font-medium">{m.name}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* SNBP Programs */}
                {m.snpmbUniversity?.snbpPrograms?.length > 0 && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-sm">SNBP Programs ({m.snpmbUniversity.snbpPrograms.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-80 overflow-x-auto overflow-y-auto rounded-md border">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted/50">
                            <tr className="border-b">
                              <th className="p-2 text-left font-medium">Program</th>
                              <th className="p-2 text-left font-medium">Level</th>
                              <th className="p-2 text-center font-medium">Capacity 2025</th>
                              <th className="p-2 text-left font-medium">History (apps)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.snpmbUniversity.snbpPrograms.map((prog: any) => (
                              <tr key={prog.idProdi} className="border-b hover:bg-muted/30">
                                <td className="p-2 font-medium">{prog.name}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {prog.level ?? "-"}
                                  </Badge>
                                </td>
                                <td className="p-2 text-center">{prog.capacity ?? "-"}</td>
                                <td className="p-2">
                                  <div className="flex flex-wrap gap-1">
                                    {prog.capacityHistory?.map((h: any) => (
                                      <Badge key={h.id} variant="secondary" className="text-[10px]">
                                        {h.year}: {h.applicants ?? "?"} apps {h.accepted ? `· ${h.accepted} acc` : ""}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* SNBT Programs */}
                {m.snpmbUniversity?.snbtPrograms?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">SNBT Programs ({m.snpmbUniversity.snbtPrograms.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-80 overflow-x-auto overflow-y-auto rounded-md border">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted/50">
                            <tr className="border-b">
                              <th className="p-2 text-left font-medium">Program</th>
                              <th className="p-2 text-left font-medium">Level</th>
                              <th className="p-2 text-center font-medium">Capacity 2025</th>
                              <th className="p-2 text-left font-medium">History (apps)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.snpmbUniversity.snbtPrograms.map((prog: any) => (
                              <tr key={prog.idProdi} className="border-b hover:bg-muted/30">
                                <td className="p-2 font-medium">{prog.name}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {prog.level ?? "-"}
                                  </Badge>
                                </td>
                                <td className="p-2 text-center">{prog.capacity ?? "-"}</td>
                                <td className="p-2">
                                  <div className="flex flex-wrap gap-1">
                                    {prog.capacityHistory?.map((h: any) => (
                                      <Badge key={h.id} variant="secondary" className="text-[10px]">
                                        {h.year}: {h.applicants ?? "?"} apps
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ExternalLink className="h-8 w-8" />
                <p className="text-sm">No SNPMB data available.</p>
                <p className="text-xs">Only PTN participants of SNPMB have mapping data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ DETAILS ═══ */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Full University Details</CardTitle>
            </CardHeader>
            <CardContent>
              {uni.details ? (
                <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Group:</span>
                    <p className="font-medium">{uni.details.groupName ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supervisor:</span>
                    <p className="font-medium">{uni.details.supervisor ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium">{uni.details.address ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Postal Code:</span>
                    <p className="font-medium">{uni.details.postalCode ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subdistrict:</span>
                    <p className="font-medium">{uni.details.subdistrict ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Coordinates:</span>
                    <p className="font-medium">
                      {uni.details.latitude?.toFixed(4)}, {uni.details.longitude?.toFixed(4) ?? "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Founded:</span>
                    <p className="font-medium">{uni.details.foundedDate ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Decree:</span>
                    <p className="font-medium">{uni.details.establishmentDecree ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Decree Date:</span>
                    <p className="font-medium">{uni.details.establishmentDecreeDate ?? "-"}</p>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground text-xs">No detailed information available.</p>
              )}
            </CardContent>
          </Card>
          {uni.tuitionFees && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tuition Fees</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Range:</span>
                  <span className="font-medium">{uni.tuitionFees.tuitionRange ?? "-"}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
