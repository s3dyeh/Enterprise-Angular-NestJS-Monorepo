import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { AppConfiguration } from '../config/config.type';

@ApiTags('Home')
@Controller()
export class HomeController {
  constructor(
    private readonly configService: ConfigService<AppConfiguration>,
  ) {}

  @Get()
  appInfo() {
    return { name: this.configService.getOrThrow('app.name', { infer: true }) };
  }
}
