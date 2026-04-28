import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, image } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 진단 목록에서 확인된 최신 호환 모델을 명시합니다.
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // 1. 메시지 규격 엄격 정제 (프론트엔드의 assistant를 Google의 model로 치환)
    const contents = messages
      .filter((m: any) => m.content && m.content.trim() !== '')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // 만약 이미지가 있다면, 마지막 사용자 메시지에 이미지 데이터를 결합합니다.
    if (image) {
      // image 데이터는 "data:image/png;base64,..." 형태이므로 쉼표 기준으로 분리합니다.
      const [mimeInfo, base64Data] = image.split(',');
      const mimeType = mimeInfo.split(':')[1].split(';')[0];

      // 마지막 메시지의 parts 배열에 이미지 추가
      const lastMessage = contents[contents.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // 2. Google SDK를 이용한 스트리밍 호출
    const result = await model.generateContentStream({ contents });

    // 3. ReadableStream 생성 및 프론트엔드로 파이핑
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error("Streaming Error:", err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('API Route Detail Error:', error);
    return new Response(JSON.stringify({ error: '서버 내부 오류가 발생했습니다.', detail: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}