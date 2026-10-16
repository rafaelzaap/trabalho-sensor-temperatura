using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MonitorTemperatura.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CriacaoInicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // O banco inicial foi criado pelo EnsureCreatedAsync. IF NOT EXISTS permite
            // adotar essa estrutura sem apagar as leituras já registradas.
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS "Leituras" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_Leituras" PRIMARY KEY AUTOINCREMENT,
                    "ValorCelsius" REAL NOT NULL,
                    "RegistradaEmUtc" TEXT NOT NULL,
                    "SensorId" TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS "IX_Leituras_RegistradaEmUtc"
                    ON "Leituras" ("RegistradaEmUtc");

                CREATE INDEX IF NOT EXISTS "IX_Leituras_SensorId_RegistradaEmUtc"
                    ON "Leituras" ("SensorId", "RegistradaEmUtc");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Leituras");
        }
    }
}
