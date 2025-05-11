import { Module } from '@nestjs/common';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { ExternalApiModule } from '../external-api/external-api.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ExternalApiModule,
    ConfigModule,
  ],
  controllers: [CountriesController],
  providers: [CountriesService],
})
export class CountriesModule {}