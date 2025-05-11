import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsNotEmpty } from 'class-validator';

export class CountryDto {
  @ApiProperty({
    example: 'South Africa',
    description: 'Common name of the country',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'https://flagcdn.com/za.svg',
    description: 'URL of the country flag (SVG preferred)',
    type: String,
  })
  @IsUrl()
  @IsNotEmpty()
  flag: string;
}
