import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);

  const globalPrefix = configService.get<string>('API_GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  logger.log(`CORS enabled for origin: ${frontendUrl}`);


  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flag Explorer API')
    .setDescription('API for retrieving country information including flags, population, and capitals.')
    .setVersion('1.0')
    .addTag('Countries', 'Endpoints related to country data')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerPath = configService.get<string>('SWAGGER_PATH', 'swagger');
  SwaggerModule.setup(swaggerPath, app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Backend application is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`Swagger API docs available at: http://localhost:${port}/${swaggerPath}`);
}
bootstrap();
