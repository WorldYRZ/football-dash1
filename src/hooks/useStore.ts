import { useState, useEffect } from 'react'
import { supabase, StoreItem, UserInventory } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useGame } from './useGame'
import { useToast } from '@/hooks/use-toast'

export const useStore = () => {
  const { user } = useAuth()
  const { spendCoins } = useGame()
  const { toast } = useToast()
  const [items, setItems] = useState<StoreItem[]>([])
  const [inventory, setInventory] = useState<UserInventory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStoreItems()
      fetchInventory()
    }
  }, [user])

  const fetchStoreItems = async () => {
    try {
      const { data, error } = await supabase
        .from('store_items')
        .select('*')
        .order('category, price')

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching store items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInventory = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          *,
          store_items (*)
        `)
        .eq('user_id', user.id)

      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

  const purchaseItem = async (item: StoreItem) => {
    if (!user) return false

    // Check if user already owns this item
    const alreadyOwned = inventory.some(inv => inv.item_id === item.id)
    if (alreadyOwned) {
      toast({
        title: "Already Owned",
        description: "You already own this item!",
        variant: "destructive",
      })
      return false
    }

    // Attempt to spend coins
    const success = await spendCoins(item.price, `Purchased ${item.name}`)
    if (!success) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${item.price} coins to buy this item.`,
        variant: "destructive",
      })
      return false
    }

    try {
      // Add to inventory
      const { error } = await supabase
        .from('user_inventory')
        .insert({
          user_id: user.id,
          item_id: item.id,
          is_equipped: false
        })

      if (error) throw error

      // Refresh inventory
      await fetchInventory()

      toast({
        title: "Purchase Successful!",
        description: `You bought ${item.name}!`,
      })

      return true
    } catch (error) {
      console.error('Error purchasing item:', error)
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const equipItem = async (inventoryItem: UserInventory) => {
    if (!user) return false

    try {
      // First, unequip any other items in the same category
      const item = items.find(i => i.id === inventoryItem.item_id)
      if (!item) return false

      await supabase
        .from('user_inventory')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .in('item_id', items.filter(i => i.category === item.category).map(i => i.id))

      // Then equip this item
      const { error } = await supabase
        .from('user_inventory')
        .update({ is_equipped: true })
        .eq('id', inventoryItem.id)

      if (error) throw error

      // Refresh inventory
      await fetchInventory()

      toast({
        title: "Item Equipped!",
        description: `${item.name} is now equipped.`,
      })

      return true
    } catch (error) {
      console.error('Error equipping item:', error)
      toast({
        title: "Equip Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const getOwnedItems = () => {
    return inventory.map(inv => inv.item_id)
  }

  const getEquippedItems = () => {
    return inventory
      .filter(inv => inv.is_equipped)
      .reduce((acc, inv) => {
        const item = items.find(i => i.id === inv.item_id)
        if (item) {
          acc[item.category] = item.id
        }
        return acc
      }, {} as Record<string, string>)
  }

  const getItemsByCategory = (category: string) => {
    return items.filter(item => item.category === category)
  }

  return {
    items,
    inventory,
    loading,
    purchaseItem,
    equipItem,
    getOwnedItems,
    getEquippedItems,
    getItemsByCategory,
    fetchStoreItems,
    fetchInventory
  }
}