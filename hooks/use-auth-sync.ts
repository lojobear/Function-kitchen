/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  User 
} from '../firebase';
import { FinishedItem, Ingredient, KitchenAction, sanitizeName } from '../constants';

const LOCAL_STORAGE_ITEMS_KEY = 'fc_forge_finished_items_v2';
const LOCAL_STORAGE_INGREDIENTS_KEY = 'fc_forge_custom_ingredients_v2';
const LOCAL_STORAGE_METHODS_KEY = 'fc_forge_custom_methods_v2';

export function useAuthAndForgeSync() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'syncing' | 'error'>('local');

  const [finishedItems, setFinishedItems] = useState<FinishedItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }));
      }
    } catch (e) {
      console.warn("Failed loading finished items from localStorage", e);
    }
    return [];
  });

  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_INGREDIENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed loading custom ingredients from localStorage", e);
    }
    return [];
  });

  const [customMethods, setCustomMethods] = useState<KitchenAction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_METHODS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed loading custom methods from localStorage", e);
    }
    return [];
  });

  // Track initial sync per session
  const hasMergedLocalRef = useRef(false);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setSyncStatus('syncing');
      } else {
        setSyncStatus('local');
        hasMergedLocalRef.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  // Save to local storage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(finishedItems));
    } catch (e) {
      console.warn("Could not write finished items to localStorage", e);
    }
  }, [finishedItems]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_INGREDIENTS_KEY, JSON.stringify(customIngredients));
    } catch (e) {
      console.warn("Could not write custom ingredients to localStorage", e);
    }
  }, [customIngredients]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_METHODS_KEY, JSON.stringify(customMethods));
    } catch (e) {
      console.warn("Could not write custom methods to localStorage", e);
    }
  }, [customMethods]);

  // Firestore Sync Listeners
  useEffect(() => {
    if (!user) return;

    setIsCloudSyncing(true);

    // 1. Sync Finished Items Vault
    const itemsPath = `users/${user.uid}/finished_items`;
    const itemsRef = collection(db, 'users', user.uid, 'finished_items');
    const unsubItems = onSnapshot(
      itemsRef,
      (snapshot) => {
        const cloudItems: FinishedItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudItems.push({
            id: data.id || docSnap.id,
            name: data.name || 'Unnamed Item',
            emoji: data.emoji || '📦',
            rarity: data.rarity || 'Common',
            category: data.category || 'General',
            color: data.color || '#3b82f6',
            description: data.description || '',
            toolsUsed: data.toolsUsed || [],
            ingredientsUsed: data.ingredientsUsed || [],
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          });
        });

        // Merge cloud items with local state (sort newest first)
        setFinishedItems((prev) => {
          const map = new Map<string, FinishedItem>();
          // Cloud takes priority
          cloudItems.forEach((i) => map.set(i.id, i));
          // Keep local ones that haven't synced yet
          prev.forEach((i) => {
            if (!map.has(i.id)) map.set(i.id, i);
          });
          return Array.from(map.values()).sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
        });

        setIsCloudSyncing(false);
        setSyncStatus('synced');
      },
      (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.GET, itemsPath);
        } else {
          console.warn("Firestore items sync is operating in offline mode:", errorMsg);
          setSyncStatus('local');
          setIsCloudSyncing(false);
        }
      }
    );

    // 2. Sync Custom Ingredients
    const ingPath = `users/${user.uid}/custom_ingredients`;
    const ingRef = collection(db, 'users', user.uid, 'custom_ingredients');
    const unsubIngredients = onSnapshot(
      ingRef,
      (snapshot) => {
        const cloudIngs: Ingredient[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudIngs.push({
            name: data.name,
            emoji: data.emoji || '✨',
            category: data.category || 'Custom',
          });
        });

        setCustomIngredients((prev) => {
          const map = new Map<string, Ingredient>();
          cloudIngs.forEach((ing) => map.set(ing.name.toLowerCase(), ing));
          prev.forEach((ing) => {
            if (!map.has(ing.name.toLowerCase())) map.set(ing.name.toLowerCase(), ing);
          });
          return Array.from(map.values());
        });
      },
      (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.GET, ingPath);
        } else {
          console.warn("Firestore custom ingredients listener operating in offline mode:", errorMsg);
        }
      }
    );

    // 3. Sync Custom Methods
    const methPath = `users/${user.uid}/custom_methods`;
    const methRef = collection(db, 'users', user.uid, 'custom_methods');
    const unsubMethods = onSnapshot(
      methRef,
      (snapshot) => {
        const cloudMethods: KitchenAction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudMethods.push({
            name: data.name,
            displayName: data.displayName || data.name,
            emoji: data.emoji || '⚡',
            category: data.category || 'custom',
          });
        });

        setCustomMethods((prev) => {
          const map = new Map<string, KitchenAction>();
          cloudMethods.forEach((m) => map.set(m.name, m));
          prev.forEach((m) => {
            if (!map.has(m.name)) map.set(m.name, m);
          });
          return Array.from(map.values());
        });
      },
      (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.GET, methPath);
        } else {
          console.warn("Firestore custom methods listener operating in offline mode:", errorMsg);
        }
      }
    );

    // Initial merge of any existing local items to user's cloud database on sign in
    if (!hasMergedLocalRef.current) {
      hasMergedLocalRef.current = true;
      (async () => {
        try {
          // Sync local finished items
          for (const item of finishedItems) {
            const docRef = doc(db, 'users', user.uid, 'finished_items', item.id);
            await setDoc(
              docRef,
              {
                id: item.id,
                userId: user.uid,
                name: item.name,
                emoji: item.emoji,
                rarity: item.rarity,
                category: item.category,
                color: item.color,
                description: item.description,
                toolsUsed: item.toolsUsed || [],
                ingredientsUsed: item.ingredientsUsed || [],
                createdAt: item.createdAt.toISOString(),
              },
              { merge: true }
            );
          }

          // Sync local custom ingredients
          for (const ing of customIngredients) {
            const ingId = sanitizeName(ing.name);
            const docRef = doc(db, 'users', user.uid, 'custom_ingredients', ingId);
            await setDoc(
              docRef,
              {
                id: ingId,
                userId: user.uid,
                name: ing.name,
                emoji: ing.emoji,
                category: ing.category || 'Custom',
                isCustom: true,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }

          // Sync local custom methods
          for (const meth of customMethods) {
            const methId = sanitizeName(meth.name);
            const docRef = doc(db, 'users', user.uid, 'custom_methods', methId);
            await setDoc(
              docRef,
              {
                id: methId,
                userId: user.uid,
                name: meth.name,
                displayName: meth.displayName,
                emoji: meth.emoji,
                category: meth.category || 'custom',
                isCustom: true,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.warn("Initial local to cloud sync notice:", err);
        }
      })();
    }

    return () => {
      unsubItems();
      unsubIngredients();
      unsubMethods();
    };
  }, [user]);

  // Auth actions
  const loginWithGoogle = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setSyncStatus('local');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setSyncStatus('local');
    } catch (err: any) {
      console.error("Sign Out Error:", err);
    }
  }, []);

  // Save a completed finished item (into state & Firestore)
  const saveFinishedItem = useCallback(
    async (item: FinishedItem) => {
      setFinishedItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.id === item.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = item;
          return copy;
        }
        return [item, ...prev];
      });

      if (user) {
        const docPath = `users/${user.uid}/finished_items/${item.id}`;
        try {
          const docRef = doc(db, 'users', user.uid, 'finished_items', item.id);
          await setDoc(
            docRef,
            {
              id: item.id,
              userId: user.uid,
              name: item.name,
              emoji: item.emoji,
              rarity: item.rarity,
              category: item.category,
              color: item.color,
              description: item.description,
              toolsUsed: item.toolsUsed || [],
              ingredientsUsed: item.ingredientsUsed || [],
              createdAt: item.createdAt.toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.WRITE, docPath);
          } else {
            console.warn("Finished item saved locally (Firestore offline/queued):", errMsg);
          }
        }
      }
    },
    [user]
  );

  // Delete a finished item from vault
  const deleteFinishedItem = useCallback(
    async (id: string) => {
      setFinishedItems((prev) => prev.filter((i) => i.id !== id));

      if (user) {
        const docPath = `users/${user.uid}/finished_items/${id}`;
        try {
          const docRef = doc(db, 'users', user.uid, 'finished_items', id);
          await deleteDoc(docRef);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.DELETE, docPath);
          } else {
            console.warn("Finished item deleted locally (Firestore offline/queued):", errMsg);
          }
        }
      }
    },
    [user]
  );

  // Add/Save a newly discovered or created custom ingredient
  const addCustomIngredient = useCallback(
    async (ing: Ingredient) => {
      const trimmedName = ing.name.trim().toLowerCase();
      if (!trimmedName) return;

      setCustomIngredients((prev) => {
        if (prev.some((item) => item.name.toLowerCase() === trimmedName)) {
          return prev;
        }
        return [...prev, { ...ing, name: ing.name.trim() }];
      });

      if (user) {
        const ingId = sanitizeName(trimmedName);
        const docPath = `users/${user.uid}/custom_ingredients/${ingId}`;
        try {
          const docRef = doc(db, 'users', user.uid, 'custom_ingredients', ingId);
          await setDoc(
            docRef,
            {
              id: ingId,
              userId: user.uid,
              name: ing.name.trim(),
              emoji: ing.emoji || '✨',
              category: ing.category || 'Custom',
              isCustom: true,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("Could not save custom ingredient to cloud:", err);
        }
      }
    },
    [user]
  );

  // Add/Save a newly discovered or created custom crafting method
  const addCustomMethod = useCallback(
    async (method: KitchenAction) => {
      const sanitized = sanitizeName(method.name);
      if (!sanitized) return;

      const formattedMethod: KitchenAction = {
        name: sanitized,
        displayName: method.displayName || method.name,
        emoji: method.emoji || '⚡',
        category: method.category || 'custom',
      };

      setCustomMethods((prev) => {
        if (prev.some((m) => m.name === sanitized)) {
          return prev;
        }
        return [...prev, formattedMethod];
      });

      if (user) {
        const docPath = `users/${user.uid}/custom_methods/${sanitized}`;
        try {
          const docRef = doc(db, 'users', user.uid, 'custom_methods', sanitized);
          await setDoc(
            docRef,
            {
              id: sanitized,
              userId: user.uid,
              name: sanitized,
              displayName: formattedMethod.displayName,
              emoji: formattedMethod.emoji,
              category: formattedMethod.category,
              isCustom: true,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("Could not save custom method to cloud:", err);
        }
      }
    },
    [user]
  );

  return {
    user,
    authLoading,
    isCloudSyncing,
    syncStatus,
    finishedItems,
    customIngredients,
    customMethods,
    loginWithGoogle,
    logout,
    saveFinishedItem,
    deleteFinishedItem,
    addCustomIngredient,
    addCustomMethod,
  };
}
