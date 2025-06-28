import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { updateOverdueAccounts } from './common/actions/updateOverdueAccounts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Main');

  await updateOverdueAccounts().catch(err => {
    logger.error('Error al actualizar estados:', err)
  })

  app.enableCors(
    {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }
  );
  
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  await app.listen(envs.port);
  logger.log(`Server is running on ${envs.port}`);
}
bootstrap();
