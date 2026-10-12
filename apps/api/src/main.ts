import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET ?? '';
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? '';
    if (jwtSecret.length < 32 || refreshSecret.length < 32) {
      console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be at least 32 characters in production.');
      process.exit(1);
    }
  }

  app.use(helmet());
  app.use(compression());

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'https://owenkg.github.io'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Spenditure API')
    .setDescription('Personal finance tracking — income, expenses, budgets, and imports')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Spenditure API running on port ${port}`);
}

bootstrap();
