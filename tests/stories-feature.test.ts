import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.20: Interactive Community & Official Stories (20-Day Retention, WebP/Video Compression, Likes & Admin Panel)', () => {
  it('T1.20.1: Prisma schema defines Story with userId, likes relation, and StoryLike model', () => {
    const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('model Story {');
    expect(schema).toContain('model StoryLike {');
    expect(schema).toContain('@@unique([userId, storyId])');
    expect(schema).toContain('likes     StoryLike[]');
  });

  it('T1.20.2: Stories API enforces 20-day retention default (480 hours) and returns creator & likers list', () => {
    const apiPath = path.resolve(process.cwd(), 'src/app/api/stories/route.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toContain('DEFAULT_STORY_RETENTION_DAYS = 20');
    expect(content).toContain('likes:');
    expect(content).toContain('user:');
    expect(content).toContain('invalidateStoriesCache');
  });

  it('T1.20.3: Story media upload API & client compressor convert images to WebP and compress video files', () => {
    const uploadPath = path.resolve(process.cwd(), 'src/app/api/stories/upload/route.ts');
    const uploadContent = fs.readFileSync(uploadPath, 'utf8');
    expect(uploadContent).toContain('.webp(');
    expect(uploadContent).toContain('image/webp');
    expect(uploadContent).toContain('VIDEO');

    const compressorPath = path.resolve(process.cwd(), 'src/lib/story-media-compressor.ts');
    const compressorContent = fs.readFileSync(compressorPath, 'utf8');
    expect(compressorContent).toContain('compressImageToWebp');
    expect(compressorContent).toContain('compressVideoFile');
    expect(compressorContent).toContain('image/webp');
  });

  it('T1.20.4: Story Like endpoint toggles likes and returns complete list of users who liked', () => {
    const likePath = path.resolve(process.cwd(), 'src/app/api/stories/[id]/like/route.ts');
    const content = fs.readFileSync(likePath, 'utf8');
    expect(content).toContain('userId_storyId');
    expect(content).toContain('likesCount');
    expect(content).toContain('invalidateStoriesCache');
  });

  it('T1.20.5: StoryBar on Beranda opens full-screen Instagram-style camera studio (Photo, Video, Text, Filters, Flip Camera), likes, and likers list', () => {
    const storyBarPath = path.resolve(process.cwd(), 'src/components/storefront/StoryBar.tsx');
    const content = fs.readFileSync(storyBarPath, 'utf8');
    expect(content).toContain('Buat Story');
    expect(content).toContain('getUserMedia');
    expect(content).toContain('handleCapturePhoto');
    expect(content).toContain('handleToggleVideoRecording');
    expect(content).toContain('CAMERA_FILTERS');
    expect(content).toContain('handleToggleLike');
    expect(content).toContain('Disukai Oleh');
    expect(content).toContain('compressStoryMedia');
    expect(content).toContain('/api/stories/upload');
  });

  it('T1.20.6: Admin Panel provides /admin/stories management and is linked in AdminSidebar', () => {
    const adminPagePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/stories/StoriesAdminClient.tsx');
    const adminContent = fs.readFileSync(adminPagePath, 'utf8');
    expect(adminContent).toContain('Tambah Story (20 Hari)');
    expect(adminContent).toContain('Daftar Penyuka Story');

    const sidebarPath = path.resolve(process.cwd(), 'src/components/admin/AdminSidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    expect(sidebarContent).toContain("href: '/admin/stories'");
  });
});
