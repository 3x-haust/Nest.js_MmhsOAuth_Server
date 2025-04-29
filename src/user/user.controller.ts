import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RequestWithUser } from 'src/oauth/oauth.controller';
import { ScopesGuard } from 'src/auth/guard/scopes.guard';
import { RequireScopes } from 'src/auth/decorators/scopes.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
}
