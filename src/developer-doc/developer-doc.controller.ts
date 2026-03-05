import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  CreateDeveloperDocDto,
  UpdateDeveloperDocDto,
} from './dto/developer-doc.dto';
import { DeveloperDocService } from './developer-doc.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';

@Controller('api/v1/developer-docs')
export class DeveloperDocController {
  constructor(private readonly developerDocService: DeveloperDocService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createDeveloperDocDto: CreateDeveloperDocDto, @Request() req) {
    const doc = await this.developerDocService.create(createDeveloperDocDto, req.user);

    return {
      status: 200,
      message: 'Developer document created successfully',
      data: this.developerDocService.toResponseDto(doc),
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('includeUnpublished') includeUnpublished?: string | boolean,
    @Request() req?,
  ) {
    const requestedUnpublished =
      includeUnpublished === true || includeUnpublished === 'true';
    const canSeeUnpublished =
      req?.user?.isAdmin === true && requestedUnpublished;

    const docs = await this.developerDocService.findAll(canSeeUnpublished);

    return {
      status: 200,
      message: 'Developer documents retrieved successfully',
      data: docs.map(doc => this.developerDocService.toResponseDto(doc)),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const doc = await this.developerDocService.findOne(+id);

    return {
      status: 200,
      message: 'Developer document retrieved successfully',
      data: this.developerDocService.toResponseDto(doc),
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() updateDeveloperDocDto: UpdateDeveloperDocDto) {
    const doc = await this.developerDocService.update(+id, updateDeveloperDocDto);

    return {
      status: 200,
      message: 'Developer document updated successfully',
      data: this.developerDocService.toResponseDto(doc),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.developerDocService.remove(+id);

    return {
      status: 200,
      message: 'Developer document deleted successfully',
    };
  }
}
