import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { ConfigService } from '@nestjs/config';

jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

const mockExternalApiResponse = [
  { name: { common: 'Testland', official: 'Republic of Testland' }, population: 1000, capital: ['Testville'], flags: { png: 'test.png', svg: 'test.svg' } },
  { name: { common: 'Mockania', official: 'Kingdom of Mockania' }, population: 2000, capital: ['Mockburg'], flags: { png: 'mock.png', svg: 'mock.svg' } },
  { name: { common: 'AlphaLand', official: 'Republic of AlphaLand' }, population: 500, capital: ['Alphacity'], flags: { png: 'alpha.png', svg: 'alpha.svg' } },
];

describe('CountriesController (e2e)', () => {
  let app: INestApplication;
  let globalPrefix: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('ExternalApiService')
      .useValue({
        getCountries: jest.fn().mockResolvedValue(mockExternalApiResponse),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);
    globalPrefix = configService.get<string>('API_GLOBAL_PREFIX', 'api');

    app.setGlobalPrefix(globalPrefix);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(`/countries (GET)`, () => {
    it('should return a list of countries, sorted alphabetically by name', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${globalPrefix}/countries`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(250);
    });
  });

  describe(`/countries/:name (GET)`, () => {
    it('should return details for a specific country (case-insensitive)', async () => {
      const countryName = 'South Africa';
      const response = await request(app.getHttpServer())
        .get(`/${globalPrefix}/countries/${countryName.toLowerCase()}`)
        .expect(200);

      expect(response.body).toEqual({
        name: "South Africa",
        flag: "https://flagcdn.com/za.svg",
        population: 59308690,
        capital: "Pretoria"
      });
    });

    it('should return 404 for a non-existent country', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${globalPrefix}/countries/NonExistentCountry`)
        .expect(404);
      expect(response.body.message).toContain('Country with name "NonExistentCountry" not found');
    });
  });
});
