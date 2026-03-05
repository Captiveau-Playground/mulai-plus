// "use client";

// import { useQuery } from "@tanstack/react-query";
// import { format } from "date-fns";
// import { Loader2 } from "lucide-react";
// import Link from "next/link";

// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { orpc } from "@/utils/orpc";

// export default function ProgramsPage() {
//   const { data, isLoading } = useQuery(
//     orpc.programs.public.list.queryOptions({
//       input: { limit: 100 },
//     }),
//   );

//   if (isLoading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//       </div>
//     );
//   }

//   const programs = data?.data || [];

//   return (
//     <div className="container py-10">
//       <div className="mb-8">
//         <h1 className="font-bold text-3xl tracking-tight">Our Programs</h1>
//         <p className="text-muted-foreground">Explore our mentoring programs and boost your career.</p>
//       </div>

//       {programs.length === 0 ? (
//         <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
//           <p className="text-muted-foreground">No programs available at the moment.</p>
//         </div>
//       ) : (
//         <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
//           {programs.map((program) => (
//             <Link key={program.id} href={`/programs/${program.slug}` as any}>
//               <Card className="h-full transition-shadow hover:shadow-lg">
//                 <CardHeader>
//                   <div className="flex items-start justify-between">
//                     <CardTitle className="line-clamp-1">{program.name}</CardTitle>
//                   </div>
//                   <CardDescription className="line-clamp-2">{program.description}</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex items-center gap-2 text-muted-foreground text-sm">
//                     {/* Duration moved to batches */}
//                   </div>
//                 </CardContent>
//                 <CardFooter>
//                   <p className="text-muted-foreground text-xs">
//                     Created {format(new Date(program.createdAt), "MMM d, yyyy")}
//                   </p>
//                 </CardFooter>
//               </Card>
//             </Link>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
