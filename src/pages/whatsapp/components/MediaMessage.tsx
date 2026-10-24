import type { WhatsAppMedia } from '../types/whatsapp'
import {
  ExternalLink,
  FileText,
  Loader2,
  Image as ImageIcon,
  Video,
  AudioLines,
} from 'lucide-react'

interface MediaMessageProps {
  media: WhatsAppMedia
}

export default function MediaMessage({
  media,
}: MediaMessageProps) {
  return (
    <div className="min-w-[220px] max-w-full">
      <MediaContent media={media} />
    </div>
  )
}

function MediaContent({
  media,
}: {
  media: WhatsAppMedia
}) {
  const url =
    typeof media.url === 'string'
      ? media.url.trim()
      : ''

  if (!url) {
    return (
      <MediaLoading
        type={media.type}
        name={media.name}
      />
    )
  }

  if (media.type === 'image') {
    return (
      <div className="overflow-hidden rounded-lg">
        <img
          src={url}
          alt={media.name || 'Imagem'}
          className="max-h-80 max-w-full object-cover"
        />
      </div>
    )
  }

  if (media.type === 'video') {
    return (
      <video
        src={url}
        controls
        className="max-h-80 max-w-full rounded-lg"
      />
    )
  }

  if (media.type === 'audio') {
    return (
      <div className="min-w-[260px] py-1">
        <audio
          src={url}
          controls
          className="w-full max-w-full"
        />
      </div>
    )
  }

  return (
    <DocumentMedia
      media={media}
      url={url}
    />
  )
}

function MediaLoading({
  type,
  name,
}: {
  type: WhatsAppMedia['type']
  name?: string
}) {
  const Icon =
    type === 'image'
      ? ImageIcon
      : type === 'video'
        ? Video
        : type === 'audio'
          ? AudioLines
          : FileText

  const label =
    type === 'image'
      ? 'Carregando imagem...'
      : type === 'video'
        ? 'Carregando vídeo...'
        : type === 'audio'
          ? 'Carregando áudio...'
          : 'Carregando documento...'

  return (
    <div className="flex min-h-[64px] min-w-[220px] items-center gap-3 rounded-lg border border-gray-200 bg-white/70 px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        {name ? (
          <p className="truncate text-xs font-medium text-gray-600">
            {name}
          </p>
        ) : null}

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
          <Loader2
            size={13}
            className="animate-spin"
          />

          <span>{label}</span>
        </div>
      </div>
    </div>
  )
}

function DocumentMedia({
  media,
  url,
}: {
  media: WhatsAppMedia
  url: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/document flex min-w-[260px] items-center gap-3 rounded-lg border border-gray-200 bg-white/70 px-3 py-3 transition hover:bg-white"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <FileText size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700">
          {media.name || 'Documento'}
        </p>

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
          <span>Documento</span>

          {media.size ? (
            <>
              <span>•</span>
              <span>
                {formatFileSize(media.size)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <ExternalLink
        size={15}
        className="shrink-0 text-gray-400 transition group-hover/document:text-gray-600"
      />
    </a>
  )
}

function formatFileSize(bytes: number) {
  if (!bytes) return ''

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}