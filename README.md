# SDI Messenger Library (`messenger-sdi-lib`)

Librería de componentes React para mensajería y chat de soporte en tiempo real (con soporte para Laravel Reverb / Pusher WebSockets), diseñada para funcionar de forma transparente, ultraligera y 100% aislada en cualquier proyecto **React / Next.js (App Router & Pages)**.

---

## ✨ Características Principales

- **⚡ 100% Libre de Conflictos (Zero Dependencies de Estado Externo):** Construida con hooks nativos de React (`useState`, `useEffect`, `useCallback`, `useRef`). **No requiere ni utiliza React Query**, eliminando cualquier riesgo de colisión de versiones con React Query v4, v5, SWR, Redux o RTK Query en tu aplicación anfitriona.
- **🔄 Sincronización Reactiva en Tiempo Real:** Integración nativa con Laravel Reverb / Pusher. Actualización instantánea de nuevos mensajes, indicadores de lectura, tipografía (*typing*), creación y cierre de conversaciones.
- **🛡️ Compatibilidad SSR / Next.js:** Incluye directivas `'use client'` y polyfills seguros para evaluación en servidor durante Server-Side Rendering (SSR).
- **🎨 Aislamiento de Estilos Garantizado:** Todos los estilos CSS están encapsulados bajo el namespace `.sdi-messenger-root` con Tailwind CSS v4, evitando colisiones con los estilos o clases globales de tu app.
- **🗺️ Detección de Rutas en Tiempo Real:** Detección instantánea de cambios de URL en SPAs (Next.js `<Link>`, `router.push`, React Router) para ocultar o mostrar el chat flotante dinámicamente sin recargar la página.
- **🔊 Sistema de Sonidos Nativos:** Notificaciones auditivas mediante **Web Audio API** (sin descargas de archivos `.mp3`), con tonos diferenciados para conversaciones enfocadas vs. no enfocadas y protección anti-ráfagas.
- **🤖 Asistente Virtual IA (Bot SDI) Integrado:** Creación automática de sesiones de triaje con IA, persistencia automática de `session_uuid` por conversación, botones de acción interactivos (`action_buttons`), escalamiento a técnico en vivo o cola de espera (`in_queue`) y modal de calificación por estrellas (1 a 5) al resolver tickets.
- **📝 Renderizado y Editor de Texto Enriquecido (HTML WYSIWYG):** Soporte seguro (XSS-safe) en burbujas de mensaje para etiquetas HTML de texto enriquecido (`<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<del>`, `<ul>`, `<ol>`, `<li>`, `<pre>`, `<code>`, `<table>`, `<blockquote>`, `<a href>`), bloques de código con botón de copiado y enlaces seguros, acompañado de un editor visual `contentEditable` en el compositor sin sintaxis Markdown.
- **🔒 Bloqueo en Conversaciones Cerradas:** Deshabilita el compositor de texto/archivos con aviso visual de candado al interactuar con conversaciones finalizadas y sincroniza el estado automáticamente.
- **💬 Vistas Flexibles:** Widget flotante completo (FAB) o componentes independientes para crear vistas a pantalla completa / paneles embebidos.

---

## 📦 Instalación

### Opción A: Desde repositorio Git / Tag
```bash
npm install https://github.com/Inverpacifico-desarrollo/messenger-sdi-lib.git#lib
```

### Opción B: Desde paquete comprimido local (`.tgz`)
```bash
npm install ../ruta-a/messenger-sdi-lib-1.3.0.tgz
```

---

## 🚀 Requisitos Previos

La librería requiere **React 18+** y **React DOM 18+** como dependencias pares (`peerDependencies`):

```json
"peerDependencies": {
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0"
}
```

---

## 🎨 1. Importación de Estilos

Importa la hoja de estilos de la librería una sola vez en el archivo raíz de tu aplicación (ej. `layout.tsx`, `_app.tsx`, `App.tsx` o `main.tsx`):

```tsx
import 'messenger-sdi-lib/styles.css'
```

---

## ⚙️ 2. Configuración con `ChatProvider`

