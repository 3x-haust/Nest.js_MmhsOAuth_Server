import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { ExtendedUser } from 'src/oauth/oauth.controller';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private responseStrategy: ResponseStrategy,
  ) {}

  async getUserById(user: ExtendedUser) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }

    const userData = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!userData) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    if (user.scopes) {
      const allowedFields = {};

      if (user.scopes.includes('email')) {
        allowedFields['email'] = userData.email;
      }

      if (user.scopes.includes('nickname')) {
        allowedFields['nickname'] = userData.nickname;
      }

      if (user.scopes.includes('role')) {
        allowedFields['role'] = userData.role;
      }

      if (user.scopes.includes('major')) {
        allowedFields['major'] = userData.major;
      }

      if (user.scopes.includes('admission')) {
        allowedFields['admission'] = userData.admission;
      }

      if (user.scopes.includes('generation')) {
        allowedFields['generation'] = userData.generation;
      }

      if (user.scopes.includes('isGraduated')) {
        allowedFields['isGraduated'] = userData.isGraduated;
      }

      allowedFields['id'] = userData.id;

      return this.responseStrategy.success(
        '사용자 정보를 성공적으로 가져왔습니다.',
        allowedFields,
      );
    }

    return this.responseStrategy.success(
      '사용자 정보를 성공적으로 가져왔습니다.',
      userData,
    );
  }

  async getUserEmail(user: ExtendedUser) {
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
      '사용자 이메일을 성공적으로 가져왔습니다.',
      { id: userData.id, email: userData.email },
    );
  }

  async getUserNickname(user: ExtendedUser) {
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
      '사용자 닉네임을 성공적으로 가져왔습니다.',
      { id: userData.id, nickname: userData.nickname },
    );
  }

  async getUserRole(user: ExtendedUser) {
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
      '사용자 역할을 성공적으로 가져왔습니다.',
      { id: userData.id, role: userData.role },
    );
  }

  async getUserMajor(user: ExtendedUser) {
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
      '사용자 전공을 성공적으로 가져왔습니다.',
      { id: userData.id, major: userData.major },
    );
  }

  async getUserAdmission(user: ExtendedUser) {
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
      '사용자 입학년도를 성공적으로 가져왔습니다.',
      { id: userData.id, admission: userData.admission },
    );
  }

  async getUserGeneration(user: ExtendedUser) {
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
      '사용자 기수를 성공적으로 가져왔습니다.',
      { id: userData.id, generation: userData.generation },
    );
  }

  async getUserGraduationStatus(user: ExtendedUser) {
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
      '사용자 졸업 상태를 성공적으로 가져왔습니다.',
      { id: userData.id, isGraduated: userData.isGraduated },
    );
  }
}
