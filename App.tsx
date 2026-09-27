import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import { CinematicBoot } from './components/CinematicBoot';
import { AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [bootStatus, setBootStatus] = useState<'booting' | 'landing' | 'chat'>('booting');

  return (
    <>
      <AnimatePresence mode="wait">
        {bootStatus === 'booting' && (
          <CinematicBoot key="boot" onComplete={() => setBootStatus('landing')} />
        )}
        {bootStatus === 'landing' && (
          <LandingPage key="landing" onStart={() => setBootStatus('chat')} />
        )}
        {bootStatus === 'chat' && (
          <ChatInterface key="chat" onLogout={() => setBootStatus('landing')} />
        )}
      </AnimatePresence>
    </>
  );
};

export default App;
