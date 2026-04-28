# 🤖 Gemini Assistant

Next.js와 Google Gemini API를 활용하여 구축한 **멀티모달(Multimodal) AI 챗봇**입니다. 
텍스트 대화를 넘어 **사진 분석(Vision), 음성 인식(STT), 음성 출력(TTS)** 기능을 통합하여 실제 AI 비서와 대화하는 듯한 직관적이고 풍부한 사용자 경험을 제공합니다.

🔗 **[Live Demo 해보기] (https://chatbot-app-phi-liard.vercel.app/)**

## ✨ 주요 기능 (Key Features)

* **🎙️ 음성 인식 및 출력 (Voice Interaction)**
  * 브라우저 내장 `Web Speech API`를 활용하여 마이크로 질문하고(`STT`), 챗봇의 답변을 자연스러운 음성으로 읽어줍니다(`TTS`).
* **📸 멀티모달 비전 (Vision)**
  * 이미지를 업로드하면 AI가 사진을 분석하고 관련된 질문에 답변합니다.
* **🧠 대화 기억 (Local Memory)**
  * 브라우저의 `Local Storage`를 활용하여 새로고침을 하거나 창을 닫아도 이전 대화 문맥을 기억하고 이어갑니다.
* **🌙 모던 다크 모드 UI**
  * Tailwind CSS를 적용하여 개발자와 사용자 모두의 눈이 편안한 세련된 다크 모드 테마를 구현했습니다. 반응형(Responsive) 웹으로 모바일과 데스크톱 모두 완벽하게 지원합니다.
* **📝 완벽한 마크다운 렌더링**
  * `react-markdown`을 통해 코드 블록(Syntax Highlighting), 표(Table), 리스트 등 AI의 마크다운 답변을 깔끔하게 화면에 렌더링합니다.

## 🛠️ 기술 스펙 (Tech Stack)

* **Framework:** Next.js 16 (App Router), React 19
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **AI Model:** Google Gemini 2.5 Flash Lite (`@google/generative-ai` 공식 SDK)
* **Markdown:** `react-markdown`, `remark-gfm`
* **Deployment:** Vercel

## 🚀 로컬 실행 방법 (Getting Started)

이 프로젝트를 로컬 환경에서 실행하려면 아래의 단계를 따라주세요.

1. **저장소 클론 (Clone the repository)**
   ```bash
   git clone https://github.com/chatbot-app/chatbot-app.git
   cd chatbot-app
   ```

2. **패키지 설치 (Install dependencies)**
   ```bash
   npm install
   ```
   
3. **환경 변수 설정 (Environment Variables)**
   
   프로젝트 루트 디렉토리에 .env.local 파일을 생성하고 발급받은 Google Gemini API 키를 입력합니다.
   ```코드 스니펫
   GOOGLE_GENERATIVE_AI_API_KEY=당신의_API_키를_여기에_입력하세요
   ```
   
4. **개발 서버 실행 (Run the development server)**
   ```bash
   npm run dev
   ```
   브라우저에서 http://localhost:3000 에 접속하여 확인합니다.
