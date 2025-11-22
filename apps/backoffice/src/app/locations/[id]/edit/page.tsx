'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    stateCode: '',
    gstin: '',
    address: '',
    hours: '',
  });

  useEffect(() => {
    fetchLocation();
  }, [locationId]);

  const fetchLocation = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      
      if (data.locations) {
        const location = data.locations.find((loc: any) => loc.id === locationId);
        if (location) {
          setFormData({
            name: location.name || '',
            stateCode: location.stateCode || '',
            gstin: location.gstin || '',
            address: location.address 
              ? (typeof location.address === 'string' 
                  ? location.address 
                  : JSON.stringify(location.address, null, 2))
              : '',
            hours: location.hours 
              ? (typeof location.hours === 'string' 
                  ? location.hours 
                  : JSON.stringify(location.hours, null, 2))
              : '',
          });
        } else {
          alert('Location not found');
          router.push('/locations');
        }
      }
    } catch (error: any) {
      console.error('Error fetching location:', error);
      alert('Failed to load location: ' + error.message);
      router.push('/locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.stateCode.trim() || !formData.gstin.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const locationData: any = {
        name: formData.name.trim(),
        stateCode: formData.stateCode.trim(),
        gstin: formData.gstin.trim(),
      };

      // Parse JSON fields if provided
      if (formData.address.trim()) {
        try {
          locationData.address = JSON.parse(formData.address);
        } catch {
          // If not valid JSON, store as simple text
          locationData.address = { text: formData.address };
        }
      }

      if (formData.hours.trim()) {
        try {
          locationData.hours = JSON.parse(formData.hours);
        } catch {
          locationData.hours = { text: formData.hours };
        }
      }

      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });

      const data = await response.json();
      if (data.success) {
        router.push('/locations');
      } else {
        alert(data.error || 'Failed to update location');
        setSaving(false);
      }
    } catch (error: any) {
      console.error('Error updating location:', error);
      alert('Failed to update location: ' + error.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
            Edit Location
          </h1>
          <button
            onClick={() => router.push('/locations')}
            className="btn-secondary px-4 py-2"
          >
            Back
          </button>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Location Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Main Branch"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">State Code *</label>
                <input
                  type="text"
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., MH"
                  maxLength={2}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">GSTIN *</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., 27AAAAA0000A1Z5"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Address (JSON or text)</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={4}
                  placeholder='{"street": "123 Main St", "city": "Mumbai", "zip": "400001"}'
                />
                <p className="text-xs text-gray-500 mt-1">Enter as JSON object or plain text</p>
              </div>
              <div>
                <label className="block font-medium mb-2">Hours (JSON or text)</label>
                <textarea
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={3}
                  placeholder='{"monday": "9:00-22:00", "tuesday": "9:00-22:00"}'
                />
                <p className="text-xs text-gray-500 mt-1">Enter as JSON object or plain text</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/locations')}
                disabled={saving}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

