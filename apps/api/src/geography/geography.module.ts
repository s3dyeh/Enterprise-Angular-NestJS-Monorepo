import { Module } from '@nestjs/common';
import { RegionsController } from './regions.controller';
import { CitiesController } from './cities.controller';

@Module({ controllers: [RegionsController, CitiesController] })
export class GeographyModule {}
