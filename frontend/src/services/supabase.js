import { createClient } from '@supabase/supabase-js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks whether valid Supabase cloud credentials have been configured.
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

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const LOCAL_HISTORY_KEY = 'negotiation_simulations_history';

async function authApi(path, { method = 'GET', body } = {}) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || response.statusText || 'Authentication request failed');
  }
  return data;
}

// ── Authentication Helpers ──────────────────────────────────────────────────

export async function signUpWithEmail(email, password, fullName = '') {
  if (!isSupabaseConfigured() || !supabase) {
    try {
      const res = await authApi('/api/auth/signup', {
        method: 'POST',
        body: { email, password, full_name: fullName },
      });
      return { user: res.user, session: { provider: 'sqlite' }, error: null, isMock: false };
    } catch (err) {
      return { user: null, session: null, error: err.message || 'Registration failed' };
    }
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

export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    try {
      const res = await authApi('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      return { user: res.user, session: { provider: 'sqlite' }, error: null, isMock: false };
    } catch (err) {
      return { user: null, session: null, error: err.message || 'Invalid email or password' };
    }
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

export async function requestOtpCode(identifier) {
  try {
    const res = await authApi('/api/auth/otp/send', {
      method: 'POST',
      body: { identifier },
    });
    return { sent: true, demoOtp: res.demo_otp, error: null };
  } catch (err) {
    return { sent: false, demoOtp: null, error: err.message || 'Could not send OTP' };
  }
}

export async function verifyOtpCode(identifier, otp) {
  try {
    const res = await authApi('/api/auth/otp/verify', {
      method: 'POST',
      body: { identifier, otp },
    });
    return { user: res.user, error: null };
  } catch (err) {
    return { user: null, error: err.message || 'Invalid or expired OTP' };
  }
}

export async function signInWithOAuthProfile({ email, name, role, type }) {
  try {
    const res = await authApi('/api/auth/oauth', {
      method: 'POST',
      body: { email, name, role, type },
    });
    return { user: res.user, error: null };
  } catch {
    return {
      user: {
        id: `${type}-${Date.now()}`,
        email,
        name,
        role,
        type,
      },
      error: null,
    };
  }
}

export async function signOutUser() {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signout warning:', err);
    }
  }
}

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
  deadlockEvent = null,
}) {
  config = deadlockEvent ? { ...(config || {}), deadlock_event: deadlockEvent } : config;
  const newRecord = {
    id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    scenario_id: scenarioId,
    scenario_title: scenarioTitle,
    status,
    winner,
    total_rounds: Number(totalRounds) || 0,
    total_turns: Number(totalTurns) || 0,
    config,
    turns,
    deadlock_event: deadlockEvent,
    created_at: new Date().toISOString(),
  };

  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    local.unshift(newRecord);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(local.slice(0, 50)));
  } catch (err) {
    console.warn('Local history cache error:', err);
  }

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
      if (userId) dbPayload.user_id = userId;

      const { data, error } = await supabase
        .from('simulations')
        .insert(dbPayload)
        .select()
        .single();

      if (!error) {
        return { data: data || newRecord, error: null, isLocal: false };
      }
    } catch (err) {
      console.warn('Failed to save to Supabase:', err);
    }
  } else {
    try {
      const res = await authApi('/api/auth/simulations', {
        method: 'POST',
        body: newRecord,
      });
      return { data: res.data || newRecord, error: null, isLocal: false };
    } catch (err) {
      console.warn('SQLite simulation save warning:', err);
    }
  }

  return { data: newRecord, error: null, isLocal: true };
}

export async function fetchUserSimulations(userId = null) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return { data, error: null, source: 'supabase' };
      }
    } catch (err) {
      console.warn('Supabase query failed:', err);
    }
  } else {
    try {
      const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
      const res = await authApi(`/api/auth/simulations${query}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return { data: res.data, error: null, source: 'sqlite' };
      }
    } catch (err) {
      console.warn('SQLite simulation fetch warning:', err);
    }
  }

  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    return { data: local, error: null, source: 'local' };
  } catch {
    return { data: [], error: null, source: 'local' };
  }
}

export async function deleteSimulationRecord(simulationId) {
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    const filtered = local.filter((item) => item.id !== simulationId);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('simulations').delete().eq('id', simulationId);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  return true;
}
