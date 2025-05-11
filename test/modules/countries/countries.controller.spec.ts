import { Test, TestingModule } from '@nestjs/testing';
import { CountriesController } from '../../../src/modules/countries/countries.controller';
import { CountriesService } from '../../../src/modules/countries/countries.service';
import { CountryDto } from '../../../src/modules/countries/dto/country.dto';
import { CountryDetailsDto } from '../../../src/modules/countries/dto/country-details.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

const mockCountriesList: CountryDto[] = [
  { name: 'South Africa', flag: 'sa.svg' },
  { name: 'Nigeria', flag: 'ng.svg' },
];

const mockCountryDetails: CountryDetailsDto = {
  name: 'South Africa',
  population: 60000000,
  capital: 'Pretoria',
  flag: 'sa.svg',
};

describe('CountriesController', () => {
  let controller: CountriesController;
  let service: jest.Mocked<CountriesService>;

  const mockCountriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    refreshCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountriesController],
      providers: [
        { provide: CountriesService, useValue: mockCountriesService },
      ],
    }).compile();

    controller = module.get<CountriesController>(CountriesController);
    service = module.get(CountriesService); 
  });

  afterEach(() => {
    jest.clearAllMocks(); 
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of countries from the service', async () => {
      service.findAll.mockResolvedValue(mockCountriesList);
      const result = await controller.findAll();
      expect(result).toEqual(mockCountriesList);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from service', async () => {
        service.findAll.mockRejectedValue(new InternalServerErrorException('Service unavailable'));
        await expect(controller.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('should return country details for a valid name from the service', async () => {
      service.findOne.mockResolvedValue(mockCountryDetails);
      const result = await controller.findOne('South Africa');
      expect(result).toEqual(mockCountryDetails);
      expect(service.findOne).toHaveBeenCalledWith('South Africa');
    });

    it('should throw NotFoundException if service throws it for an invalid country name', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Country not found'));
      await expect(controller.findOne('NonExistent')).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith('NonExistent');
    });
  });

  describe('refreshCountriesCache', () => {
    it('should call service refreshCache and return its result', async () => {
      const refreshResult = { message: 'Cache refreshed', count: 10 };
      service.refreshCache.mockResolvedValue(refreshResult);

      const result = await controller.refreshCountriesCache();
      expect(result).toEqual(refreshResult);
      expect(service.refreshCache).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors if service refreshCache fails', async () => {
        service.refreshCache.mockRejectedValue(new InternalServerErrorException('Failed to refresh'));
        await expect(controller.refreshCountriesCache()).rejects.toThrow(InternalServerErrorException);
    });
  });
});