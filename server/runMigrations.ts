import path from "path";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

/**
 * Aplica as migrações Drizzle no startup do app. Substitui o antigo serviço
 * "migrate" do docker-compose, permitindo deploy com uma ÚNICA imagem (a imagem
 * é construída no CI e o EC2 só faz pull). As migrações ficam em /app/drizzle
 * (copiadas no Dockerfile). É idempotente: migrações já aplicadas são puladas.
 */
export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[Migrate] DATABASE_URL ausente — pulando migrações.");
    return;
  }
  const migrationsFolder = path.resolve(import.meta.dirname, "../drizzle");
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder });
    console.log("[Migrate] Migrações aplicadas/atualizadas com sucesso.");
  } catch (error) {
    console.error("[Migrate] Falha ao aplicar migrações:", error);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
