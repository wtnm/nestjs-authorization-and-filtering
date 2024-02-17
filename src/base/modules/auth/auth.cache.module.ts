import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  async get(key: string) {
    return await this.cacheManager.get(key);
  }

  async set(key: string, value: any) {
    return await this.cacheManager.set(key, value);
  }

  async invalidateAllCache() {
    return await this.cacheManager.reset();
  }

  async invalidateOneCachedValue(key: string) {
    return await this.cacheManager.del(key);
  }
}

@Module({
  imports: [CacheModule.register()],
  controllers: [],
  providers: [AuthCacheService],
  exports: [AuthCacheService],
})
export class AuthCacheModule {}
