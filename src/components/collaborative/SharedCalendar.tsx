import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import FullCalendar, { EventInput, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
// Note: FullCalendar styles can be imported globally if desired. Omitted here to avoid bundler CSS resolution issues in some environments.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end?: string | null;
  all_day?: boolean;
  owner_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  color?: string | null;
  event_type?: string | null;
};

export function SharedCalendar({ role, members, isCabinetOwner }: { role?: string; members?: Array<{ id: string; nom?: string; email?: string }>; isCabinetOwner?: boolean }) {
  const { user } = useAuth();
  const isNotaire = role === 'notaire';
  const mainButtonClass = isNotaire
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const calendarRoleClass = isNotaire ? 'fc-notaire' : 'fc-avocat';
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectInfoRange, setSelectInfoRange] = useState<{ startStr: string; endStr?: string } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  // split date/time so time becomes optional
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const { toast } = useToast();

  const addDaysToYMD = (ymd: string, days: number) => {
    const [y, m, d] = ymd.split('-').map((n: string) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const renderEventContent = (arg: any) => {
    const isAllDay = Boolean((arg.event?.extendedProps as any)?.all_day);
    const timeText = arg.timeText || '';
    const hideTime = isAllDay || timeText === '00:00' || timeText === '00:00:00';
    return (
      <div className="flex items-center gap-2">
        {!hideTime && <span className="text-xs text-muted-foreground mr-1">{timeText}</span>}
        <span className="truncate">{arg.event.title}</span>
      </div>
    );
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        let query = supabase.from('calendar_events').select('*');
        if (role) query = query.eq('role', role as any);
        const { data, error } = await query.order('start', { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        // Map events and then fetch owner profiles to display creator name/email
        const rawEvents = (data || []).map((e: any) => ({
          source: e,
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end_at || undefined,
          owner_id: e.owner_id,
          description: e.description,
          color: e.color,
          event_type: e.event_type,
        }));

        // Collect owner ids and fetch profiles
        const ownerIds = Array.from(new Set(rawEvents.map((r: any) => r.owner_id).filter(Boolean)));
        let profilesMap: Record<string, any> = {};
        if (ownerIds.length > 0) {
          try {
            const { data: profiles } = await supabase.from('profiles').select('id, nom, full_name, email').in('id', ownerIds as any[]);
            if (Array.isArray(profiles)) {
              profilesMap = profiles.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {} as any);
            }
          } catch (err) {
            // ignore profile fetch errors; we'll fallback to owner_id
            profilesMap = {};
          }
        }


        const mapEvents = rawEvents.map((r: any) => {
          const ownerKey = r.owner_id || r.id;
          const color = r.color || generateColorFromString(String(ownerKey));
          const ownerProfile = r.owner_id ? profilesMap[r.owner_id] : null;
          const owner_name = ownerProfile ? (ownerProfile.nom || ownerProfile.full_name || ownerProfile.email || ownerProfile.id) : (r.owner_id || null);
          const owner_email = ownerProfile ? ownerProfile.email || null : null;
          const allDay = Boolean(r.source?.all_day || r.source?.allDay || false);
          // If event is all-day, FullCalendar expects an exclusive end date. Our DB stores end_at as inclusive (23:59:59), so add 1 day for display.
          let displayStart: any = r.start;
          let displayEnd: any = r.end || undefined;
          if (allDay) {
            // use YYYY-MM-DD for start
            if (r.start) displayStart = (r.start as string).slice(0, 10);
            if (r.end) {
              const endYmd = (r.end as string).slice(0, 10);
              displayEnd = addDaysToYMD(endYmd, 1);
            }
          }
          return ({
            id: r.id,
            title: r.title,
            start: displayStart,
            end: displayEnd,
            allDay,
            extendedProps: { description: r.description, owner_id: r.owner_id, owner_name, owner_email, event_type: r.event_type, all_day: allDay },
            backgroundColor: color,
            borderColor: color,
          });
        });
        setEvents(mapEvents);
      } catch (e) {
        console.error('load calendar events', e);
        toast({ title: 'Erreur', description: 'Impossible de charger le calendrier', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();

    // realtime subscription
    const channel = supabase.channel('public:calendar_events');
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, async (payload) => {
      const evt = payload.record;
      if (!evt) return;
      if (payload.eventType === 'INSERT') {
        const ownerKey = evt.owner_id || evt.id;
        const color = evt.color || generateColorFromString(String(ownerKey));
              // try to fetch owner profile for the inserted row
              let owner_name = evt.owner_id || null;
              let owner_email = null;
              if (evt.owner_id) {
                try {
                  const { data: p } = await supabase.from('profiles').select('id, nom, full_name, email').eq('id', evt.owner_id).maybeSingle();
                  if (p) {
                    owner_name = p.nom || p.full_name || p.email || p.id;
                    owner_email = p.email || null;
                  }
                } catch (e) {
                  // ignore
                }
              }
              // compute display start/end for realtime-insert
              const insertedAllDay = Boolean(evt.all_day || evt.allDay || false);
              let iStart: any = evt.start;
              let iEnd: any = evt.end_at || undefined;
              if (insertedAllDay) {
                if (evt.start) iStart = (evt.start as string).slice(0, 10);
                if (evt.end_at) iEnd = addDaysToYMD((evt.end_at as string).slice(0, 10), 1);
              }
              setEvents(prev => [{ id: evt.id, title: evt.title, start: iStart, end: iEnd, allDay: insertedAllDay, extendedProps: { description: evt.description, owner_id: evt.owner_id, owner_name, owner_email, all_day: insertedAllDay }, backgroundColor: color, borderColor: color }, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        const ownerKey = payload.record?.owner_id || payload.record?.id;
        const color = payload.record?.color || generateColorFromString(String(ownerKey));
              // Update owner display if changed
              let owner_name = payload.record?.owner_id || null;
              let owner_email = null;
              if (payload.record?.owner_id) {
                try {
                  const { data: p } = await supabase.from('profiles').select('id, nom, full_name, email').eq('id', payload.record.owner_id).maybeSingle();
                  if (p) {
                    owner_name = p.nom || p.full_name || p.email || p.id;
                    owner_email = p.email || null;
                  }
                } catch (e) { /* noop */ }
              }
              // compute display start/end for update
              const updatedAllDay = Boolean(payload.record?.all_day || payload.record?.allDay || false);
              let uStart: any = evt.start;
              let uEnd: any = evt.end_at || undefined;
              if (updatedAllDay) {
                if (evt.start) uStart = (evt.start as string).slice(0, 10);
                if (evt.end_at) uEnd = addDaysToYMD((evt.end_at as string).slice(0, 10), 1);
              }
              setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, title: evt.title, start: uStart, end: uEnd, allDay: updatedAllDay, extendedProps: { ...p.extendedProps, description: evt.description, owner_name, owner_email, all_day: updatedAllDay }, backgroundColor: color, borderColor: color } : p));
      } else if (payload.eventType === 'DELETE') {
        setEvents(prev => prev.filter(p => p.id !== payload.old.id));
      }
    }).subscribe();

    return () => {
      mounted = false;
      try { channel.unsubscribe(); } catch (e) { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectInfoRange({ startStr: selectInfo.startStr, endStr: selectInfo.endStr || undefined });
    // Pre-fill date/time fields; startStr is like 2025-11-11T12:00:00
    const s = selectInfo.startStr;
    const e = selectInfo.endStr || '';
    const isAllDay = (selectInfo as any).allDay === true;
    setFormStartDate(s.slice(0, 10));
    if (isAllDay) {
      // FullCalendar provides exclusive end for all-day selections -> subtract one day for the form
      if (e) {
        const endYmd = e.slice(0, 10);
        setFormEndDate(addDaysToYMD(endYmd, -1));
      } else {
        setFormEndDate('');
      }
      setFormStartTime('');
      setFormEndTime('');
    } else {
      setFormStartTime(s.length > 10 ? s.slice(11, 16) : '');
      if (e) {
        setFormEndDate(e.slice(0, 10));
        setFormEndTime(e.length > 10 ? e.slice(11, 16) : '');
      } else {
        setFormEndDate(''); setFormEndTime('');
      }
    }
    setOpenCreate(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const ev = clickInfo.event;
    setEditingEvent({
      id: ev.id,
      title: ev.title,
      description: (ev.extendedProps as any)?.description || '',
      start: ev.startStr,
      end: ev.endStr || undefined,
      owner_id: (ev.extendedProps as any)?.owner_id,
      owner_name: (ev.extendedProps as any)?.owner_name || null,
      owner_email: (ev.extendedProps as any)?.owner_email || null,
      color: ev.backgroundColor || undefined,
    });
    setFormTitle(ev.title);
    setFormDescription((ev.extendedProps as any)?.description || '');
    // split start/end into date + optional time
    const s = ev.startStr || '';
    const e = ev.endStr || '';
    setFormStartDate(s.slice(0, 10));
    setFormStartTime(s.length > 10 ? s.slice(11, 16) : '');
    setFormEndDate(e ? e.slice(0, 10) : '');
    setFormEndTime(e && e.length > 10 ? e.slice(11, 16) : '');
    setOpenCreate(true);
  };

  const createEvent = async () => {
    if (!user) return;
    if (!formTitle || !formStartDate) {
      toast({ title: 'Erreur', description: 'Titre et date de début requis', variant: 'destructive' });
      return;
    }
    try {
      // combine date + optional time; if no time provided, use 00:00 and mark all_day
      const all_day = !formStartTime;
      // store pure date strings for all-day events
      const startIso = (() => {
        if (all_day) return formStartDate; // store as date only
        return new Date(`${formStartDate}T${formStartTime}:00`).toISOString();
      })();
      const endIso = (() => {
        if (!formEndDate) return null;
        if (all_day) return formEndDate; // store as date only (inclusive)
        return new Date(`${formEndDate}T${formEndTime}:00`).toISOString();
      })();

      const payload: any = {
        title: formTitle,
        description: formDescription || null,
        start: startIso,
        end_at: endIso,
        all_day: all_day,
        owner_id: user.id,
        role: role || null,
        color: generateColorFromString(user.id || 'u'),
        event_type: null,
      };
      const { data, error } = await supabase.from('calendar_events').insert(payload).select().single();
      if (error) throw error;
      setOpenCreate(false);
      setFormTitle(''); setFormDescription(''); setFormStartDate(''); setFormStartTime(''); setFormEndDate(''); setFormEndTime('');
      // Optimistically update UI with returned event
      if (data) {
        const ownerKey = data.owner_id || data.id;
        const color = data.color || generateColorFromString(String(ownerKey));
        // compute display start/end for optimistic UI
        const isAllDay = Boolean(data.all_day || data.allDay || false);
        let dispStart: any = data.start;
        let dispEnd: any = data.end_at || undefined;
        if (isAllDay) {
          dispStart = (data.start || '').slice(0, 10);
          if (data.end_at) dispEnd = addDaysToYMD((data.end_at || '').slice(0, 10), 1);
        }
        const newEvt = {
          id: data.id,
          title: data.title,
          start: dispStart,
          end: dispEnd,
          allDay: isAllDay,
          extendedProps: { description: data.description, owner_id: data.owner_id, owner_name: data.owner_name || null, owner_email: data.owner_email || null, all_day: isAllDay },
          backgroundColor: color,
          borderColor: color,
        };
        setEvents(prev => [newEvt, ...prev]);
      }
      toast({ title: 'Événement créé' });
    } catch (e:any) {
      console.error('create event', e);
      toast({ title: 'Erreur', description: e.message || 'Création échouée', variant: 'destructive' });
    }
  };

  const updateEvent = async () => {
    if (!editingEvent) return;
    try {
      const all_day = !formStartTime;
      const startIso = all_day ? formStartDate : new Date(`${formStartDate}T${formStartTime}:00`).toISOString();
      const endIso = (() => {
        if (!formEndDate) return null;
        return all_day ? formEndDate : new Date(`${formEndDate}T${formEndTime}:00`).toISOString();
      })();

      const payload: any = {
        title: formTitle,
        description: formDescription || null,
        start: startIso,
        end_at: endIso,
        all_day: all_day,
      };
      const { data: updated, error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id).select().single();
      if (error) throw error;
      // update local state using returned row if available
      if (updated) {
        // compute display values for all-day
        const isAllDay = Boolean(updated.all_day || updated.allDay || false);
        let dispStart: any = updated.start;
        let dispEnd: any = updated.end_at || undefined;
        if (isAllDay) {
          dispStart = (updated.start || '').slice(0, 10);
          if (updated.end_at) dispEnd = addDaysToYMD((updated.end_at || '').slice(0, 10), 1);
        }
        setEvents(prev => prev.map(p => p.id === updated.id ? { ...p, title: updated.title, start: dispStart, end: dispEnd, allDay: isAllDay, extendedProps: { ...((p as any).extendedProps || {}), description: updated.description, all_day: isAllDay } } : p));
      }
      setEditingEvent(null);
      setOpenCreate(false);
      toast({ title: 'Événement mis à jour' });
    } catch (e:any) {
      console.error('update event', e);
      toast({ title: 'Erreur', description: e.message || 'Mise à jour échouée', variant: 'destructive' });
    }
  };

  const deleteEvent = async (id?: string) => {
    if (!id) return;
    // permission: only owner or cabinet owner can delete
    if (editingEvent && user && editingEvent.owner_id && editingEvent.owner_id !== user.id && !isCabinetOwner) {
      toast({ title: 'Non autorisé', description: 'Vous ne pouvez pas supprimer cet événement', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
      // remove from local UI immediately
      setEvents(prev => prev.filter(p => p.id !== id));
      setEditingEvent(null);
      setOpenCreate(false);
      toast({ title: 'Événement supprimé' });
    } catch (e:any) {
      console.error('delete event', e);
      toast({ title: 'Erreur', description: e.message || 'Suppression échouée', variant: 'destructive' });
    }
  };

  function generateColorFromString(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    const hue = Math.abs(h) % 360;
    return `hsl(${hue} 70% 55%)`;
  }

  return (
    <div>
  <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Calendrier partagé</h3>
          <p className="text-sm text-muted-foreground">Jour / semaine / mois — temps réel pour tous les membres</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className={mainButtonClass}>Nouvel événement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
              </DialogHeader>
              {editingEvent && (
                <div className="text-sm text-muted-foreground mb-2">
                  <p>Créé par : <strong>{editingEvent.owner_name || editingEvent.owner_id || '—'}</strong>{editingEvent.owner_email ? ` (${editingEvent.owner_email})` : ''}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Titre</label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full" />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm mb-1">Description</label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">Date début</label>
                    <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full rounded-md border border-input px-3 py-2" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">Heure (optionnel)</label>
                    <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="w-full rounded-md border border-input px-3 py-2" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">Date fin (optionnel)</label>
                    <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="w-full rounded-md border border-input px-3 py-2" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">Heure fin (optionnel)</label>
                    <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} className="w-full rounded-md border border-input px-3 py-2" />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {editingEvent && user && (editingEvent.owner_id === user.id || isCabinetOwner) && (
                    <Button className={`${mainButtonClass} mr-2`} onClick={() => deleteEvent(editingEvent.id)}>
                      Supprimer
                    </Button>
                  )}
                  <Button className={mainButtonClass} onClick={() => { if (editingEvent) updateEvent(); else createEvent(); }}>
                    {editingEvent ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend: color per member (if provided) */}
      {members && members.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span style={{ backgroundColor: generateColorFromString(m.id) }} className="w-4 h-4 rounded" />
              <span className="text-sm text-muted-foreground">{m.nom || m.email || m.id.substring(0,6)}</span>
            </div>
          ))}
        </div>
      )}

      {/* role-based calendar styling */}
          <div>
            <style>{`
              .${calendarRoleClass} .fc-button,
              .${calendarRoleClass} .fc-button-primary {
                color: white !important;
              }
              .${calendarRoleClass} .fc-button {
                background: ${isNotaire ? '#ea580c' : '#2563eb'} !important;
                border-color: ${isNotaire ? '#f97316' : '#3b82f6'} !important;
              }
              .${calendarRoleClass} .fc-button:hover {
                background: ${isNotaire ? '#c2410c' : '#1e40af'} !important;
              }
              .${calendarRoleClass} .fc-button:disabled {
                opacity: 0.6;
              }
            `}</style>
            <div className={`${calendarRoleClass} bg-white rounded-lg border p-2`}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                locales={[frLocale]}
                locale="fr"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine', day: 'Jour', list: 'Liste' }}
                selectable={true}
                selectMirror={true}
                select={handleDateSelect}
                events={events}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                height="auto"
                ref={calendarRef as any}
              />
            </div>
          </div>
    </div>
  );
}

export default SharedCalendar;
