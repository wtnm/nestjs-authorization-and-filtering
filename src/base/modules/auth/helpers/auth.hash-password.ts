import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT } from '../../../common/constants';

export async function authHashPassword(password: string) {
  return await bcrypt.hash(password, BCRYPT_SALT);
}
