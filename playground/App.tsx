import { ChatConfig, ChatProvider, FloatingChat, playNotificationSound } from '@/index';
import React, { useMemo, useState } from 'react';
import ConversationsPage from './panel';
import { Volume2, Bell, Zap } from 'lucide-react';

const App = () => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const config: ChatConfig = useMemo(() => ({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://172.16.30.114',
    authToken: import.meta.env.VITE_AUTH_TOKEN || '',
    apiHelpdeskBaseUrl: import.meta.env.VITE_API_HELPDESK_BASE_URL ,
    applicationId: Number(import.meta.env.VITE_APPLICATION_ID) || 10,
    reverb: {
      key: import.meta.env.VITE_REVERB_KEY || '',
      host: import.meta.env.VITE_REVERB_HOST || '',
      port: Number(import.meta.env.VITE_REVERB_PORT) || 443,
      wsPath: import.meta.env.VITE_REVERB_WS_PATH || '/messenger-ws',
      scheme: (import.meta.env.VITE_REVERB_SCHEME as 'http' | 'https') || 'https'
    }
  }), []);

  const handleTestBurst = () => {
    const p1 = playNotificationSound('focused');
    setTimeout(() => {
      const p2 = playNotificationSound('focused');
      showFeedback(p2 ? 'Error: 2do sonido no bloqueado' : 'Rate-limit OK: 2do sonido bloqueado');
    }, 200);
    if (p1) showFeedback('1er sonido reproducido (ráfaga)');
  };

  return (
    <ChatProvider config={config}>
      <div className='sdi-messenger-root relative w-full h-screen bg-slate-900 text-neutral-100 flex flex-col overflow-hidden p-3 pt-14'>
        {/* Toolbar de prueba de sonidos */}
        <div className='fixed top-3 right-3 z-50 flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md p-2 shadow-2xl border border-slate-700/60 text-white'>
          <span className='text-[11px] font-semibold text-slate-300 px-2 flex items-center gap-1.5'>
            <Volume2 className='size-3.5 text-blue-400' />
            Audio Test:
          </span>

          <button
            type='button'
            onClick={() => {
              const played = playNotificationSound('focused', { force: true });
              showFeedback(played ? 'Sonido Enfocado' : 'Bloqueado');
            }}
            className='flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors cursor-pointer active:scale-95'
            title='Probar sonido suave de conversación enfocada'
          >
            <Volume2 className='size-3.5' />
            Enfocada
          </button>

          <button
            type='button'
            onClick={() => {
              const played = playNotificationSound('unfocused', { force: true });
              showFeedback(played ? 'Sonido No Enfocado' : 'Bloqueado');
            }}
            className='flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors cursor-pointer active:scale-95'
            title='Probar sonido de alerta para conversación no enfocada'
          >
            <Bell className='size-3.5' />
            No Enfocada
          </button>

          <button
            type='button'
            onClick={handleTestBurst}
            className='flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors cursor-pointer active:scale-95'
            title='Enviar 2 sonidos en 200ms para validar que el 2do se bloquea'
          >
            <Zap className='size-3.5' />
            Test Ráfaga (1s limit)
          </button>

          {/* {feedback && (
            <span className='ml-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-1 rounded-md animate-pulse'>
              {feedback}
            </span>
          )} */}
        </div>

        <ConversationsPage />
        <FloatingChat />
      </div>
    </ChatProvider>
  );
};

export default App;
