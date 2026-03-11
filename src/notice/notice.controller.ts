import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { Request as ExpressRequest } from 'express';
import { NoticeService } from './notice.service';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import {
  getNoticeImageDirectory,
  getNoticeImagePublicPrefix,
} from 'src/config/upload.config';

const noticeImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const getNoticeImageExtension = (
  mimeType: string,
  originalName: string,
): string => {
  if (mimeType === 'image/webp') {
    return '.webp';
  }
  if (mimeType === 'image/png') {
    return '.png';
  }
  if (mimeType === 'image/gif') {
    return '.gif';
  }
  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  const extension = extname(originalName).toLowerCase();
  return extension || '.img';
};

const noticeImageStorage = diskStorage({
  destination: (_req, _file, callback) => {
    const noticeImageDirectory = getNoticeImageDirectory();
    mkdirSync(noticeImageDirectory, { recursive: true });
    callback(null, noticeImageDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = getNoticeImageExtension(file.mimetype, file.originalname);
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const noticeImageFileFilter = (
  _req: ExpressRequest,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!noticeImageMimeTypes.has(file.mimetype)) {
    callback(
      new BadRequestException(
        '지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, GIF만 업로드할 수 있습니다.',
      ),
      false,
    );
    return;
  }

  callback(null, true);
};

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

  @Post('image')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: noticeImageStorage,
      fileFilter: noticeImageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadNoticeImage(
    @UploadedFile() file: { filename: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('이미지 파일을 첨부해주세요.');
    }

    const publicPath = `${getNoticeImagePublicPrefix()}/${file.filename}`;
    const baseUrl = (process.env.SERVER_URL ?? '').replace(/\/+$/, '');

    return {
      status: 200,
      message: 'Notice image uploaded successfully',
      data: {
        url: baseUrl ? `${baseUrl}${publicPath}` : publicPath,
      },
    };
  }
}
