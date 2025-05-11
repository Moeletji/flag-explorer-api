import { Module } from '@nestjs/common';
import { CountriesModule } from './modules/countries/countries.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get<number>('CACHE_TTL_SECONDS', 3600) * 1000, 
        store: configService.get<string>('CACHE_STORE', 'memory'), 
        max: +configService.get<number>('MAX_CACHE_SIZE', 280),
      }),
      inject: [ConfigService], 
    }),
    CountriesModule,
    ExternalApiModule,
  ],
})
export class AppModule {}
