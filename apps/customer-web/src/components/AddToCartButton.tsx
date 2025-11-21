'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OptionGroup {
  id: string;
  name?: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  values: Array<{ id: string; name: string; priceDelta: number }>;
}

export default function AddToCartButton({
  itemId,
  optionGroups,
}: {
  itemId: string;
  optionGroups: OptionGroup[];
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleOptionChange = (groupId: string, valueId: string, isMultiple: boolean) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (isMultiple) {
        const newSelection = current.includes(valueId)
          ? current.filter((id) => id !== valueId)
          : [...current, valueId];
        return { ...prev, [groupId]: newSelection };
      } else {
        return { ...prev, [groupId]: [valueId] };
      }
    });
  };

  const handleAddToCart = async () => {
    // Validate required options
    for (const group of optionGroups) {
      if (group.required) {
        const selected = selectedOptions[group.id] || [];
        if (selected.length < group.minSelect) {
          alert(`Please select at least ${group.minSelect} option(s)${group.name ? ` for ${group.name}` : ''}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const cartItem = {
        menuItemId: itemId,
        quantity,
        options: Object.entries(selectedOptions).map(([groupId, valueIds]) => ({
          groupId,
          valueIds,
        })),
      };
      cart.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Dispatch custom event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
      
      router.push('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-4 mb-4">
        <label className="font-medium">Quantity:</label>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-1 border rounded"
          >
            -
          </button>
          <span className="w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 py-1 border rounded"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  );
}



