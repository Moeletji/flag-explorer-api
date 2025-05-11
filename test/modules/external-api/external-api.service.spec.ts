import { Test, TestingModule } from '@nestjs/testing';
import { ExternalApiService } from '../../../src/modules/external-api/external-api.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('ExternalApiService', () => {
  let service: ExternalApiService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalApiService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://restcountries.com/v3.1/all'),
          },
        },
      ],
    }).compile();

    service = module.get<ExternalApiService>(ExternalApiService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAllCountries', () => {
    it('should fetch all countries successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: [
          {
            name: { common: 'Country A', official: 'Country A Official' },
            population: 1000000,
            capital: ['Capital A'],
            flags: { png: 'flag-a.png', svg: 'flag-a.svg', alt: 'Flag A' },
          },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: null,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.fetchAllCountries();

      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith('https://restcountries.com/v3.1/all');
    });

    it('should throw an error if the API call fails', async () => {
      const mockError = {
        message: 'Network Error',
        stack: 'Error stack trace',
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockError));

      await expect(service.fetchAllCountries()).rejects.toThrow('External API Error: Network Error');
      expect(httpService.get).toHaveBeenCalledWith('https://restcountries.com/v3.1/all');
    });
  });
});