Envuelve tu aplicación o layout con el `ChatProvider`, pasando las credenciales de API y WebSockets (Laravel Reverb):

```tsx
'use client'

import React from 'react'
import { ChatProvider, FloatingChat, type ChatConfig } from 'messenger-sdi-lib'
import 'messenger-sdi-lib/styles.css'

const chatConfig: ChatConfig = {
  apiBaseUrl: 'https://api.tu-servidor.com',
  authToken: 'TU_TOKEN_BEARER_DE_AUTENTICACION',
  applicationId: 10,
  supportWithBot: true, // true (por defecto): "Solicitar Asistencia" inicia con el Bot IA | false: abre el formulario tradicional
  reverb: {
    key: 'tu-reverb-key',
    host: 'reverb.tu-servidor.com',
    port: 443,
    wsPath: '/messenger-ws',
    scheme: 'https'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider config={chatConfig}>
      {children}
      <FloatingChat />
    </ChatProvider>
  )
}
```

---

## 💬 3. Modos de Uso

### A. Widget Flotante (`<FloatingChat />`)
Widget interactivo completo con botón flotante (FAB), lista de chats, soporte técnico con Bot IA o formulario y panel de conversación en tiempo real:

```tsx
import { FloatingChat } from 'messenger-sdi-lib'

<FloatingChat
  title="Centro de Ayuda SDI"
  defaultView="home"                    // 'home' | 'list' | 'chat' | 'support-form'
  defaultCorner="bottom-right"           // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  canViewChatList={true}
  canRequestSupport={true}
  supportWithBot={true}                  // true (por defecto): inicia chat con Bot IA | false: abre formulario de soporte
  hiddenPaths={['/messenger', '/login']} // Ocultar automáticamente en estas rutas
  showToastOnUnread={false}             // Notificaciones toast (opcional)
/>
```

#### Propiedades de `<FloatingChat />`:

| Propiedad | Tipo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `'Centro de Ayuda SDI'` | Título en la cabecera del widget. |
| `defaultView` | `'home' \| 'list' \| 'chat' \| 'support-form'` | `'home'` | Vista inicial al abrir el chat. |
| `defaultCorner` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Esquina inicial en pantalla. |
| `canViewChatList` | `boolean` | `true` | Permite navegar por la lista de conversaciones. |
| `canRequestSupport` | `boolean` | `true` | Permite solicitar asistencia técnica desde la vista de inicio. |
| `supportWithBot` | `boolean` | `config.supportWithBot ?? true` | Define si el botón **"Solicitar Asistencia"** inicia una sesión con el Asistente Virtual Bot IA (`true`) o abre el formulario directo a técnico (`false`). |
| `hiddenPaths` | `string[]` | `['/messenger']` | Rutas donde el chat se oculta automáticamente (ej: `['/messenger', '/admin/*']`). |
| `showOnlyPaths` | `string[]` | `undefined` | Mostrar únicamente en las rutas especificadas. |
| `hideCondition` | `(pathname: string) => boolean` | `undefined` | Callback booleano para evaluar dinámicamente si ocultar. |
| `currentPath` | `string` | `undefined` | *(Opcional)* Ruta activa forzada (ej. desde `usePathname()`). |
| `hidden` | `boolean` | `false` | Forzar ocultamiento mediante booleano directo. |
| `showToastOnUnread` | `boolean` | `false` | Activa o desactiva las alertas toast emergentes de mensajes no leídos. |
| `renderOptions` | `ConversationChatHeaderRenderOptions` | `undefined` | Opciones de renderizado para la cabecera (ej: `customHeaderButtons`). |
| `onActiveConversationChange` | `(conversation: Conversation \| null) => void` | `undefined` | Callback reactivo que notifica cuando la conversación activa cambia o se deselecciona. |

---

### B. Vistas Embebidas (Pantalla Completa o Sección de Mensajería)
Si deseas construir una página completa de mensajería dentro de tu aplicación:

