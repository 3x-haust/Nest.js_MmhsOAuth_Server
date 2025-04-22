import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async getClients(@Res() res: Response, @Req() req: RequestWithUser) {
    const response = await this.clientService.getClients(req.user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getClientById(
    @Res() res: Response,
    @Req() req: RequestWithUser,
    @Body('id') id: string,
  ) {
    const response = await this.clientService.getClientById(id, req.user);
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateClient(
    @Res() res: Response,
    @Req() req: RequestWithUser,
    @Body('id') id: number,
    @Body() oauthClientDto: OAuthClientDto,
  ) {
    const response = await this.clientService.updateClient(
      id,
      oauthClientDto,
      req.user,
    );
    return res.status(response.status).json(response);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteClient(
    @Res() res: Response,
    @Req() req: RequestWithUser,
    @Body('id') id: string,
  ) {
    const response = await this.clientService.deleteClient(id, req.user);
    return res.status(response.status).json(response);
  }
}
