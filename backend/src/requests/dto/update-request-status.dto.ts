import { IsIn, IsString } from 'class-validator';
import { REQUEST_STATUSES } from '../../common/constants/statuses';

export class UpdateRequestStatusDto {
  @IsIn(REQUEST_STATUSES)
  status!: (typeof REQUEST_STATUSES)[number];

  @IsString()
  requestId!: string;
}
