import { Controller, Get, Param, Post, HttpCode } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CountryDto } from './dto/country.dto';
import { CountryDetailsDto } from './dto/country-details.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all countries', description: 'Returns a list of all countries with their names and flag URLs, sorted alphabetically by name.' })
  @ApiResponse({ status: 200, description: 'A list of countries', type: [CountryDto] })
  @ApiResponse({ status: 500, description: 'Internal server error if data cannot be fetched.'})
  async findAll(): Promise<CountryDto[]> {
    return this.countriesService.findAll();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Retrieve details about a specific country' })
  @ApiParam({ name: 'name', description: 'The common name of the country (case-insensitive)', type: String, example: 'South Africa' })
  @ApiResponse({ status: 200, description: 'Details about the country', type: CountryDetailsDto })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 500, description: 'Internal server error.'})
  async findOne(@Param('name') name: string): Promise<CountryDetailsDto> {
    return this.countriesService.findOne(name);
  }

  @Post('cache/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Manually refresh the country data cache from the external source.'})
  @ApiResponse({ status: 200, description: 'Cache refresh process initiated and completed.', type: Object })
  @ApiResponse({ status: 500, description: 'Failed to refresh cache.'})
  async refreshCountriesCache(): Promise<{ message: string, count: number }> {
    return this.countriesService.refreshCache();
  }
}
