import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { ExtendedUser } from 'src/oauth/oauth.controller';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';
import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { PermissionHistory } from './entities/permission-history.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthConsent)
    private readonly oauthConsentRepository: Repository<OAuthConsent>,
    @InjectRepository(OAuthClient)
    private readonly oauthClientRepository: Repository<OAuthClient>,
    @InjectRepository(PermissionHistory)
    private readonly permissionHistoryRepository: Repository<PermissionHistory>,
    private readonly redisService: RedisService,
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
      allowedFields['isAdmin'] = userData.isAdmin;

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

  async updateProfile(user: ExtendedUser, updateProfileDto: UpdateProfileDto) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }

    const userData = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!userData) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    const updates: Partial<User> = {};

    if (updateProfileDto.email && updateProfileDto.email !== userData.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        return this.responseStrategy.badRequest('이미 사용 중인 이메일입니다.');
      }

      updates.email = updateProfileDto.email;
    }

    if (
      updateProfileDto.nickname &&
      updateProfileDto.nickname !== userData.nickname
    ) {
      const existingUser = await this.userRepository.findOne({
        where: { nickname: updateProfileDto.nickname },
      });

      if (existingUser) {
        return this.responseStrategy.badRequest('이미 사용 중인 닉네임입니다.');
      }

      updates.nickname = updateProfileDto.nickname;
    }

    if (updateProfileDto.newPassword) {
      if (!updateProfileDto.currentPassword) {
        return this.responseStrategy.badRequest(
          '현재 비밀번호를 입력해주세요.',
        );
      }

      const isPasswordValid = await bcrypt.compare(
        updateProfileDto.currentPassword,
        userData.password,
      );

      if (!isPasswordValid) {
        return this.responseStrategy.badRequest(
          '현재 비밀번호가 일치하지 않습니다.',
        );
      }

      const salt = await bcrypt.genSalt();
      updates.password = await bcrypt.hash(updateProfileDto.newPassword, salt);
    }

    if (Object.keys(updates).length === 0) {
      return this.responseStrategy.badRequest('변경할 정보가 없습니다.');
    }

    await this.userRepository.update(user.id, updates);

    const updatedUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    return this.responseStrategy.success(
      '프로필이 성공적으로 업데이트되었습니다.',
      {
        id: updatedUser.id,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        updatedAt: updatedUser.updatedAt,
      },
    );
  }

  async getConnectedApplications(userId: number) {
    const userConsents = await this.oauthConsentRepository.find({
      where: {
        userId,
        revokedAt: null,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (userConsents.length === 0) {
      return this.responseStrategy.success(
        '연결된 애플리케이션이 없습니다.',
        [],
      );
    }

    const clientIds = userConsents.map((consent) => consent.clientId);

    const clients = await this.oauthClientRepository.find({
      where: {
        clientId: In(clientIds),
      },
    });

    const connectedApps = userConsents
      .map((consent) => {
        const client = clients.find((c) => c.clientId === consent.clientId);

        if (!client) return null;

        return {
          id: client.id,
          clientId: client.clientId,
          serviceName: client.serviceName,
          serviceDomain: client.serviceDomain,
          scope: consent.scope,
          grantedAt: consent.grantedAt,
          revokedAt: consent.revokedAt,
        };
      })
      .filter((app) => app !== null);

    return this.responseStrategy.success(
      '연결된 애플리케이션 목록을 성공적으로 가져왔습니다.',
      connectedApps,
    );
  }

  async revokeApplication(userId: number, clientId: string) {
    const consent = await this.oauthConsentRepository.findOne({
      where: {
        userId,
        clientId,
        revokedAt: null,
      },
    });

    const client = await this.oauthClientRepository.findOne({
      where: { clientId },
    });

    if (!consent) {
      return this.responseStrategy.notFound(
        '해당 애플리케이션 연결을 찾을 수 없습니다.',
      );
    }

    consent.revokedAt = new Date();
    await this.oauthConsentRepository.save(consent);

    const historyEntry = this.permissionHistoryRepository.create({
      userId,
      clientId,
      applicationName: client.serviceName,
      applicationDomain: client.serviceDomain,
      permissionScopes: consent.scope,
      timestamp: new Date(),
      status: 'revoked',
    });

    await this.permissionHistoryRepository.save(historyEntry);

    return this.responseStrategy.success(
      '애플리케이션 연결이 성공적으로 해제되었습니다.',
      { clientId },
    );
  }

  async getPermissionsHistory(userId: number) {
    const permissionsHistory = await this.permissionHistoryRepository.find({
      where: { userId },
      order: {
        timestamp: 'DESC',
      },
    });

    if (permissionsHistory.length === 0) {
      return this.responseStrategy.success('권한 내역이 없습니다.', []);
    }

    return this.responseStrategy.success(
      '권한 내역을 성공적으로 가져왔습니다.',
      permissionsHistory,
    );
  }
}