```tsx
'use client'

import React from 'react'
import {
  ConversationsSidebarList,
  ConversationChatPanel,
  ConversationEmptyState,
  NewConversationDialog,
  useConversationsPage
} from 'messenger-sdi-lib'

export function FullMessengerPage() {
  const {
    conversations,
    selectedId,
    selectedConversation,
    selectConversation,
    searchQuery,
    setSearchQuery,
    closedFilter,
    setClosedFilter,
    typeFilter,
    setTypeFilter,
    isNewConversationOpen,
    setIsNewConversationOpen,
    handleConversationCreated,
    isLoading
  } = useConversationsPage({
    showToastOnUnread: true,
    isActive: true // Mantiene activa la sincronización en pantalla completa
  })

  return (
    <div className="flex h-[calc(100vh-80px)] w-full gap-4 p-4">
      {/* Lista Lateral de Conversaciones */}
      <div className="w-80 h-full">
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

      {/* Panel de Conversación Activa */}
      <div className="flex-1 h-full">
        {selectedConversation ? (
          <ConversationChatPanel
            conversation={selectedConversation}
            renderOptions={{
              customHeaderButtons: <MyCustomHeaderButtons />
            }}
          />
        ) : (
          <ConversationEmptyState
            onNewConversation={() => setIsNewConversationOpen(true)}
          />
        )}
      </div>

      {/* Modal para Nueva Conversación */}
      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onSuccess={handleConversationCreated}
      />
    </div>
  )
}
```

#### Propiedades de `<ConversationChatPanel />`:

| Propiedad | Tipo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `conversation` | `Conversation` | **Requerido** | Objeto de la conversación a mostrar. |
| `renderOptions` | `ConversationChatHeaderRenderOptions` | `undefined` | Opciones de personalización de cabecera (`customHeaderButtons`). |
| `showHeader` | `boolean` | `true` | Muestra u oculta la cabecera del chat. |
| `showWallpaper` | `boolean` | `true` | Muestra el fondo decorativo con patrón de chat. |
| `readOnly` | `boolean` | `false` | Deshabilita el envío de mensajes e interacciones. |
| `readOnlyMessage` | `string` | `undefined` | Mensaje informativo cuando está en modo solo lectura. |
| `showComposer` | `boolean` | `true` | Muestra u oculta la barra inferior para escribir y adjuntar archivos. |
| `onCloseSuccess` | `() => void` | `undefined` | Callback disparado al cerrarse exitosamente la conversación. |
| `onBack` | `() => void` | `undefined` | Callback del botón de retroceso (visible en vistas móviles/flotantes). |
| `alwaysShowBackButton` | `boolean` | `false` | Fuerza la visibilidad del botón atrás incluso en pantallas anchas. |
| `isContextPanelOpen` | `boolean` | `true` | Estado de apertura del panel lateral de detalles. |
| `onToggleContextPanel` | `() => void` | `undefined` | Handler para alternar el panel lateral de detalles. |

---

### C. Hook `useShowConversation` (Detalle de Conversación por ID)
Obtén y suscríbete en tiempo real a una conversación específica mediante su ID:

```tsx
import { useShowConversation } from 'messenger-sdi-lib'

export function ConversationView({ conversationId }: { conversationId: string }) {
  const {
    conversation,
    isLoading,
    isError,
    errors,
    refetch
  } = useShowConversation(conversationId, {
    showToastOnUnread: true,
    onMessage: (msg) => console.log('Nuevo mensaje:', msg)
  })

  if (isLoading) return <div>Cargando conversación...</div>
  if (isError || !conversation) return <div>Error al cargar conversación</div>

  return (
    <div>
      <h2>{conversation.attributes.name}</h2>
    </div>
  )
}
```

---

## 🛠️ 4. Personalización de Cabecera y Conversación Activa

### A. Botones y Menús Personalizados en la Cabecera (`customHeaderButtons`)

Tanto `<FloatingChat />` como `<ConversationChatPanel />` y `<ConversationChatHeader />` admiten la propiedad `renderOptions.customHeaderButtons`. Cuando se proporciona, reemplaza el botón de cierre de conversación por defecto con cualquier nodo React (menú desplegable, botones de acción, etc.) **sin inyectar comportamientos ni dependencias no deseadas**:

