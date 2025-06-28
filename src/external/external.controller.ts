import { Body, Controller, Post } from "@nestjs/common";
import { CreateExternalDto } from "./dto/create-external.dto";
import { ExternalService } from "./external.service";

@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) { }

  @Post()
  create(@Body() dto: CreateExternalDto) {
    return this.externalService.create(dto);
  }
}