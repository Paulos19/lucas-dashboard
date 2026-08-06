'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { importLeadsAction } from '@/app/actions/importLeads'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function ImportLeadsButton() {
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    
    // Toast com promise para UI responsiva
    toast.promise(
      importLeadsAction(formData),
      {
        loading: 'Importando leads...',
        success: (result) => {
          setIsUploading(false)
          if (result.success) {
            router.refresh()
            return `${result.count} leads importados com sucesso!`
          } else {
            throw new Error(result.error)
          }
        },
        error: (err) => {
          setIsUploading(false)
          return err.message || 'Erro ao importar leads'
        }
      }
    )
    
    // Limpa o input
    e.target.value = ''
  }

  return (
    <div>
      <input
        type="file"
        id="import-excel"
        accept=".xlsx, .xls"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <label htmlFor="import-excel">
        <Button variant="outline" asChild disabled={isUploading}>
          <span className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Importando...' : 'Importar Planilha'}
          </span>
        </Button>
      </label>
    </div>
  )
}