```tsx
import { FloatingChat } from 'messenger-sdi-lib'
import { ChatActionsMenu } from './chat-actions-menu'

export function HelpdeskChat() {
  return (
    <FloatingChat
      renderOptions={{
        customHeaderButtons: <ChatActionsMenu />
      }}
    />
  )
}
```

---

### B. Hook `useActiveConversation` (Acceso a la Conversación Activa)

El hook `useActiveConversation()` permite acceder reactivamente a los datos y estado de la conversación activa (`conversation`, `isClosed`, `isClosing`, `handleCloseConversation`). Funciona de dos formas transparentes:

1. **Dentro del chat (ej. en componentes pasados a `customHeaderButtons`)**:
   Obtiene el contexto React directo del panel, conociendo si la conversación se está cerrando en ese momento (`isClosing`) o si ya finalizó (`isClosed`).
2. **Desde componentes externos / contenedores (ej. el componente que renderiza `<FloatingChat />`)**:
   Gracias a su integración nativa con `activeConversationStore` vía `useSyncExternalStore`, se suscribe automáticamente a la conversación activa sin necesidad de envolver tu app en providers adicionales ni generar re-renders infinitos. Devuelve `null` si no hay ninguna conversación seleccionada o abierta.

#### Ejemplo 1: Menú de Acciones en la Cabecera (`customHeaderButtons`)

```tsx
import React from 'react'
import { useActiveConversation } from 'messenger-sdi-lib'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreVertical, XCircle } from 'lucide-react'

export function ChatActionsMenu() {
  const activeChat = useActiveConversation()

  // Si no hay conversación abierta, no renderizamos el menú
  if (!activeChat) return null

  const { conversation, isClosed, isClosing, handleCloseConversation } = activeChat
  const metadata = conversation.attributes?.metadata as { ticket_id?: number } | undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Opciones del chat"
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={isClosed || isClosing}
          onClick={() => handleCloseConversation()}
          className="text-red-600 focus:text-red-600 cursor-pointer"
        >
          <XCircle className="size-4 mr-2" />
          <span>{isClosing ? 'Cerrando...' : isClosed ? 'Conversación cerrada' : 'Cerrar chat'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

#### Ejemplo 2: Lectura desde el componente padre externo

```tsx
import React from 'react'
import { FloatingChat, useActiveConversation } from 'messenger-sdi-lib'
import { ChatActionsMenu } from './chat-actions-menu'

export function HelpdeskFloatingChat() {
  const activeChat = useActiveConversation()

  // Acceso seguro a la conversación activa y su metadata desde fuera
  const ticketId = activeChat?.conversation.attributes?.metadata?.ticket_id

  return (
    <div>
      {ticketId && (
        <aside className="fixed bottom-24 right-6 z-40 bg-white shadow rounded p-2 text-xs">
          Viendo Ticket #{String(ticketId)}
        </aside>
      )}

      <FloatingChat
        renderOptions={{
          customHeaderButtons: <ChatActionsMenu />
        }}
      />
    </div>
  )
}
```

> **Valores retornados por `useActiveConversation()`:**
> - `conversation`: Objeto de la conversación (`id`, `attributes`, `metadata`, etc.).
> - `isClosed`: `boolean` indicando si la conversación ya está finalizada/cerrada (`closed_at != null`).
> - `isClosing`: `boolean` indicando si la petición de cierre está actualmente en curso.
> - `handleCloseConversation()`: Función asíncrona que ejecuta el cierre de la conversación y sincroniza el estado en tiempo real.

---

### C. Detectar la Conversación Seleccionada desde Afuera (`onActiveConversationChange`)

Si necesitas recibir notificaciones reactivas cada vez que el usuario entra o sale de una conversación en `<FloatingChat />`:

```tsx
<FloatingChat
  onActiveConversationChange={(conversation) => {
    if (conversation) {
      console.log('Conversación abierta ID:', conversation.id)
      console.log('Ticket ID:', conversation.attributes?.metadata?.ticket_id)
    } else {
      console.log('Ninguna conversación seleccionada (vista de lista/inicio)')
    }
  }}
