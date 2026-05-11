import { useRef, type ChangeEvent } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImportFileButtonProps {
  onFileLoaded: (text: string) => void
  disabled?: boolean
  /** Comma-separated list of accepted extensions/MIME types. */
  accept?: string
}

export function ImportFileButton({
  onFileLoaded,
  disabled,
  accept = '.txt,.csv,.tsv,.dec,text/plain,text/csv',
}: ImportFileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = () => inputRef.current?.click()

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const text = await file.text()
      onFileLoaded(text)
    }
    // Reset so re-selecting the same file fires onChange.
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSelect}
        disabled={disabled}
      >
        <FileText className="w-4 h-4 mr-2" />
        Choose file…
      </Button>
    </>
  )
}
