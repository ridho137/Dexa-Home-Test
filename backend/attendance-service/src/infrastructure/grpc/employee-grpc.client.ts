import { Inject, Injectable } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../logger/app-logger.service';

interface GetEmployeeRequest {
  id: string;
}

interface GetEmployeeResponse {
  found: boolean;
  isActive: boolean;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface EmployeeGrpcService {
  GetEmployee(data: GetEmployeeRequest): any;
}

@Injectable()
export class EmployeeGrpcClient {
  private service: EmployeeGrpcService;

  constructor(
    @Inject('EMPLOYEE_GRPC_CLIENT') private readonly client: ClientGrpc,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit() {
    this.service = this.client.getService<EmployeeGrpcService>('EmployeeGrpc');
  }

  getEmployee(id: string): Promise<GetEmployeeResponse> {
    this.logger.debug('EmployeeGrpcClient: GetEmployee called', { id });
    return firstValueFrom(this.service.GetEmployee({ id }));
  }
}