/>
```

También puedes consultar la conversación activa de forma síncrona o fuera del ciclo de render mediante el store:
```tsx
import { activeConversationStore } from 'messenger-sdi-lib'

// Lectura directa en cualquier momento:
const currentConversation = activeConversationStore.get()
console.log('ID actual:', currentConversation?.id)

// Suscripción manual fuera de React:
const unsubscribe = activeConversationStore.subscribe((conversation) => {
  console.log('Cambió la conversación activa:', conversation?.id)
})
```

---

### D. Cerrar Conversaciones desde Afuera por ID (`useCloseConversation`)

Si deseas cerrar una conversación desde cualquier lugar de tu aplicación externa (por ejemplo, desde una tabla de soporte, un botón en un modal de confirmación o un panel de tickets):

```tsx
import React from 'react'
import { useCloseConversation } from 'messenger-sdi-lib'

interface CloseChatButtonProps {
  conversationId: string
}

export function CloseChatButton({ conversationId }: CloseChatButtonProps) {
  // useCloseConversation NO recibe parámetros en su invocación inicial
  const {
    mutateAsync: closeConversation,
    isLoading: isClosing,
    isSuccess,
    isError,
    error
  } = useCloseConversation()

  const handleClose = async () => {
    try {
      // Se pasa el conversationId a la función de mutación:
      await closeConversation(conversationId)

      // ✅ Al cerrarse, la librería dispara automáticamente el evento global
      // 'messenger:conversation-closed', actualizando al instante todas las listas,
      // contadores y paneles abiertos en tiempo real.
    } catch (err) {
      console.error('Error al cerrar conversación:', err)
    }
  }

  return (
    <button
      onClick={handleClose}
      disabled={isClosing}
      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {isClosing ? 'Cerrando...' : isSuccess ? 'Cerrado' : 'Cerrar Conversación'}
    </button>
  )
}
```

> [!TIP]
> **Propiedades retornadas por `useCloseConversation()`:**
> - `mutateAsync(conversationId)`: Promesa asíncrona para ejecutar el cierre (`await mutateAsync(id)`).
> - `mutate(conversationId, { onSuccess, onError })`: Disparador alternativo con callbacks.
> - `isLoading` / `isPending`: `boolean` indicando si la petición HTTP está en proceso.
> - `isSuccess`: `boolean` indicando si la última petición fue exitosa.
> - `isError`: `boolean` indicando si ocurrió un error.
> - `error`: Error devuelto por la petición (`AxiosError`).
> - `reset()`: Reinicia el estado de la mutación.

#### Uso Fuera de React (`closeConversationService`):
Si necesitas cerrar una conversación fuera del ciclo de vida de React (en un thunk, handler independiente o servicio):
```tsx
import { closeConversationService } from 'messenger-sdi-lib'

await closeConversationService('id-de-la-conversacion')
```

---

### E. Verificación de Permisos del Usuario (`useCheckHasPermissionMessenger`)

Para condicionar botones, acciones o elementos de la interfaz según los permisos del usuario autenticado en el chat:

```tsx
import { useCheckHasPermissionMessenger } from 'messenger-sdi-lib'

export function ChatActionsMenu() {
  // Comprobar un permiso individual:
  const hasProvideSupport = useCheckHasPermissionMessenger({
    permission: 'messenger_chat_support.provide_support'
  })

  // O comprobar múltiples permisos con operador 'OR' (por defecto) o 'AND':
  const canManageSupport = useCheckHasPermissionMessenger({
    permission: [
      'messenger_chat_support.provide_support',
      'messenger_chat_support.request_support'
    ],
    operator: 'OR' // 'OR' | 'AND'
  })

  return (
    <div>
      {hasProvideSupport && (
        <button type="button">Panel de Técnico</button>
      )}
    </div>
  )
}
```

> **Permisos estándar de Messenger (`PermissionsMessenger`):**
> - `'messenger_chat.read'`: Listar y consultar conversaciones.
> - `'messenger_chat_support.request_support'`: Solicitar asistencia técnica / crear solicitudes.
> - `'messenger_chat_support.provide_support'`: Atender solicitudes de soporte técnico y cerrar conversaciones.
> - *(También admite strings adicionales compatibles si tu backend implementa otros roles o permisos).*

También se exporta la función auxiliar `hasMessengerPermission` para evaluar listas de permisos fuera de React:
```tsx
import { hasMessengerPermission } from 'messenger-sdi-lib'

