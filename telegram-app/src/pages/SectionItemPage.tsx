import { useLocation, useNavigate } from 'react-router-dom'
import { Card } from '@/components/Card'
import { ArrowLeft } from 'lucide-react'

export const SectionItemPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { item, sectionTitle } = location.state || {}

  if (!item) {
    return (
      <div className="p-4">
        <p className="text-center text-gray-500">Элемент не найден</p>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <p className="text-xs text-gray-500">{sectionTitle}</p>
          <h1 className="text-lg font-bold text-text-primary">{item.title}</h1>
        </div>
      </div>

      <div className="p-4">
        <Card>
          {item.description && (
            <p className="text-gray-600 mb-4">{item.description}</p>
          )}
          
          <div className="whitespace-pre-line text-gray-700 leading-relaxed">
            {item.content}
          </div>
        </Card>
      </div>
    </div>
  )
}
