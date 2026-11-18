'use client'

import { ConversationChatPanel, ConversationEmptyState, ConversationsSidebarList, NewConversationDialog, useActiveConversation, useConversationsPage } from "@/index"



export default function ConversationsPage() {

  const activeChat = useActiveConversation()
  const {
    conversations,
    selectedId,
    selectedConversation,
    closedFilter,
    setClosedFilter,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    isContextPanelOpen,
    isMobileChatOpen,
    isNewConversationOpen,
    isLoading,
    selectConversation,
    unselectConversation,
    setIsContextPanelOpen,
    setIsNewConversationOpen,
    goBackToConversationList,
    handleConversationCreated
  } = useConversationsPage()

  return (
    <div className='sdi-messenger-root flex flex-1 h-full min-h-0 w-full min-w-0 gap-3 overflow-hidden'>

      <div
        className={`w-full md:w-82.5 lg:w-90 xl:w-95 shrink-0 h-full min-w-0 ${isMobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
      >
        <ConversationsSidebarList
          conversations={conversations}
          selectedId={selectedId}
          onSelectConversation={selectConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          closedFilter={closedFilter}
          onClosedFilterChange={setClosedFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          onNewConversation={() => setIsNewConversationOpen(true)}
          isLoading={isLoading}
        />
      </div>

      {/* Columna Central: Chat Activo (visible en móvil si el chat está abierto) */}
      <div
        className={`flex-1 min-w-0 h-full ${!isMobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
      >
        {selectedConversation ? (
          <ConversationChatPanel
            conversation={selectedConversation}
            isContextPanelOpen={isContextPanelOpen}
            onToggleContextPanel={() => setIsContextPanelOpen((prev) => !prev)}
            onBack={unselectConversation}
            onCloseSuccess={unselectConversation}
          />
        ) : (
          <ConversationEmptyState
            onNewConversation={() => setIsNewConversationOpen(true)}
          />
        )}
      </div>



      {/* Modal de Nueva Conversación (Directa o Grupal) */}
      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onSuccess={handleConversationCreated}
      />
    </div>
  )
}

