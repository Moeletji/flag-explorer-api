import { Test, TestingModule } from '@nestjs/testing';
import { CountriesService } from '../../../src/modules/countries/countries.service';
import { ExternalApiService, RestCountry } from '../../../src/modules/external-api/external-api.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

const mockRawCountries: RestCountry[] = [
  { name: { common: 'South Africa', official: 'Republic of South Africa' }, population: 60000000, capital: ['Pretoria'], flags: { png: 'sa.png', svg: 'sa.svg' } },
  { name: { common: 'Nigeria', official: 'Federal Republic of Nigeria' }, population: 210000000, capital: ['Abuja'], flags: { png: 'ng.png', svg: 'ng.svg' }},
  { name: { common: 'No Capital Land', official: 'No Capital Land' }, population: 100, flags: { png: 'nc.png', svg: 'nc.svg' } },
  { name: { common: 'Alpha Land', official: 'Alpha Land' }, population: 50, capital: ['AlphaCity'], flags: { png: 'al.png', svg: 'al.svg' } },
];

const mockTransformedAndSortedCountries = [
    { name: 'Alpha Land', population: 50, capital: 'AlphaCity', flag: 'al.svg' },
    { name: 'Nigeria', population: 210000000, capital: 'Abuja', flag: 'ng.svg' },
    { name: 'No Capital Land', population: 100, capital: 'N/A', flag: 'nc.svg' },
    { name: 'South Africa', population: 60000000, capital: 'Pretoria', flag: 'sa.svg' },
];


describe('CountriesService', () => {
  let service: CountriesService;
  let externalApiService: jest.Mocked<ExternalApiService>;
  let cacheManager: jest.Mocked<Cache>;
  let configService: jest.Mocked<ConfigService>;


  beforeEach(async () => {
    const externalApiServiceMock = {
      fetchAllCountries: jest.fn(),
    };
    const cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const configServiceMock = {
      get: jest.fn(),
    };


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountriesService,
        { provide: ExternalApiService, useValue: externalApiServiceMock },
        { provide: CACHE_MANAGER, useValue: cacheManagerMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<CountriesService>(CountriesService);
    externalApiService = module.get(ExternalApiService);
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get(ConfigService);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CACHE_TTL_SECONDS') return 3600;
        return defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should attempt to load and cache countries', async () => {
      externalApiService.fetchAllCountries.mockResolvedValue(mockRawCountries);
      cacheManager.get.mockResolvedValue(undefined); 

      await service.onModuleInit();

      expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('all_countries_data_v1', mockTransformedAndSortedCountries);
    });

    it('should log an error if pre-warming cache fails', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');
      externalApiService.fetchAllCountries.mockRejectedValue(new Error('External API Down'));
      cacheManager.get.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to pre-warm cache on startup:',
        'External API Error: External API Down' 
      );
       expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should return sorted countries (name and flag) from cache if available', async () => {
      cacheManager.get.mockResolvedValue(mockTransformedAndSortedCountries);
      const result = await service.findAll();
      expect(externalApiService.fetchAllCountries).not.toHaveBeenCalled();
      expect(result).toEqual(mockTransformedAndSortedCountries.map(c => ({ name: c.name, flag: c.flag })));
    });

    it('should fetch, cache, sort, and return countries if cache is empty', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      externalApiService.fetchAllCountries.mockResolvedValue(mockRawCountries);

      const result = await service.findAll();

      expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('all_countries_data_v1', mockTransformedAndSortedCountries);
      expect(result).toEqual(mockTransformedAndSortedCountries.map(c => ({ name: c.name, flag: c.flag })));
    });

     it('should return empty array if external API returns no countries', async () => {
        cacheManager.get.mockResolvedValue(undefined);
        externalApiService.fetchAllCountries.mockResolvedValue([]);
        const result = await service.findAll();
        expect(result).toEqual([]);
        expect(cacheManager.del).toHaveBeenCalledWith('all_countries_data_v1');
    });
  });

  describe('findOne', () => {
    it('should return country details for a valid name from cache', async () => {
      cacheManager.get.mockResolvedValue(mockTransformedAndSortedCountries);
      const countryName = 'South Africa';
      const result = await service.findOne(countryName);
      expect(result).toEqual(mockTransformedAndSortedCountries.find(c => c.name === countryName));
    });

    it('should throw NotFoundException for an invalid country name', async () => {
      cacheManager.get.mockResolvedValue(mockTransformedAndSortedCountries);
      await expect(service.findOne('NonExistentCountry')).rejects.toThrow(NotFoundException);
    });

    it('should handle case-insensitivity for findOne', async () => {
        cacheManager.get.mockResolvedValue(mockTransformedAndSortedCountries);
        const result = await service.findOne('south africa');
        expect(result.name).toBe('South Africa');
    });

    it('should correctly return "N/A" for capital if not provided by external API', async () => {
        cacheManager.get.mockResolvedValue(mockTransformedAndSortedCountries);
        const result = await service.findOne('No Capital Land');
        expect(result.capital).toBe('N/A');
    });
  });

  describe('refreshCache', () => {
    it('should call external API, re-cache, and return success message with count', async () => {
      const newMockRawCountries = [{ name: { common: 'New Land', official: 'New Land' }, population: 10, capital: ['New City'], flags: { svg: 'new.svg' }, cca3: 'NWL' }];
      const expectedTransformedNew = [{ name: 'New Land', population: 10, capital: 'New City', flag: 'new.svg' }];
      externalApiService.fetchAllCountries.mockResolvedValue(newMockRawCountries);

      const result = await service.refreshCache();

      expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('all_countries_data_v1', expectedTransformedNew);
      expect(result).toEqual({ message: 'Country cache refreshed successfully.', count: 1 });
    });

    it('should throw InternalServerErrorException if refresh fails after retry', async () => {
        externalApiService.fetchAllCountries.mockRejectedValue(new Error('API Down'));
        await expect(service.refreshCache()).rejects.toThrow(InternalServerErrorException);
        expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(2); 
    });
  });

  describe('Error Handling for loadAndCacheCountries', () => {
    it('should retry fetching if the first attempt fails', async () => {
        externalApiService.fetchAllCountries
            .mockRejectedValueOnce(new Error('Temporary Glitch'))
            .mockResolvedValueOnce(mockRawCountries);

        const result = await service['getCountriesFromCacheOrFetch'](); 

        expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(2);
        expect(cacheManager.set).toHaveBeenCalledWith('all_countries_data_v1', mockTransformedAndSortedCountries);
        expect(result).toEqual(mockTransformedAndSortedCountries);
    });

    it('should throw InternalServerErrorException if all retries fail', async () => {
        externalApiService.fetchAllCountries.mockRejectedValue(new Error('Persistent API Down'));

        await expect(service['getCountriesFromCacheOrFetch']()).rejects.toThrow(InternalServerErrorException);

        expect(externalApiService.fetchAllCountries).toHaveBeenCalledTimes(2); 
    });
  });
});
