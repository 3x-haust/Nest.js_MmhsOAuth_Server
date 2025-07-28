import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthClient } from './entities/oauth-client.entity';
import { v4 as uuidv4 } from 'uuid';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { OAuthClientDto } from './dto/oauth-client.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class OAuthClientService {
  constructor(
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    private responseStrategy: ResponseStrategy,
  ) {}

  async createClient(data: OAuthClientDto, user: User) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }
    const client = this.clientRepository.create({
      clientId: uuidv4(),
      clientSecret: `${uuidv4()}-${uuidv4()}`,
      userId: user.id,
      ...data,
    });

    try {
      const oauthClient = await this.clientRepository.save(client);
      return this.responseStrategy.create(
        '클라이언트 생성에 성공했습니다',
        oauthClient,
      );
    } catch {
      return this.responseStrategy.badRequest('클라이언트 생성에 실패했습니다');
    }
  }

  async getClients(user: User) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }
    const clients = await this.clientRepository.find({
      where: { userId: user.id },
    });
    return this.responseStrategy.success(
      '클라이언트 조회에 성공했습니다',
      clients,
    );
  }

  async getClientById(id: number) {
    const client = await this.clientRepository.findOne({
      where: { id: id },
    });
    if (!client) {
      return this.responseStrategy.notFound('클라이언트를 찾을 수 없습니다');
    }
    return this.responseStrategy.success(
      '클라이언트 조회에 성공했습니다',
      client,
    );
  }

  async getClientByClientId(clientId: string) {
    const client = await this.clientRepository.findOne({
      where: { clientId: clientId },
    });
    if (!client) {
      return this.responseStrategy.notFound('클라이언트를 찾을 수 없습니다');
    }
    return this.responseStrategy.success(
      '클라이언트 조회에 성공했습니다',
      client,
    );
  }

  async updateClient(id: number, data: OAuthClientDto, user: User) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }
    const client = await this.clientRepository.findOne({
      where: { id: id },
    });
    if (!client) {
      return this.responseStrategy.notFound('클라이언트를 찾을 수 없습니다');
    }
    Object.assign(client, data);
    try {
      const updatedClient = await this.clientRepository.save(client);
      return this.responseStrategy.success(
        '클라이언트 수정에 성공했습니다',
        updatedClient,
      );
    } catch {
      return this.responseStrategy.badRequest('클라이언트 수정에 실패했습니다');
    }
  }

  async deleteClient(id: number, user: User) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }
    const client = await this.clientRepository.findOne({
      where: { id: id },
    });
    if (!client) {
      return this.responseStrategy.notFound('클라이언트를 찾을 수 없습니다');
    }
    try {
      await this.clientRepository.delete(client.id);
      return this.responseStrategy.success(
        '클라이언트 삭제에 성공했습니다',
        client,
      );
    } catch {
      return this.responseStrategy.badRequest('클라이언트 삭제에 실패했습니다');
    }
  }
}
