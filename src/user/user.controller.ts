import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RequestWithUser } from 'src/oauth/oauth.controller';

@Controller('api/v1/user')
export class UserController {
  constructor(private userService: UserService) {}
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUser(@Res() res: Response, @Req() req: RequestWithUser) {
    const user = req.user;
    const response = await this.userService.getUserById(user);
    return res.status(response.status).json(response);
  }
}
