import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { OAuthClientService } from './oauth-client.service';
import { OAuthClientDto } from './dto/oauth-client.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RequestWithUser } from 'src/oauth/oauth.controller';

@Controller('api/v1/oauth-client')
export class OAuthClientController {
  constructor(private readonly clientService: OAuthClientService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createClient(
    @Res() res: Response,
    @Req() req: RequestWithUser,
    @Body() oauthClientDto: OAuthClientDto,
  ) {
    const response = await this.clientService.createClient(
      oauthClientDto,
      req.user,
    );
    return res.status(response.status).json(response);
  }
}
