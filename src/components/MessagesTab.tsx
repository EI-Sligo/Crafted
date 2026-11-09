import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  ArrowLeft,
  ShoppingBag,
  Briefcase,
  UserPlus,
  Search,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Conversation, ChatMessage, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { supabaseService } from '../services/supabaseService';
import { useTheme } from '../context/ThemeContext';

interface MessagesTabProps {
  currentUser: UserProfile;
  initialConversationId?: string | null;
  onSelectConversation?: (id: string | null) => void;
}

const renderAvatarOrInitials = (avatarUrl?: string | null, name?: string, sizeClass = 'w-9 h-9 text-xs') => {
  if (avatarUrl && avatarUrl.trim()) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-300 dark:border-slate-700`}
      />
    );
  }
  const initials = (name || 'Trade User')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-sm`}
    >
      {initials}
    </div>
  );
};

export const MessagesTab: React.FC<MessagesTabProps> = ({
  currentUser,
  initialConversationId,
  onSelectConversation,
}) => {
  const { isDark } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>(storageService.getConversations());
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversationId || null
  );
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [candidatePeople, setCandidatePeople] = useState<UserProfile[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const fetchPeopleForChat = async (query = '') => {
    setIsLoadingCandidates(true);
    try {
      const results = await supabaseService.searchProfiles(query);
      setCandidatePeople(results.filter((p) => p.id !== currentUser.id));
    } catch {
      setCandidatePeople(storageService.getUsers().filter((p) => p.id !== currentUser.id));
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleStartChatWithCandidate = (person: UserProfile) => {
    const convId = storageService.startOrOpenConversationWithUser(person);
    refreshConvList();
    setSelectedConvId(convId);
    if (onSelectConversation) {
      onSelectConversation(convId);
    }
    setShowNewChatModal(false);
  };

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (selectedConvId) {
      setMessages(storageService.getMessages(selectedConvId));
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedConvId]);

  const refreshConvList = () => {
    setConversations(storageService.getConversations());
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Identify the other participant in this thread
  const otherUserId = selectedConv?.participantIds.find((id) => id !== currentUser.id) || 'usr_2';
  const otherUserName = selectedConv?.participantNames[otherUserId] || 'Trade Professional';
  const otherUserAvatar = selectedConv?.participantAvatars[otherUserId] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
  const otherUserTrade = selectedConv?.participantTrades[otherUserId] || 'Trade Pro';

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConvId) return;

    storageService.sendMessage(selectedConvId, currentUser.id, text);
    setInputText('');
    setMessages(storageService.getMessages(selectedConvId));
    refreshConvList();

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // Simulated automated replies only in Demo mode
    if (storageService.getAppMode() === 'demo') {
      setTimeout(() => {
        const peerReplies = [
          'Sound Cian! That suits me grand. Give me a ring when you are on the way.',
          'Perfect, all calibrated and ready to inspect. Let me know what time works best.',
          'Grand job. Send on your Safe Pass number and I will get you inducted on site for Monday.',
          'Thanks for reaching out! Yes, still available and in top nick.',
        ];
        const randomReply = peerReplies[Math.floor(Math.random() * peerReplies.length)];
        storageService.sendMessage(selectedConvId, otherUserId, randomReply);
        setMessages(storageService.getMessages(selectedConvId));
        refreshConvList();
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }, 1200);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 pt-2 pb-24 space-y-4 flex flex-col">
      {/* Top Banner */}
      <div className={`rounded-3xl p-5 sm:p-6 border relative overflow-hidden shadow-xl shrink-0 ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-slate-800' : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-900 text-white border-slate-800'
      }`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block">
          <MessageSquare className="w-40 h-40 text-amber-500" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Trade Messaging</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Messages & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Chat securely with employers, tool sellers, and site apprentices across Ireland.
          </p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl flex-1 flex overflow-hidden shadow-sm min-h-0`}>
        {/* Left Pane: Conversation List */}
        <div
          className={`w-full sm:w-80 border-r ${isDark ? 'border-slate-800' : 'border-slate-200'} flex flex-col ${
            selectedConvId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className={`p-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm flex items-center space-x-1.5`}>
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>Direct Messages</span>
            </h3>
            <button
              onClick={() => {
                setShowNewChatModal(true);
                fetchPeopleForChat();
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1 transition shadow cursor-pointer"
              title="Start a new chat with any tradesperson"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs space-y-3">
                <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  No active conversations yet.
                </p>
                <button
                  onClick={() => {
                    setShowNewChatModal(true);
                    fetchPeopleForChat();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center space-x-1.5 shadow cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Start New Conversation</span>
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const partnerId = conv.participantIds.find((id) => id !== currentUser.id) || 'usr_2';
                const partnerName = conv.participantNames[partnerId] || 'User';
                const partnerAvatar = conv.participantAvatars[partnerId];
                const isSelected = conv.id === selectedConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      if (onSelectConversation) onSelectConversation(conv.id);
                    }}
                    className={`w-full text-left p-3.5 transition flex items-start space-x-3 cursor-pointer ${
                      isSelected
                        ? isDark ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'bg-amber-50/80 border-l-2 border-amber-500'
                        : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {renderAvatarOrInitials(partnerAvatar, partnerName, 'w-10 h-10 text-xs')}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-xs truncate`}>{partnerName}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{conv.lastMessageTime}</span>
                      </div>

                      {conv.contextTag && (
                        <div className="flex items-center space-x-1 text-[10px] text-amber-500 truncate mt-0.5 font-medium">
                          {conv.contextType === 'marketplace' ? (
                            <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                          ) : (
                            <Briefcase className="w-2.5 h-2.5 shrink-0" />
                          )}
                          <span className="truncate">{conv.contextTag}</span>
                        </div>
                      )}

                      <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} truncate mt-1`}>{conv.lastMessage}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Window */}
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 ${isDark ? 'bg-slate-950/40' : 'bg-slate-50/50'} ${
            !selectedConvId ? 'hidden sm:flex items-center justify-center' : 'flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className={`p-3 border-b ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'} flex items-center justify-between shrink-0`}>
                <div className="flex items-center space-x-2.5 min-w-0">
                  <button
                    onClick={() => {
                      setSelectedConvId(null);
                      if (onSelectConversation) onSelectConversation(null);
                    }}
                    className="sm:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {renderAvatarOrInitials(otherUserAvatar, otherUserName, 'w-9 h-9 text-xs')}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-xs sm:text-sm truncate`}>{otherUserName}</span>
                      <span className="text-[10px] bg-amber-500/15 text-amber-500 font-bold px-1.5 py-0.2 rounded font-medium shrink-0">
                        {otherUserTrade}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-500 flex items-center space-x-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Online on site</span>
                    </div>
                  </div>
                </div>

                {selectedConv.contextTag && (
                  <div className={`hidden md:flex items-center space-x-1 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} border px-2.5 py-1 rounded-lg text-xs max-w-xs truncate font-medium`}>
                    <ShoppingBag className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{selectedConv.contextTag}</span>
                  </div>
                )}
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0">
                {selectedConv.contextTag && (
                  <div className={`${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'} border rounded-xl p-2.5 text-center text-xs flex items-center justify-center space-x-2`}>
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Inquiry regarding: <strong>{selectedConv.contextTag}</strong></span>
                  </div>
                )}

                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed break-words overflow-hidden ${
                          isMe
                            ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm shadow-md'
                            : isDark
                            ? 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60'
                            : 'bg-white text-slate-900 rounded-tl-sm border border-slate-200 shadow-sm'
                        }`}
                      >
                        {msg.attachedItemTitle && (
                          <div
                            className={`mb-1.5 pb-1.5 border-b text-[11px] font-bold flex items-center space-x-1 ${
                              isMe ? 'border-slate-950/20 text-slate-900' : isDark ? 'border-slate-700 text-amber-400' : 'border-slate-200 text-amber-600'
                            }`}
                          >
                            <ShoppingBag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{msg.attachedItemTitle}</span>
                          </div>
                        )}
                        <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {msg.createdAt}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Preset Trade Replies */}
              <div className={`px-3 py-1.5 border-t ${isDark ? 'border-slate-800/60 bg-slate-900/60' : 'border-slate-200 bg-white'} flex items-center space-x-1.5 overflow-x-auto scrollbar-none no-scrollbar shrink-0`}>
                {[
                  'Is this still available?',
                  'Can I inspect it tomorrow?',
                  'What is your bottom price cash?',
                  'Send on your Safe Pass number',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSendMessage(preset)}
                    className={`shrink-0 ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'} border px-2.5 py-1 rounded-full text-[11px] transition cursor-pointer`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Send Input */}
              <div className={`p-2.5 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} flex items-center space-x-2 shrink-0`}>
                <input
                  type="text"
                  placeholder="Type message regarding gear or site work..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className={`flex-1 min-w-0 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400`}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 p-2 rounded-xl font-bold transition cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Select a conversation from the list to begin direct trade messaging.
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className={`border rounded-3xl max-w-md w-full p-5 shadow-2xl relative max-h-[85vh] flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>Start Direct Conversation</span>
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="py-3">
              <div className="relative">
                <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tradespeople by trade, name, or town..."
                  value={chatSearchQuery}
                  onChange={(e) => {
                    setChatSearchQuery(e.target.value);
                    fetchPeopleForChat(e.target.value);
                  }}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 shadow-inner ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  autoFocus
                />
                {chatSearchQuery && (
                  <button
                    onClick={() => {
                      setChatSearchQuery('');
                      fetchPeopleForChat('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Candidate list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-700/20 pr-1 space-y-1">
              {isLoadingCandidates ? (
                <div className="p-6 text-center text-xs text-amber-500 font-medium">
                  <span className="animate-spin mr-1.5">⚡</span> Searching tradespeople...
                </div>
              ) : candidatePeople.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {storageService.getAppMode() === 'live'
                    ? 'No other members registered yet. Invite site colleagues to join your live network!'
                    : 'No tradespeople match this search.'}
                </div>
              ) : (
                candidatePeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleStartChatWithCandidate(person)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                      isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {renderAvatarOrInitials(person.avatar, person.name, 'w-10 h-10 text-xs')}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {person.name}
                          </span>
                          {person.hasSafePass && (
                            <span className="text-[10px] text-emerald-500 font-bold flex items-center shrink-0">
                              <ShieldCheck className="w-3 h-3 mr-0.5" />
                              Safe Pass
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                          <span className="text-amber-500 font-medium">{person.trade}</span> • {person.location?.town || 'Ireland'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs ml-2 shrink-0">
                      Chat
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};