const isAllowed = hasMessengerPermission(
  ['messenger_chat.read', 'messenger_chat_support.provide_support'],
  'messenger_chat_support.provide_support'
)
```

---

## 🤖 5. Asistente Virtual IA (Bot SDI), Escalamiento y Resolución

La librería integra de forma nativa el flujo completo de atención mediante el **Asistente Virtual de Soporte SDI**:

1. **Inicio de Asistencia Unificado (`supportWithBot`)**:
   - Por defecto (`supportWithBot: true` en `ChatConfig` o `<FloatingChat />`), el botón **"Solicitar Asistencia"** inicia directamente una sesión de diagnóstico con el Bot IA.
   - Si configuras `supportWithBot: false`, el mismo botón abrirá el formulario tradicional de soporte (`<RequestSupportForm />`) sin perder su funcionalidad.
2. **Persistencia Automática de `session_uuid`**:
   - Cuando llega el evento WebSocket `MessageSent` con `metadata.session_uuid`, la librería asocia automáticamente ese `session_uuid` al `conversation_id` en `localStorage` (`saveConversationSessionId`, `getConversationSessionId`) y lo elimina cuando la conversación se cierra (`removeConversationSessionId`).
3. **Botones de Acción Interactivos (`action_buttons`)**:
   - Los botones enviados por el bot en `metadata.action_buttons` se muestran bajo la burbuja del mensaje.
   - Sólo están habilitados en el **último mensaje** de la conversación para evitar reenvíos duplicados de acciones pasadas.
4. **Escalamiento a Técnico (`EscalateSupportDialog` / `useEscalateChatSupport`)**:
   - Envía `{ session_id, reason }` a `/api/v1/chat-bot/escalate`:
     - **`status === "escalated_live"`**: transfiere y hace foco automáticamente en la nueva conversación (`conversation_id`) asignada con el técnico en vivo.
     - **`status === "in_queue"`**: muestra en el modal la posición en la fila (`queue_position`), el tiempo estimado (`estimated_wait_minutes`), el mensaje informativo y los botones de decisión (ej. *"⏳ Continuar esperando en vivo"* o *"📝 Crear ticket y no esperar"*), enviando como mensaje la opción seleccionada.
5. **Calificación y Resolución (`ResolveSupportDialog` / `useResolveChatSupport`)**:
   - Al pulsar el botón de acción **"✅ Sí, solucionó mi problema"**, se abre un diálogo modal para calificar de **1 a 5 estrellas** y dejar un comentario opcional, enviando `{ session_id, helpful: true, comment, rating }` a `/api/v1/chat-bot/resolve` y dando por finalizada la conversación en estado Resuelto.

---

## 📝 6. Renderizado y Editor de Texto Enriquecido (HTML)

### A. Renderizado de Etiquetas HTML en Burbujas (`<MessageRichText />`)
Todos los mensajes (enviados, recibidos y del Bot IA) se procesan mediante un parser seguro de AST HTML hacia nodos de React (sin usar `dangerouslySetInnerHTML`):
- **Etiquetas de estilo inline**: `<b>`, `<strong>` (negrita), `<i>`, `<em>` (cursiva), `<u>` (subrayado), `<s>`, `<strike>`, `<del>` (tachado) y `<a href="...">` (enlaces) además de autodetección de URLs en texto plano.
- **Bloques de código (`CodeBlock`)**: Las etiquetas `<pre><code>...</code></pre>`, `<pre>...</pre>` y `<code>...</code>` se renderizan como bloques de código con cabecera y botón **Copiar** al portapapeles.
- **Listas, Tablas y Estructuras**: Listas desordenadas (`<ul><li>`), listas numeradas (`<ol><li>`), tablas HTML (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`), citas (`<blockquote>`), encabezados (`<h1>` a `<h6>`) y saltos/párrafos (`<p>`, `<div>`, `<br>`, `<hr>`).
- **Seguridad de Enlaces (`sanitizeUrl`)**: Permite únicamente protocolos seguros (`http:`, `https:`, `mailto:`) con `target="_blank"` y `rel="noopener noreferrer"`, bloqueando `javascript:` o `data:`.

