import { Injectable, Logger, NotFoundException, OnModuleInit, Inject, InternalServerErrorException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ExternalApiService, RestCountry } from '../external-api/external-api.service';
import { CountryDto } from './dto/country.dto';
import { CountryDetailsDto } from './dto/country-details.dto';
import { ConfigService } from '@nestjs/config';

const ALL_COUNTRIES_CACHE_KEY = 'all_countries_data_v1';

@Injectable()
export class CountriesService implements OnModuleInit {
  private readonly logger = new Logger(CountriesService.name);
  private readonly noFlagUrl: string;

  constructor(
    private readonly externalApiService: ExternalApiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService, 
  ) {
    this.noFlagUrl = this.configService.get<string>('NO_CFLAG_URL', 'https://placehold.co/60x40?text=No+Flag');
  }

  async onModuleInit() {
    this.logger.log('CountriesService initialized. Attempting to pre-warm cache...');
    await this.loadAndCacheCountries().catch(error => {
        this.logger.error('Failed to pre-warm cache on startup:', error.message);
    });
  }

  private transformToCountryDetailsDto(country: RestCountry): CountryDetailsDto {
    return {
      name: country.name.common,
      flag: country.flags.svg || country.flags.png || this.noFlagUrl,
      population: country.population,
      capital: country.capital?.[0] || 'N/A',
    };
  }

  private async loadAndCacheCountries(isRetry: boolean = false): Promise<CountryDetailsDto[]> {
    this.logger.log('Attempting to load countries from external API and cache them.');
    try {
      const rawCountries = await this.externalApiService.fetchAllCountries();
      if (!rawCountries || rawCountries.length === 0) {
          this.logger.warn('External API returned no countries.');
          await this.cacheManager.del(ALL_COUNTRIES_CACHE_KEY);
          return [];
      }
      const transformedCountries = rawCountries
        .map(this.transformToCountryDetailsDto)
        .sort((a, b) => a.name.localeCompare(b.name));

      await this.cacheManager.set(ALL_COUNTRIES_CACHE_KEY, transformedCountries);
      this.logger.log(`Successfully fetched and cached ${transformedCountries.length} countries.`);
      return transformedCountries;
    } catch (error) {
      this.logger.error(`Failed to load and cache countries: ${error.message}`, error.stack);
      if (!isRetry) {
          this.logger.log('Retrying to load and cache countries in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.loadAndCacheCountries(true);
      }
      throw new InternalServerErrorException('Failed to update country data from external source.');
    }
  }

  private async getCountriesFromCacheOrFetch(): Promise<CountryDetailsDto[]> {
    const cachedData = await this.cacheManager.get<CountryDetailsDto[]>(ALL_COUNTRIES_CACHE_KEY);
    if (cachedData && cachedData.length > 0) { 
      this.logger.log(`Returning ${cachedData.length} countries from cache.`);
      return cachedData;
    }
    this.logger.log('Cache miss or empty cache for countries data. Fetching from source...');
    return this.loadAndCacheCountries();
  }

  async findAll(): Promise<CountryDto[]> {
    const allCountryDetails = await this.getCountriesFromCacheOrFetch();
    if (allCountryDetails.length === 0) {
        this.logger.warn('findAll: No country data available after attempting fetch.');
        throw new InternalServerErrorException('No country data available.');
    }
    return allCountryDetails.map(country => ({
      name: country.name,
      flag: country.flag,
    }));
  }

  async findOne(name: string): Promise<CountryDetailsDto> {
    const allCountryDetails = await this.getCountriesFromCacheOrFetch();
    const countryNameLower = name.toLowerCase();
    const country = allCountryDetails.find(c => c.name.toLowerCase() === countryNameLower);

    if (!country) {
      this.logger.warn(`findOne: Country with name "${name}" not found in available data.`);
      throw new NotFoundException(`Country with name "${name}" not found`);
    }
    return country;
  }

  async refreshCache(): Promise<{ message: string, count: number }> {
    this.logger.log('Manual cache refresh triggered for countries.');
    const refreshedCountries = await this.loadAndCacheCountries();
    return { message: 'Country cache refreshed successfully.', count: refreshedCountries.length };
  }
}
