import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Bendo API')
    .setDescription(
      `## Bendo Wallet — API wrapper para Formance Ledger

API de pagos con contabilidad de doble entrada. Gestiona merchants, procesa cobros con split automático de comisión y administra retiros de wallet.

### Arquitectura
- **PostgreSQL** — Almacena metadatos de merchants (nombre, tipo, comisión, estado)
- **Formance Ledger v2.4.0** — Motor de contabilidad de doble entrada. Todas las transacciones financieras viven aquí.

### Estructura de cuentas en el ledger
\`\`\`
world                           → Fuente de fondos
merchants:{id}:available        → Saldo disponible del merchant
merchants:{id}:withdrawals      → Fondos en proceso de retiro (hold)
bendo:fees                      → Comisiones acumuladas de Bendo
bank:settlements                → Fondos liquidados al banco
\`\`\`

### Flujo de cobro
\`world → merchants:{id}:available\` (monto neto) + \`world → bendo:fees\` (comisión)

### Flujo de retiro
1. \`merchants:{id}:available → merchants:{id}:withdrawals\` (hold)
2. \`merchants:{id}:withdrawals → bank:settlements\` (liquidación)

### Montos
Todos los importes van en **centavos (USD/2)**. Ejemplo: $100.00 = \`10000\`

### Nota sobre filtros del ledger
Formance Ledger v2.4.0 ignora los query params de filtro (account, destination, metadata). El filtrado por merchant se realiza client-side paginando todo el ledger.`,
    )
    .setVersion('0.1.0')
    .setContact('Bendo Engineering', '', 'engineering@bendo.mx')
    .addTag('Merchants', 'Gestión de merchants — alta, consulta, edición y desactivación')
    .addTag('Checkout', 'Procesamiento de cobros con split automático de comisión Bendo')
    .addTag('Wallet', 'Consulta de balances y solicitud de retiros para merchants con wallet habilitada')
    .addTag('Backoffice', 'Estadísticas, earnings, trazabilidad del ledger y administración')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // UI interactiva en /docs
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Bendo API Docs',
    swaggerOptions: { persistAuthorization: true, filter: true, showExtensions: true },
  });

  // OpenAPI JSON en /api/openapi.json
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(document, null, 2));
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Bendo API running on :${port}`);
  console.log(`  Swagger UI  → http://localhost:${port}/docs`);
  console.log(`  OpenAPI JSON → http://localhost:${port}/api/openapi.json`);
}

bootstrap();
