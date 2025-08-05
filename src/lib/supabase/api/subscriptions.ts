import { supabase } from '../client';

// Real-time subscriptions (Enhanced for Hierarchical Structure)
export const subscriptions = {
  // Subscribe to tender changes
  subscribeTenders: (callback: (payload: any) => void) => {
    return supabase
      .channel('tenders_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tenders' 
      }, callback)
      .subscribe();
  },

  // Subscribe to client positions changes for a specific tender
  subscribeClientPositions: (tenderId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`client_positions_${tenderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'client_positions',
        filter: `tender_id=eq.${tenderId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to BOQ changes for a specific tender (hierarchical aware)
  subscribeBOQ: (tenderId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`boq_changes_${tenderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'boq_items',
        filter: `tender_id=eq.${tenderId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to BOQ changes for a specific client position
  subscribeBOQByPosition: (clientPositionId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`boq_position_${clientPositionId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'boq_items',
        filter: `client_position_id=eq.${clientPositionId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to complete tender hierarchy changes
  subscribeTenderHierarchy: (tenderId: string, callback: (payload: any) => void) => {
    const channel = supabase.channel(`tender_hierarchy_${tenderId}`);

    // Subscribe to tender changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tenders',
      filter: `id=eq.${tenderId}`
    }, callback);

    // Subscribe to client positions changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'client_positions',
      filter: `tender_id=eq.${tenderId}`
    }, callback);

    // Subscribe to BOQ items changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'boq_items',
      filter: `tender_id=eq.${tenderId}`
    }, callback);

    return channel.subscribe();
  },

  // Subscribe to materials library changes
  subscribeMaterials: (callback: (payload: any) => void) => {
    return supabase
      .channel('materials_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'materials_library' 
      }, callback)
      .subscribe();
  },

  // Subscribe to works library changes
  subscribeWorks: (callback: (payload: any) => void) => {
    return supabase
      .channel('works_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'works_library' 
      }, callback)
      .subscribe();
  },

  // Performance monitoring subscription for hierarchy operations
  subscribeSlowQueries: (callback: (payload: any) => void) => {
    return supabase
      .channel('performance_monitoring')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'slow_queries' 
      }, callback)
      .subscribe();
  },
};