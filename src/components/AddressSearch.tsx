'use client';
import { useState } from 'react';

export default function AddressSearch() {
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [borough, setBorough] = useState('Manhattan');
  const [district, setDistrict] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setDistrict(null);

    try {
      const res = await fetch(`/api/lookup-district?houseNumber=${houseNumber}&street=${encodeURIComponent(street)}&borough=${borough}`);
      const data = await res.json();
      if (data.district) {
        setDistrict(data.district);
      } else {
        alert('Could not find a district for this address.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Find Your Council District</h2>
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">House Number</label>
          <input 
            type="text" 
            value={houseNumber} 
            onChange={(e) => setHouseNumber(e.target.value)} 
            placeholder="e.g. 250" 
            className="w-full mt-1 p-2 border rounded-md"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Street Name</label>
          <input 
            type="text" 
            value={street} 
            onChange={(e) => setStreet(e.target.value)} 
            placeholder="e.g. Broadway" 
            className="w-full mt-1 p-2 border rounded-md"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Borough</label>
          <select 
            value={borough} 
            onChange={(e) => setBorough(e.target.value)} 
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="Manhattan">Manhattan</option>
            <option value="Brooklyn">Brooklyn</option>
            <option value="Queens">Queens</option>
            <option value="Bronx">Bronx</option>
            <option value="Staten Island">Staten Island</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition"
        >
          {loading ? 'Searching...' : 'Find My District'}
        </button>
      </form>

      {district && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-center">
          <p className="text-green-800 font-semibold">Your NYC Council District is:</p>
          <p className="text-3xl font-bold text-green-900 mt-1">District {district}</p>
        </div>
      )}
    </div>
  );
}