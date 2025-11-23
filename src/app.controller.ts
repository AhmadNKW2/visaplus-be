import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return {
      data: this.appService.getHello(),
      message: 'Welcome to VisaPlus API'
    };
  }

  @Get('health')
  getHealth() {
    return {
      data: this.appService.getHealth(),
      message: 'Server is healthy'
    };
  }
}
