import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RequestWithUser } from 'src/oauth/oauth.controller';
import { ScopesGuard } from 'src/auth/guard/scopes.guard';
import { RequireScopes } from 'src/auth/decorators/scopes.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  getAvatarDirectory,
  getAvatarPublicPrefix,
} from 'src/config/upload.config';

const avatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getAvatarExtension = (mimeType: string, originalName: string): string => {
  if (mimeType === 'image/webp') {
    return '.webp';
  }
  if (mimeType === 'image/png') {
    return '.png';
  }
  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  const extension = extname(originalName).toLowerCase();
  return extension || '.img';
};

const avatarStorage = diskStorage({
  destination: (_req, _file, callback) => {
    const avatarUploadDirectory = getAvatarDirectory();
    mkdirSync(avatarUploadDirectory, { recursive: true });
    callback(null, avatarUploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = getAvatarExtension(file.mimetype, file.originalname);
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const avatarFileFilter = (
  _req: Request,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!avatarMimeTypes.has(file.mimetype)) {
    callback(
      new BadRequestException(
        '지원하지 않는 파일 형식입니다. JPG, PNG, WEBP만 업로드할 수 있습니다.',
      ),
      false,
    );
    return;
  }

  callback(null, true);
};

@Controller('api/v1/user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('email', 'nickname')
  @Get()
  async getUser(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserById(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('email')
  @Get('email')
  async getUserEmail(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserEmail(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('nickname')
  @Get('nickname')
  async getUserNickname(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserNickname(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('role')
  @Get('role')
  async getUserRole(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserRole(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('major')
  @Get('major')
  async getUserMajor(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserMajor(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('admission')
  @Get('admission')
  async getUserAdmission(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserAdmission(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('generation')
  @Get('generation')
  async getUserGeneration(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserGeneration(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard, ScopesGuard)
  @RequireScopes('isGraduated')
  @Get('is-graduated')
  async getUserGraduationStatus(
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    const response = await this.userService.getUserGraduationStatus(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    const response = await this.userService.updateProfile(
      user,
      updateProfileDto,
    );
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: avatarStorage,
      fileFilter: avatarFileFilter,
      limits: { fileSize: 350 * 1024 },
    }),
  )
  async uploadProfileImage(
    @UploadedFile() file: { filename: string; path: string } | undefined,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      return res
        .status(400)
        .json({ status: 400, message: '프로필 이미지를 업로드해주세요.' });
    }

    const user = req.user;
    const profileImageUrl = `${getAvatarPublicPrefix()}/${file.filename}`;
    const response = await this.userService.updateProfileImage(
      user,
      profileImageUrl,
    );

    if (response.status >= 400) {
      await unlink(file.path).catch(() => undefined);
    }

    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile-image')
  async deleteProfileImage(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.deleteProfileImage(user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUsers(
    @Query('query') query: string,
    @Query('q') q: string,
    @Query('nickname') nickname: string,
    @Query('email') email: string,
    @Res() res: Response,
  ) {
    const keyword = (query ?? q ?? nickname ?? email ?? '').trim();
    const response = await this.userService.searchUsers(keyword);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications')
  async getConnectedApplications(
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    const response = await this.userService.getConnectedApplications(user.id);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('applications/:clientId')
  async revokeApplication(
    @Param('clientId') clientId: string,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    const response = await this.userService.revokeApplication(
      user.id,
      clientId,
    );
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('permissions-history')
  async getPermissionsHistory(
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    const response = await this.userService.getPermissionsHistory(user.id);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/:clientId/status')
  async checkApplicationStatus(
    @Param('clientId') clientId: string,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    const response = await this.userService.checkApplicationStatus(
      user.id,
      clientId,
    );
    return res.status(response.status).json(response);
  }
}
