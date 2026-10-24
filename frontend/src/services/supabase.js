import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks whether valid Supabase credentials have been configured.
 */
export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

// Initialize the Supabase client safely
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Local storage key for fallback simulation history
const LOCAL_HISTORY_KEY = 'negotiation_simulations_history';

// ── Authentication Helpers ──────────────────────────────────────────────────

/**
 * Register a new user with Email and Password in Supabase.
 */
export async function signUpWithEmail(email, password, fullName = '') {
  if (!isSupabaseConfigured() || !supabase) {
    // Local fallback when Supabase keys are not set
    const fallbackUser = {
      id: `local-usr-${Date.now()}`,
      email,
      name: fullName || email.split('@')[0],
      role: 'Simulation Architect',
      type: 'local',
    };
    return { user: fallbackUser, session: null, error: null, isMock: true };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName || email.split('@')[0],
        },
      },
    });

    if (error) throw error;

    const user = data.user
      ? {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0],
          role: 'Simulation Architect',
          type: 'supabase',
        }
      : null;

    return { user, session: data.session, error: null, isMock: false };
  } catch (err) {
    return { user: null, session: null, error: err.message || 'Registration failed' };
  }
}

/**
 * Sign in an existing user with Email and Password.
 */
export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    // Local fallback when Supabase keys are not set
    const fallbackUser = {
      id: `local-usr-${Date.now()}`,
      email,
      name: email.split('@')[0],
      role: 'Simulation Architect',
      type: 'local',
    };
    return { user: fallbackUser, session: null, error: null, isMock: true };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const user = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0],
      role: 'Simulation Architect',
      type: 'supabase',
    };

    return { user, session: data.session, error: null, isMock: false };
  } catch (err) {
    return { user: null, session: null, error: err.message || 'Invalid email or password' };
  }
}

/**
 * Sign out user from Supabase and clear session.
 */
export async function signOutUser() {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signout warning:', err);
    }
  }
}

/**
 * Get the currently authenticated user from Supabase.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
      role: 'Simulation Architect',
      type: 'supabase',
    };
  } catch {
    return null;
  }
}

/**
 * Listen for auth state changes (sign in, sign out, token refresh).
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
        role: 'Simulation Architect',
        type: 'supabase',
      };
      callback(event, user);
    } else {
      callback(event, null);
    }
  });

  return () => {
    subscription?.unsubscribe();
  };
}

// ── Simulation History Helpers ──────────────────────────────────────────────

/**
 * Save a completed simulation session.
 * Saves to Supabase PostgreSQL table 'simulations' when connected, and updates local cache.
 */
export async function saveSimulationRecord({
  userId = null,
  scenarioId,
  scenarioTitle,
  status,
  winner = null,
  totalRounds,
  totalTurns,
  config,
  turns,
}) {
  const newRecord = {
    id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    scenario_id: scenarioId,
    scenario_title: scenarioTitle,
    status,
    winner,
    total_rounds: totalRounds,
    total_turns: totalTurns,
    config,
    turns,
    created_at: new Date().toISOString(),
  };

  // 1. Always keep in local storage for instant responsiveness & offline resilience
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    local.unshift(newRecord);
    // Keep last 50 runs in local storage
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(local.slice(0, 50)));
  } catch (err) {
    console.warn('Local history cache error:', err);
  }

  // 2. Persist to Supabase if connected
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbPayload = {
        scenario_id: scenarioId,
        scenario_title: scenarioTitle,
        status,
        winner,
        total_rounds: Number(totalRounds) || 0,
        total_turns: Number(totalTurns) || 0,
        config,
        turns,
      };

      if (userId) {
        dbPayload.user_id = userId;
      }

      const { data, error } = await supabase
        .from('simulations')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.warn('Supabase simulation insert error:', error.message);
        return { data: newRecord, error: error.message, isLocal: true };
      }

      return { data: data || newRecord, error: null, isLocal: false };
    } catch (err) {
      console.warn('Failed to save to Supabase:', err);
      return { data: newRecord, error: err.message, isLocal: true };
    }
  }

  return { data: newRecord, error: null, isLocal: true };
}

/**
 * Fetch past simulation records for the current user.
 */
export async function fetchUserSimulations(userId = null) {
  // 1. Attempt Supabase fetch if connected
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return { data, error: null, source: 'supabase' };
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to local history:', err);
    }
  }

  // 2. Fallback to localStorage
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    return { data: local, error: null, source: 'local' };
  } catch {
    return { data: [], error: null, source: 'local' };
  }
}

/**
 * Delete a simulation record by ID.
 */
export async function deleteSimulationRecord(simulationId) {
  // Delete from local cache
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    const filtered = local.filter((item) => item.id !== simulationId);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  // Delete from Supabase if connected
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('simulations').delete().eq('id', simulationId);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  return true;
}
