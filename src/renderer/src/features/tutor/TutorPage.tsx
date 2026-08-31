import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, LoadingState } from '../../design-system'
import type { ConversationMessage, TutorEvent } from '@shared/types/tutor'

interface DisplayMessage extends ConversationMessage {
  /** True while an assistant message is still streaming in. */
  streaming?: boolean
}

export function TutorPage(): React.JSX.Element {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[] | null>(null)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.studyos.tutor.getLatestConversation().then((conversation) => {
      if (conversation) {
        conversationIdRef.current = conversation.id
        setConversationId(conversation.id)
        setMessages(conversation.messages)
      } else {
        setMessages([])
      }
    })
  }, [])

  useEffect(() => {
    return window.studyos.tutor.onEvent((event: TutorEvent) => {
      if (event.conversationId !== conversationIdRef.current) return

      if (event.type === 'chunk') {
        setMessages((prev) => {
          const list = prev ?? []
          const last = list.at(-1)
          if (last?.streaming) {
            return [...list.slice(0, -1), { ...last, content: last.content + event.delta }]
          }
          return [
            ...list,
            {
              id: event.messageId,
              role: 'assistant',
              content: event.delta,
              sources: [],
              createdAt: new Date().toISOString(),
              streaming: true
            }
          ]
        })
      } else if (event.type === 'done') {
        setMessages((prev) => {
          const list = prev ?? []
          const withoutStreaming = list.at(-1)?.streaming ? list.slice(0, -1) : list
          return [
            ...withoutStreaming,
            {
              id: event.messageId,
              role: 'assistant',
              content: event.content,
              sources: event.sources,
              createdAt: new Date().toISOString()
            }
          ]
        })
        setSending(false)
      } else if (event.type === 'error') {
        setError(event.errorMessage)
        setSending(false)
        setMessages((prev) => (prev?.at(-1)?.streaming ? prev.slice(0, -1) : prev))
      }
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function handleSend(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setError(null)
    setSending(true)
    setQuestion('')
    setMessages((prev) => [
      ...(prev ?? []),
      {
        id: `pending-${Date.now()}`,
        role: 'user',
        content: trimmed,
        sources: [],
        createdAt: new Date().toISOString()
      }
    ])

    const { conversationId: id } = await window.studyos.tutor.ask(
      trimmed,
      conversationIdRef.current ?? undefined
    )
    conversationIdRef.current = id
    setConversationId(id)
  }

  async function handleNewConversation(): Promise<void> {
    const conversation = await window.studyos.tutor.newConversation()
    conversationIdRef.current = conversation.id
    setConversationId(conversation.id)
    setMessages([])
    setError(null)
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Tutor</h1>
          <p className="text-sm text-text-secondary">
            Responde solo con lo que encuentra en tu biblioteca.
          </p>
        </div>
        {conversationId && (
          <Button size="sm" variant="ghost" onClick={handleNewConversation}>
            Nueva conversación
          </Button>
        )}
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {messages === null && <LoadingState label="Cargando conversación..." />}

          {messages !== null && messages.length === 0 && (
            <EmptyState
              title="Pregúntale algo al Tutor"
              description="Responde basándose en los documentos que ya importaste a tu biblioteca."
            />
          )}

          {messages !== null && messages.length > 0 && (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-muted">
                    {message.role === 'user' ? 'Tú' : 'Tutor'}
                  </span>
                  <p className="whitespace-pre-wrap text-sm text-text-primary">
                    {message.content}
                    {message.streaming && <span className="animate-pulse">▍</span>}
                  </p>
                  {message.sources.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1 rounded-md border border-border bg-background p-2">
                      <span className="text-xs font-medium text-text-muted">Fuentes</span>
                      {message.sources.map((source) => (
                        <Link
                          key={`${source.documentId}-${source.pageStart}`}
                          to={`/library/${source.documentId}?page=${source.pageStart}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {source.documentTitle} · p.{' '}
                          {source.pageStart === source.pageEnd
                            ? source.pageStart
                            : `${source.pageStart}–${source.pageEnd}`}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="border-t border-border px-4 py-2 text-sm text-danger">{error}</p>}

        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSend(question)
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Escribe una pregunta..."
            disabled={sending}
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={sending || question.trim().length === 0}>
            {sending ? 'Pensando...' : 'Enviar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
