import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
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
import { formatNumber } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, Users } from "lucide-react";

export default function AdminUsers() {
  const { data, isLoading } = trpc.admin.users.useQuery({ limit: 200 });

  return (
    <AdminLayout title="Usuários" description="Contas cadastradas na plataforma">
      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard
          label="Total"
          value={isLoading ? "—" : formatNumber(data?.counts.total ?? 0)}
          icon={Users}
        />
        <StatCard
          label="Administradores"
          value={isLoading ? "—" : formatNumber(data?.counts.admins ?? 0)}
          icon={ShieldCheck}
        />
      </div>

      <Card className="mt-6">
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
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Último acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.list.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.lastSignedIn
                          ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data && data.list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Nenhum usuário cadastrado ainda.
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
