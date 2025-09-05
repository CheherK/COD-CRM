import React from 'react'
import { Package } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    nameEn: string
    nameFr: string
    imageUrl?: string
  }
  productId: string
}

interface ProductHoverProps {
  items: OrderItem[]
  firstProduct: any
  hasMultipleProducts: boolean
  totalItems: number
}

export const ProductHover: React.FC<ProductHoverProps> = ({
  items,
  firstProduct,
  hasMultipleProducts,
  totalItems
}) => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
          <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center relative overflow-hidden">
            {firstProduct?.imageUrl ? (
              <img 
                src={firstProduct.imageUrl} 
                alt={firstProduct.name}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              {firstProduct?.name || "N/A"}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>×{totalItems}</span>
              {hasMultipleProducts && (
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  +{items.length - 1} more
                </span>
              )}
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Order Items ({items.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.product.imageUrl ? (
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.product.name}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Qty: {item.quantity}</span>
                    <span>{item.price.toFixed(2)} TND</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Total Items:</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} TND</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}