### B. Editor Visual WYSIWYG con Barra de Formato (`ConversationComposer`)
El compositor de mensajes incorpora un editor visual enriquecido (`contentEditable`) con un botón **`Aa`** para desplegar la barra de herramientas sin mostrar símbolos Markdown:
- Botones directos que aplican formato en tiempo real con etiquetas HTML: **Negrita** (`<b>`), **Cursiva** (`<i>`), **Subrayado** (`<u>`), **Tachado** (`<s>`), **Lista de viñetas** (`<ul><li>`), **Lista numerada** (`<ol><li>`), **Código** (`<code>`) e **Insertar enlace** (`<a href="...">`).
- **Indicadores de formato activo**: Cada botón se ilumina automáticamente cuando el cursor o la selección actual tiene aplicado ese estilo, y el icono **`Aa`** muestra un punto indicador activo.
- **Atajos de teclado**: `Ctrl+B` / `Cmd+B` (negrita), `Ctrl+I` / `Cmd+I` (cursiva), `Ctrl+U` / `Cmd+U` (subrayado), `Ctrl+K` / `Cmd+K` (insertar enlace).
- **Bloques de código en vivo**: Al pulsar el botón de código se inserta un bloque visual `<code>` directamente en el input; `Shift+Enter` añade saltos de línea dentro del código y volver a pulsar el botón (o flecha derecha) permite continuar escribiendo fuera del bloque.

---

## 🔊 7. Notificaciones de Sonido

La librería incluye un sistema de notificaciones sonoras nativo (**Web Audio API**, sin dependencias de archivos `.mp3` externos):
- **Tono Enfocado (`focused`)**: Tono suave cuando el usuario tiene la conversación abierta y visible en pantalla.
- **Tono No Enfocado (`unfocused`)**: Tono de alerta armónico de tres notas cuando el mensaje pertenece a otra conversación o el chat está cerrado/en segundo plano.
- **Anti-Saturación (Rate Limiting)**: Si llegan ráfagas de mensajes en menos de 1 segundo, el sonido se reproduce sólo una vez.

Puedes disparar sonidos manualmente si lo requieres:
```tsx
import { playNotificationSound } from 'messenger-sdi-lib'

playNotificationSound('focused')   // Tono suave
playNotificationSound('unfocused') // Tono de alerta
```

---

## 🎛️ 8. Componentes, Hooks y Tipos Disponibles

### Componentes Exportados:
- `ChatProvider`: Proveedor de contexto y configuración del chat.
- `ActiveConversationProvider`: Proveedor de contexto local para la conversación activa.
- `FloatingChat`: Widget de chat flotante completo con soporte técnico y navegación.
- `ConversationChatPanel`: Panel activo de mensajes, scroll infinito, cabecera y compositor multimedia enriquecido.
- `ConversationChatHeader`: Cabecera independiente de la conversación con soporte para `renderOptions`.
- `ConversationsSidebarList`: Lista lateral filtrable con pestañas (Todas, Directas, Grupos, Bot) y buscador.
- `ConversationEmptyState`: Vista de estado vacío cuando no hay chat seleccionado.
- `ConversationContextPanel`: Panel lateral con detalles y participantes de la conversación.
- `NewConversationDialog`: Modal para iniciar conversaciones directas o grupales.
- `EscalateSupportDialog`: Modal para escalar conversación del Bot IA a técnico o gestionar la fila de espera (`in_queue`).
- `ResolveSupportDialog`: Modal de calificación de 1 a 5 estrellas y comentarios para dar por resuelta la atención del Bot IA.
- `MessageRichText`: Renderizador seguro de etiquetas HTML y texto enriquecido para mensajes.
- `RequestSupportForm`: Formulario tradicional para crear solicitudes de asistencia técnica.

