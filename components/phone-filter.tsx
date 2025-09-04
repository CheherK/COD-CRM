// components/phone-filter.tsx
"use client"
import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Phone, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLanguage } from "@/contexts/language-context"

interface PhoneFilterProps {
  value: string
  onChange: (value: string) => void
  suggestions?: string[]
  placeholder?: string
}

export function PhoneFilter({ value, onChange, suggestions = [], placeholder }: PhoneFilterProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null) // Create a ref for the input

  // Format phone number as user types
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '')
    if (cleaned.startsWith('+216')) {
      const number = cleaned.slice(4)
      if (number.length <= 2) return `+216 ${number}`
      if (number.length <= 5) return `+216 ${number.slice(0, 2)} ${number.slice(2)}`
      return `+216 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 8)}`
    }
    if (cleaned.startsWith('216')) {
      return formatPhoneNumber(`+${cleaned}`)
    }
    if (/^\d{8}$/.test(cleaned)) {
      return formatPhoneNumber(`+216${cleaned}`)
    }
    return cleaned
  }

  const handleInputChange = (newValue: string) => {
    const formatted = formatPhoneNumber(newValue)
    setInputValue(formatted)
    onChange(formatted)
  }

  const handleSuggestionClick = (suggestion: string) => {
    const formatted = formatPhoneNumber(suggestion)
    setInputValue(formatted)
    onChange(formatted)
    setIsOpen(false)
  }

  const clearFilter = () => {
    setInputValue("")
    onChange("")
  }

  // Handle click on PopoverTrigger to focus the input
  const handleTriggerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus() // Programmatically focus the input
    }
    setIsOpen(true)
  }

  const filteredSuggestions = suggestions
    .filter((suggestion) => suggestion.includes(inputValue.replace(/\D/g, '')))
    .slice(0, 5)

  return (
    <div className="relative">
      <Popover open={isOpen && filteredSuggestions.length > 0} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative" onClick={handleTriggerClick}>
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={inputRef} // Attach the ref to the input
              placeholder={placeholder || t("searchByPhone")}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-8"
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilter}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        {filteredSuggestions.length > 0 && (
          <PopoverContent className="w-80 p-0" align="start">
            <div className="max-h-60 overflow-y-auto">
              <div className="p-2 border-b">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t("recentPhoneNumbers")}
                </div>
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatPhoneNumber(suggestion)}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  )
}

// Hook for phone number validation
export function usePhoneValidation() {
  const validateTunisianPhone = (phone: string): boolean => {
    // Remove all non-digits except +
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Check various Tunisian phone formats
    const patterns = [
      /^\+216[2-9]\d{7}$/,  // +216 followed by 8 digits starting with 2-9
      /^216[2-9]\d{7}$/,    // 216 followed by 8 digits starting with 2-9
      /^[2-9]\d{7}$/        // Local 8-digit format starting with 2-9
    ]
    
    return patterns.some(pattern => pattern.test(cleaned))
  }

  const formatPhoneForDisplay = (phone: string): string => {
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    if (cleaned.startsWith('+216')) {
      const number = cleaned.slice(4)
      return `+216 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 8)}`
    }
    
    if (cleaned.startsWith('216')) {
      const number = cleaned.slice(3)
      return `+216 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 8)}`
    }
    
    if (/^\d{8}$/.test(cleaned)) {
      return `+216 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)}`
    }
    
    return phone
  }

  const normalizePhone = (phone: string): string => {
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    if (cleaned.startsWith('+216')) return cleaned
    if (cleaned.startsWith('216')) return `+${cleaned}`
    if (/^\d{8}$/.test(cleaned)) return `+216${cleaned}`
    
    return phone
  }

  return {
    validateTunisianPhone,
    formatPhoneForDisplay,
    normalizePhone
  }
}