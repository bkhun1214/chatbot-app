'use client';

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // ==========================================
  // 💾 [기억 기능] 로컬 스토리지 연동
  // ==========================================
  useEffect(() => {
    const savedChat = localStorage.getItem('geminiChatMemory');
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (error) {
        console.error("대화 기록을 불러오는데 실패했습니다.", error);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('geminiChatMemory', JSON.stringify(messages));
    } else {
      localStorage.removeItem('geminiChatMemory');
    }
  }, [messages]);

  const clearMemory = () => {
    if (window.confirm("모든 대화 기록과 기억을 지우시겠습니까?")) {
      setMessages([]);
      localStorage.removeItem('geminiChatMemory');
      // 기억을 지울 때 읽어주던 음성도 같이 정지
      window.speechSynthesis.cancel();
    }
  };

  // ==========================================
  // 🔊 [음성 출력 기능 (TTS)] 텍스트 읽어주기
  // ==========================================
  const speakText = (text: string, e: React.MouseEvent) => {
    // 버튼 클릭 시 말풍선 터치 이벤트가 발생하지 않도록 방지
    e.stopPropagation();

    if (!('speechSynthesis' in window)) {
      alert("현재 브라우저에서는 음성 출력 기능을 지원하지 않습니다.");
      return;
    }

    window.speechSynthesis.cancel();

    // 마크다운 문법 제거하고 읽기
    const cleanText = text
      .replace(/[#*`~_\[\]]/g, '') 
      .replace(/<[^>]*>?/gm, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR'; 
    utterance.rate = 1.1;     
    utterance.pitch = 1.0;    

    // 음성 출력이 끝나면 활성화된 말풍선 상태 초기화
    utterance.onend = () => {
      setActiveMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // 모바일 터치/클릭 시 호출: 버튼 표시 상태 토글
  const handleMessageClick = (id: string) => {
    setActiveMessageId((prev) => (prev === id ? null : id));
  };

  // ==========================================
  // 🎙️ [음성 인식 기능 (STT)] 마이크 입력
  // ==========================================
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = false; 
      recognition.lang = 'ko-KR'; 

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("음성 인식 오류:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 이미지 첨부
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 메시지 전송
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    // 전송할 때 현재 읽고 있는 음성이 있다면 정지
    window.speechSynthesis.cancel();

    setActiveMessageId(null);

    const userMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: inputValue,
      image: selectedImage || undefined
    };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInputValue('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          image: currentImage 
        }),
      });

      if (!response.ok) throw new Error('API 서버 오류');
      if (!response.body) throw new Error('응답 스트림 없음');

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error(error);
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-[#121212] text-gray-200 shadow-2xl relative md:border-x md:border-gray-800">
      
      {/* 헤더 */}
      <header className="py-4 px-5 bg-[#121212] bg-opacity-90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center">
          <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center text-xl shadow-inner mr-3 border border-gray-700">🤖</div>
          <div>
            <h1 className="text-lg font-bold text-gray-100 leading-tight">Gemini Assistant</h1>
            <p className="text-xs text-gray-500">무엇이든 물어보세요!</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button 
            onClick={clearMemory}
            className="text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors flex items-center gap-1"
          >
            <span>🗑️</span> 새 대화
          </button>
        )}
      </header>

      {/* 채팅창 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <div className="text-5xl mb-4">🔊</div>
            <p className="text-sm bg-gray-800/50 px-5 py-2.5 rounded-full border border-gray-800 text-center leading-relaxed">
              안녕하세요! 무엇을 도와드릴까요?
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {m.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-lg shadow-inner flex-shrink-0 mt-0.5 border border-gray-700">🤖</div>
              )}

              {/* <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${
                m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-[#1e1e1e] text-gray-200 rounded-tl-sm border border-gray-700'
              }`}> */}

              <div 
                onClick={() => handleMessageClick(m.id)}
                className="group relative flex items-end gap-2 max-w-[85%] cursor-pointer"
              >
                {/* 🔊 미니 읽어주기 버튼 (사용자/챗봇 공통 적용)
                    - 평소: opacity-0 (숨김)
                    - 데스크톱 Hover 시: group-hover:opacity-100 (나타남)
                    - 모바일 Click 시: activeMessageId와 일치하면 opacity-100 (나타남)
                */}
                <button 
                  onClick={(e) => speakText(m.content, e)}
                  className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 shadow-xl z-10
                    ${m.role === 'user' ? 'order-1' : 'order-2'} 
                    ${activeMessageId === m.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}
                  `}
                  title="소리내어 읽기"
                >
                  🔊
                </button>

                {/* 실제 말풍선 내용 */}
                <div className={`p-4 rounded-2xl shadow-lg transition-all duration-200 ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm order-2' 
                    : 'bg-[#1e1e1e] text-gray-200 rounded-tl-sm border border-gray-700 order-1'
                } ${activeMessageId === m.id ? 'ring-2 ring-yellow-400/50' : ''}`}>

                {m.image && (
                  <img src={m.image} alt="uploaded" className="rounded-lg mb-3 max-w-full h-auto border border-white/20" />
                )}
                
                <div className="markdown-container text-[15px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    code({node, inline, className, children, ...props}: any) {
                      return !inline ? (
                        <pre className="bg-[#0d0d0d] p-3 rounded-lg text-sm overflow-x-auto my-2 font-mono border border-gray-800"><code {...props}>{children}</code></pre>
                      ) : (
                        <code className="bg-gray-700 text-pink-400 px-1.5 py-0.5 rounded font-mono" {...props}>{children}</code>
                      )
                    }
                  }}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 하단 입력바 */}
      <div className="bg-[#121212] px-4 py-4 border-t border-gray-800">
        
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="preview" className="w-20 h-20 object-cover rounded-lg border-2 border-blue-500 shadow-md" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-gray-800 border border-gray-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-500 hover:border-red-500 transition-colors"
            >✕</button>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 border border-gray-700 text-gray-400 transition-all flex-shrink-0"
            title="사진 첨부"
          >
            📎
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-full transition-all border flex-shrink-0 ${
              isListening
                ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
            }`}
            title={isListening ? "듣는 중..." : "음성 입력"}
          >
            🎙️
          </button>

          <input
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 p-3.5 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 shadow-inner"
            value={inputValue}
            placeholder={
              isListening ? "말씀해 주세요..." :
              selectedImage ? "사진에 대해 물어보세요..." : 
              "메시지를 입력하세요..."
            }
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading || isListening}
          />

          <button
            type="submit"
            disabled={isLoading || (!inputValue.trim() && !selectedImage)}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 transition-all font-bold shadow-md flex-shrink-0"
          >
            {isLoading ? <span className="w-2 h-2 bg-white rounded-full animate-ping"></span> : '➤'}
          </button>
        </form>
      </div>
    </div>
  );
}