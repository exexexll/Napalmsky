import { Container } from '@/components/Container';
import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';

export const metadata = {
  title: 'Community Guidelines - Napalm Sky',
  description: 'Community Guidelines for Napalm Sky speed-dating platform',
};

async function getGuidelinesContent() {
  const filePath = path.join(process.cwd(), 'COMMUNITY-GUIDELINES.md');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  
  const processedContent = await remark()
    .use(html)
    .process(fileContents);
  
  return processedContent.toString();
}

export default async function CommunityGuidelinesPage() {
  const content = await getGuidelinesContent();

  return (
    <main className="min-h-screen bg-[#0a0a0c] py-20">
      <Container>
        <article 
          className="prose prose-invert prose-sm sm:prose-base max-w-4xl mx-auto
                     prose-headings:text-[#eaeaf0] prose-p:text-[#eaeaf0]/80
                     prose-a:text-[#ff9b6b] prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-[#eaeaf0] prose-ul:text-[#eaeaf0]/80
                     prose-ol:text-[#eaeaf0]/80 prose-li:text-[#eaeaf0]/80"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </Container>
    </main>
  );
}

