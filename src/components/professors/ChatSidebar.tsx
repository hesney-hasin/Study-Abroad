import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, MoreHorizontal, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
export interface ChatSidebarSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  sessions: ChatSidebarSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession?: (id: string, title: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  isOpen,
  onToggle,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (session: ChatSidebarSession) => {
    setRenamingId(session.id);
    setRenameValue(session.title);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim() && onRenameSession) {
      onRenameSession(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  const groupByDate = (items: ChatSidebarSession[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const week = new Date(today);
    week.setDate(week.getDate() - 7);
    const month = new Date(today);
    month.setDate(month.getDate() - 30);

    const groups: { label: string; items: ChatSidebarSession[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 Days', items: [] },
      { label: 'Previous 30 Days', items: [] },
      { label: 'Older', items: [] },
    ];

    items.forEach(s => {
      const d = new Date(s.updated_at);
      if (d.toDateString() === today.toDateString()) groups[0].items.push(s);
      else if (d.toDateString() === yesterday.toDateString()) groups[1].items.push(s);
      else if (d > week) groups[2].items.push(s);
      else if (d > month) groups[3].items.push(s);
      else groups[4].items.push(s);
    });

    return groups.filter(g => g.items.length > 0);
  };

  const groups = groupByDate(sessions);

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="fixed left-2 top-16 z-40 h-8 w-8 bg-card border border-border shadow-sm"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'h-full bg-card border-r border-border flex flex-col transition-all duration-200 flex-shrink-0',
          isOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <Button
            onClick={onNewChat}
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> New Chat
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 flex-shrink-0">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Sessions list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No conversations yet
              </p>
            )}
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(session => {
                    const isActive = session.id === activeSessionId;
                    const isRenaming = renamingId === session.id;

                    return (
                      <div
                        key={session.id}
                        className={cn(
                          'group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-accent/50'
                        )}
                        onClick={() => !isRenaming && onSelectSession(session.id)}
                      >
                        <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

                        {isRenaming ? (
                          <div className="flex-1 flex items-center gap-1 min-w-0">
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmRename();
                                if (e.key === 'Escape') cancelRename();
                              }}
                              className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring min-w-0"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); confirmRename(); }}
                            >
                              <Check className="h-3 w-3 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                            >
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs leading-snug flex-1 min-w-0 line-clamp-2">
                              {session.title}
                            </span>

                            {/* Three-dot menu — visible on hover or when active */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={cn(
                                    'h-6 w-6 flex items-center justify-center rounded-md flex-shrink-0 transition-opacity hover:bg-accent',
                                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                {onRenameSession && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startRename(session);
                                    }}
                                    className="text-xs gap-2"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Rename
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session.id);
                                  }}
                                  className="text-xs gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
