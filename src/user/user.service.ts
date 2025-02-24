import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private responseStrategy: ResponseStrategy,
  ) {}

  async getUserById(user: User) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }
    const userData = await this.userRepository.findOne({
      where: { id: user.id },
    });
    if (!userData) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    return this.responseStrategy.success(
      '사용자 정보를 성공적으로 가져왔습니다.',
      userData,
    );
  }
}
