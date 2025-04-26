import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';

@Controller('api/v1/notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createNoticeDto: CreateNoticeDto, @Request() req) {
    const notice = await this.noticeService.create(createNoticeDto, req.user);
    return {
      status: 200,
      message: 'Notice created successfully',
      data: this.noticeService.toResponseDto(notice),
    };
  }

  @Get()
  async findAll(
    @Query('includeInactive') includeInactive?: boolean,
    @Request() req?,
  ) {
    const canSeeInactive =
      req?.user?.isAdmin === true && includeInactive === true;
    const notices = await this.noticeService.findAll(canSeeInactive);

    return {
      status: 200,
      message: 'Notices retrieved successfully',
      data: notices.map((notice) => this.noticeService.toResponseDto(notice)),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const notice = await this.noticeService.findOne(+id);
    return {
      status: 200,
      message: 'Notice retrieved successfully',
      data: this.noticeService.toResponseDto(notice),
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateNoticeDto: UpdateNoticeDto,
  ) {
    const notice = await this.noticeService.update(+id, updateNoticeDto);
    return {
      status: 200,
      message: 'Notice updated successfully',
      data: this.noticeService.toResponseDto(notice),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.noticeService.remove(+id);
    return {
      status: 200,
      message: 'Notice deleted successfully',
    };
  }
}
