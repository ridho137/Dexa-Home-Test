import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(user: {
    id: string;
    email: string;
    passwordHash: string;
    role: User['role'];
  }): Promise<User>;
  abstract updatePassword(id: string, passwordHash: string): Promise<void>;
}
