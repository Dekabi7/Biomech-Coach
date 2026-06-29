import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, Player } from '@/services/api';

const PLAYER_ID_KEY = 'biomechcoach_player_id';

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const storedId = await SecureStore.getItemAsync(PLAYER_ID_KEY);

        if (storedId) {
          try {
            const existing = await api.getPlayer(storedId);
            setPlayer(existing);
            return;
          } catch {
            // Stored ID no longer valid — fall through to create
          }
        }

        const created = await api.createPlayer(
          'Demo Player',
          `demo+${Date.now()}@biomechcoach.app`,
          3.5,
        );
        await SecureStore.setItemAsync(PLAYER_ID_KEY, created.id);
        setPlayer(created);
      } catch (e: any) {
        console.error('usePlayer init failed:', e?.message ?? e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return { player, loading };
}
