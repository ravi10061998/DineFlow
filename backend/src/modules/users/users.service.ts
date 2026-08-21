import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserStatus } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string, withPassword = false): Promise<User | null> {
    // Role is marked `eager` on the User entity, but eager loading does NOT
    // cascade into Role's own `permissions` relation — it must be joined
    // explicitly here, or every access token would carry an empty permission list.
    const qb = this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("role.permissions", "permissions")
      .where("user.email = :email", { email });
    if (withPassword) {
      qb.addSelect("user.passwordHash");
    }
    return qb.getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.usersRepository.update(id, { emailVerifiedAt: new Date() });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    await this.findById(id); // 404s if missing
    await this.usersRepository.update(id, { status });
    return this.findById(id);
  }

  async updateRole(id: string, roleId: string): Promise<User> {
    await this.findById(id); // 404s if missing
    await this.usersRepository.update(id, { roleId });
    return this.findById(id);
  }

  async list(): Promise<User[]> {
    return this.usersRepository.find({ relations: { role: true }, order: { createdAt: "DESC" } });
  }

  async countByRoleId(roleId: string): Promise<number> {
    return this.usersRepository.count({ where: { roleId } });
  }
}
