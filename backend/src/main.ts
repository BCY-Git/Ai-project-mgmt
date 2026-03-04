import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Reflector } from '@nestjs/core';
import { AuthenticatedGuard } from './common/guards/authenticated.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const reflector = app.get(Reflector);

  app.useGlobalPipes(GlobalValidationPipe);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(new AuthenticatedGuard(reflector));

  app.setGlobalPrefix('api/v1');

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('AI项目管理系统 API')
    .setDescription('AI项目管理的API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? true : ['http://localhost', 'http://yourdomain.com'],
    credentials: true,
  });

  await app.listen(process.env.APP_PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
