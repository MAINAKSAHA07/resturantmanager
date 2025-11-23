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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
        <label className="font-medium text-sm sm:text-base text-gray-700">Quantity:</label>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-accent-blue hover:bg-accent-blue/10 transition-all duration-200 font-medium text-sm sm:text-base"
          >
            -
          </button>
          <span className="w-10 sm:w-12 text-center font-semibold text-base sm:text-lg">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-accent-blue hover:bg-accent-blue/10 transition-all duration-200 font-medium text-sm sm:text-base"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  );
}