### Hooks Exportados:
- `useActiveConversation`: Accede a la conversación activa actual (`conversation`, `isClosed`, `isClosing`, `handleCloseConversation`) tanto dentro de la cabecera como desde componentes externos.
- `useRequiredActiveConversation`: Variante de `useActiveConversation` que asegura que el contexto esté presente.
- `useCheckHasPermissionMessenger`: Hook para verificar si el usuario actual cuenta con permisos específicos en el chat.
- `useCloseConversation`: Hook de mutación para cerrar cualquier conversación puntual por su ID desde cualquier parte de la app.
- `useEscalateChatSupport`: Hook de mutación para escalar una sesión del Bot IA a técnico (`/api/v1/chat-bot/escalate`).
- `useResolveChatSupport`: Hook de mutación para calificar y resolver una sesión del Bot IA (`/api/v1/chat-bot/resolve`).
- `useConversationsPage`: Gestiona estado de lista, filtros, búsqueda, selección, escalamiento y sincronización de mensajes no leídos.
- `useConversationChat`: Gestiona mensajes, paginación hacia arriba, escritura en vivo (*typing*), archivos, optimismo y cierre de conversación.
- `useShowConversation`: Consulta y suscripción a una conversación puntual por ID.
- `useChatContext`: Acceso a la configuración activa y usuario autenticado.
- `useOptionalChatContext`: Acceso seguro al contexto opcional (retorna `null` si está fuera del provider).

### Utilidades y Servicios:
- `activeConversationStore`: Store reactivo global (`get()`, `set()`, `subscribe()`) para leer la conversación activa.
- `hasMessengerPermission`: Función utilitaria para evaluar listas de permisos con operadores `'AND'` u `'OR'`.
- `closeConversationService`: Función de servicio HTTP directa para cerrar conversaciones.
- `saveConversationSessionId`, `getConversationSessionId`, `removeConversationSessionId`: Utilidades de almacenamiento local para gestionar el `session_uuid` asociado a cada conversación.
- `sanitizeUrl`: Validador seguro de URLs (`http:`, `https:`, `mailto:`).
- `playNotificationSound`: Reproductor de tonos de notificación con Web Audio API.
- `LIB_VERSION`: Versión actual de la librería (`1.3.0`, inferida automáticamente desde `package.json`).

### Tipos e Interfaces Exportados:
- **Conversaciones:** `Conversation`, `ConversationType`, `CreateConversationPayload`, `TypingEvent`, `UnreadEvent`.
- **Mensajes:** `Message`, `MessageAttachment`, `MessageType`, `MessageActionButton`, `MessageMetadata`, `CreateMessagePayload`, `UploadMessageFilePayload`.
- **Usuarios & Soporte / Bot IA:** `UserChat`, `RequestChatSupportPayload`, `RequestChatSupportResponse`, `EscalateChatSupportPayload`, `EscalateChatSupportResponse`, `ResolveChatSupportPayload`, `ResolveChatSupportResponse`.
- **Permisos:** `PermissionsMessenger`, `CheckMessengerPermissionParams`, `PermissionOperator`.
- **Cabecera & Personalización:** `ConversationChatHeaderRenderOptions`, `ConversationRenderOptions`, `ActiveConversationContextValue`, `ActiveConversationProviderProps`.
- **Props de Componentes:** `FloatingChatProps`, `FloatingChatView`, `FloatingChatCorner`, `ConversationChatPanelProps`, `ConversationChatHeaderProps`, `ConversationsSidebarListProps`, `NewConversationDialogProps`, `EscalateSupportDialogProps`, `ResolveSupportDialogProps`, `MessageRichTextProps`, `RequestSupportFormProps`.
- **Configuración & Contextos:** `ChatConfig`, `ChatContextValue`, `ChatProviderProps`.

---

## 🌓 9. Modo Oscuro (Dark Mode)

La librería detecta el modo oscuro automáticamente:
1. Si el elemento `<html>` o `<body>` de tu app tiene la clase `dark`.
2. O si agregas la clase `dark` a cualquier elemento contenedor del chat.

---

## 🛠️ Licencia
Propiedad privada - SDI / Gane ByD.