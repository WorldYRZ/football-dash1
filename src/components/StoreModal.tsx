import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/hooks/useStore'
import { useAuth } from '@/hooks/useAuth'
import { StoreItem } from '@/lib/supabase'
import { Coins, ShoppingBag, Check } from 'lucide-react'

interface StoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const StoreModal: React.FC<StoreModalProps> = ({ open, onOpenChange }) => {
  const { profile } = useAuth()
  const { items, inventory, purchaseItem, equipItem, getOwnedItems, getEquippedItems } = useStore()

  const ownedItems = getOwnedItems()
  const equippedItems = getEquippedItems()

  const renderStoreItem = (item: StoreItem) => {
    const isOwned = ownedItems.includes(item.id)
    const isEquipped = equippedItems[item.category] === item.id
    const inventoryItem = inventory.find(inv => inv.item_id === item.id)

    return (
      <div key={item.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          {item.is_limited_time && (
            <Badge variant="destructive">Limited</Badge>
          )}
          {item.is_premium && (
            <Badge variant="secondary">Premium</Badge>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{item.price}</span>
          </div>
          
          {isOwned ? (
            isEquipped ? (
              <Badge variant="default" className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Equipped
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={() => inventoryItem && equipItem(inventoryItem)}
              >
                Equip
              </Button>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => purchaseItem(item)}
              disabled={!profile || profile.coin_balance < item.price}
            >
              Buy
            </Button>
          )}
        </div>
      </div>
    )
  }

  const categories = [
    { id: 'skin', name: 'Skins', icon: '👤' },
    { id: 'jersey', name: 'Jerseys', icon: '👕' },
    { id: 'helmet', name: 'Helmets', icon: '⛑️' },
    { id: 'cleats', name: 'Cleats', icon: '👟' },
    { id: 'gloves', name: 'Gloves', icon: '🧤' },
    { id: 'animation', name: 'Animations', icon: '✨' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Customization Store
            <div className="ml-auto flex items-center gap-1 text-sm">
              <Coins className="h-4 w-4 text-yellow-500" />
              {profile?.coin_balance || 0}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="skin" className="flex-1">
          <TabsList className="grid grid-cols-6 w-full">
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => (
            <TabsContent key={category.id} value={category.id}>
              <ScrollArea className="h-[400px] w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {items
                    .filter(item => item.category === category.id)
                    .map(renderStoreItem)}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default StoreModal