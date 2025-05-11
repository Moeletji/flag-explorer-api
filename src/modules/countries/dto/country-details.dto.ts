import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { CountryDto } from './country.dto'; 

export class CountryDetailsDto extends CountryDto {
  @ApiProperty({
    example: 59308690,
    description: 'Population of the country',
    type: Number,
  })
  @IsInt()
  @Min(0)
  population: number;

  @ApiProperty({
    example: 'Pretoria',
    description: 'Capital city of the country. Can be "N/A" if not available.',
    type: String,
    nullable: true,
  })
  @IsString()
  @IsNotEmpty()
  capital: string;
}
