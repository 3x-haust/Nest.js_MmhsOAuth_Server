import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('api/v1/user')
export class UserController {
  constructor(private userService: UserService) {}
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUser(
    @Res() res: Response,
    @Req() req: Request & { user: { id: number } },
  ) {
    const user = req.user;
    const response = await this.userService.getUserById(user.id);
    return res.status(response.status).json(response);
  }
}
