import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';

export interface RestCountryFlag {
  png?: string;
  svg?: string;
  alt?: string;
}
export interface RestCountryName {
  common: string;
  official: string;
}
export interface RestCountry {
  name: RestCountryName;
  population: number;
  capital?: string[];
  flags: RestCountryFlag;
}

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly restCountriesUrl: string;
  private readonly restCountryDetailsUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.restCountriesUrl = this.configService.get<string>('REST_COUNTRIES_API_URL', 'https://restcountries.com/v3.1/all');  }

  async fetchAllCountries(): Promise<RestCountry[]> {
    try {
      this.logger.log(`Fetching all countries from external API: ${this.restCountriesUrl}`);
      const response = await firstValueFrom(
        this.httpService.get<RestCountry[]>(this.restCountriesUrl)
        ) as unknown as AxiosResponse<RestCountry[]>;
      this.logger.log(`Successfully fetched ${response.data.length} country details from external API.`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Failed to fetch countries from ${this.restCountriesUrl}: ${axiosError.message}`, axiosError.stack);
      throw new Error(`External API Error: ${axiosError.message}`);
    }
  }
}