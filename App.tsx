
import React, { useState } from 'react';
import { Tab } from './types';
import Header from './components/Header';
import ImageGenerator from './components/ImageGenerator';
import VideoCreator from './components/VideoCreator';
import Chatbot from './components/Chatbot';
import ImageEditor from './components/ImageEditor';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Image);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Image:
        return <ImageGenerator />;
      case Tab.Video:
        return <VideoCreator />;
      case Tab.Chat:
        return <Chatbot />;
      case Tab.ImageEditor:
        return <ImageEditor />;
      default:
        return <ImageGenerator />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="mt-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
