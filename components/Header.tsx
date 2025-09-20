
import React from 'react';
import { Tab } from '../types';
import { Icon } from './Icon';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const NavButton: React.FC<{
  label: string;
  icon: 'image' | 'video' | 'chat' | 'edit-image';
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`}
  >
    <Icon name={icon} className="w-5 h-5" />
    {label}
  </button>
);

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="w-full">
      <div className="text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          Nexus AI v2.0
        </h1>
        <p className="text-slate-400 mt-2">Your Integrated AI Creation Suite</p>
      </div>
      <nav className="flex justify-center bg-slate-800/50 p-2 rounded-xl backdrop-blur-sm border border-slate-700">
        <div className="flex flex-wrap justify-center gap-2">
          <NavButton
            label="Image Generator"
            icon="image"
            isActive={activeTab === Tab.Image}
            onClick={() => setActiveTab(Tab.Image)}
          />
          <NavButton
            label="Video Creator"
            icon="video"
            isActive={activeTab === Tab.Video}
            onClick={() => setActiveTab(Tab.Video)}
          />
          <NavButton
            label="AI Chatbot"
            icon="chat"
            isActive={activeTab === Tab.Chat}
            onClick={() => setActiveTab(Tab.Chat)}
          />
          <NavButton
            label="Image Editor"
            icon="edit-image"
            isActive={activeTab === Tab.ImageEditor}
            onClick={() => setActiveTab(Tab.ImageEditor)}
          />
        </div>
      </nav>
    </header>
  );
};

export default Header;
