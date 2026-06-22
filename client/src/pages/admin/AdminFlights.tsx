import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceKm, formatHours } from "@/lib/format";
import { trpc } from "@/lib/trpc";

export default function AdminFlights() {
  const { data, isLoading } = trpc.admin.recentFlights.useQuery({ limit: 80 });

  return (
    <AdminLayout
      title="Voos"
      description="Voos realizados importados recentemente na plataforma"
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voo</TableHead>
                    <TableHead>Drone</TableHead>
                    <TableHead>Data do voo</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Distância</TableHead>
                    <TableHead>Importado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.flightName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.droneModel ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.flightDate ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatHours((f.durationSeconds ?? 0) / 3600)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceKm((f.distanceMeters ?? 0) / 1000)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.createdAt
                          ? new Date(f.createdAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data && data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Nenhum voo importado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
