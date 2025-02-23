import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthClient } from './entities/oauth-client.entity';
import { v4 as uuidv4 } from 'uuid';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { OAuthClientDto } from './dto/oauth-client.dto';

@Injectable()
export class OAuthClientService {
  constructor(
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    private responseStrategy: ResponseStrategy,
  ) {}

  async createClient(data: OAuthClientDto) {
    const client = this.clientRepository.create({
      clientId: uuidv4(),
      clientSecret: `${uuidv4()}-${uuidv4()}`,
      ...data,
    });

    try {
      const oauthClient = await this.clientRepository.save(client);
      return this.responseStrategy.success(
        '클라이언트 생성에 성공했습니다',
        oauthClient,
      );
    } catch {
      return this.responseStrategy.badRequest('클라이언트 생성에 실패했습니다');
    }
  }
}
