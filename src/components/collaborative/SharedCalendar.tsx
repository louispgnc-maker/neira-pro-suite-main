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

  const renderEventContent = (arg: { event?: EventApi; timeText?: string }) => {
    const isAllDay = Boolean((arg.event?.extendedProps as Record<string, unknown>)?.['all_day']);
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
    if (role) query = query.eq('role', role);
    const { data, error } = await query.order('start', { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        // Map events and then fetch owner profiles to display creator name/email
        const rawData = Array.isArray(data) ? (data as unknown[]) : [];
        const rawEvents = rawData.map((e) => {
          const row = e as Record<string, unknown>;
          return {
            source: row,
            id: String(row['id'] ?? ''),
            title: String(row['title'] ?? ''),
            start: String(row['start'] ?? ''),
            end: row['end_at'] ? String(row['end_at']) : undefined,
            owner_id: row['owner_id'] ? String(row['owner_id']) : undefined,
            description: row['description'] ? String(row['description']) : undefined,
            color: row['color'] ? String(row['color']) : undefined,
            event_type: row['event_type'] ? String(row['event_type']) : undefined,
          };
        });

        // Collect owner ids and fetch profiles
        const ownerIds = Array.from(new Set(rawEvents.map((r) => r.owner_id).filter(Boolean) as string[]));
        let profilesMap: Record<string, Record<string, unknown>> = {};
        if (ownerIds.length > 0) {
          try {
            const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', ownerIds as string[]);
            if (Array.isArray(profiles)) {
              profilesMap = (profiles as unknown[]).reduce((acc, p) => {
                const rp = p as Record<string, unknown>;
                const id = String(rp['id'] ?? '');
                acc[id] = rp;
                return acc;
              }, {} as Record<string, Record<string, unknown>>);
            }
          } catch (err) {
            // ignore profile fetch errors; we'll fallback to owner_id
            profilesMap = {};
          }
        }


        const mapEvents = rawEvents.map((r) => {
          const ownerKey = r.owner_id || r.id;
          const color = r.color || generateColorFromString(String(ownerKey));
          const ownerProfile = r.owner_id ? profilesMap[String(r.owner_id)] : null;
          const firstName = ownerProfile?.['first_name'] ? String(ownerProfile['first_name']) : '';
          const lastName = ownerProfile?.['last_name'] ? String(ownerProfile['last_name']) : '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ');
          const owner_name = ownerProfile ? (fullName || String(ownerProfile['email'] ?? ownerProfile['id'])) : (r.owner_id ?? null);
          const owner_email = ownerProfile ? (ownerProfile['email'] ? String(ownerProfile['email']) : null) : null;
          const src = r.source as Record<string, unknown> | undefined;
          const allDay = Boolean(src?.['all_day'] ?? src?.['allDay'] ?? false);
          // If event is all-day, FullCalendar expects an exclusive end date. Our DB stores end_at as inclusive (23:59:59), so add 1 day for display.
          let displayStart: string | undefined = r.start || undefined;
          let displayEnd: string | undefined = r.end || undefined;
          if (allDay) {
            // use YYYY-MM-DD for start
            if (r.start) displayStart = String(r.start).slice(0, 10);
            if (r.end) {
              const endYmd = String(r.end).slice(0, 10);
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
      } catch (e: unknown) {
        console.error('load calendar events', e);
        const message = e instanceof Error ? e.message : String(e ?? 'Impossible de charger le calendrier');
        toast({ title: 'Erreur', description: message, variant: 'destructive' });
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
                  const { data: p } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', evt.owner_id).maybeSingle();
                  if (p) {
                    const rp = p as Record<string, unknown>;
                    const fName = rp['first_name'] ? String(rp['first_name']) : '';
                    const lName = rp['last_name'] ? String(rp['last_name']) : '';
                    const fullN = [fName, lName].filter(Boolean).join(' ');
                    owner_name = fullN || String(rp['email'] ?? rp['id']);
                    owner_email = rp['email'] ? String(rp['email']) : null;
                  }
                } catch (_e: unknown) {
                  // ignore
                }
              }
              // compute display start/end for realtime-insert
              const insertedAllDay = Boolean(evt.all_day || evt.allDay || false);
              let iStart: string | undefined = evt.start;
              let iEnd: string | undefined = evt.end_at || undefined;
                if (insertedAllDay) {
                if (evt.start) iStart = String(evt.start).slice(0, 10);
                if (evt.end_at) iEnd = addDaysToYMD(String(evt.end_at).slice(0, 10), 1);
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
                  const { data: p } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', payload.record.owner_id).maybeSingle();
                  if (p) {
                    const rp = p as Record<string, unknown>;
                    const fName = rp['first_name'] ? String(rp['first_name']) : '';
                    const lName = rp['last_name'] ? String(rp['last_name']) : '';
                    const fullN = [fName, lName].filter(Boolean).join(' ');
                    owner_name = fullN || String(rp['email'] ?? rp['id']);
                    owner_email = rp['email'] ? String(rp['email']) : null;
                  }
                } catch (_e: unknown) { /* noop */ }
              }
              // compute display start/end for update
              const updatedAllDay = Boolean(payload.record?.all_day || payload.record?.allDay || false);
              let uStart: string | undefined = evt.start;
              let uEnd: string | undefined = evt.end_at || undefined;
                if (updatedAllDay) {
                if (evt.start) uStart = String(evt.start).slice(0, 10);
                if (evt.end_at) uEnd = addDaysToYMD(String(evt.end_at).slice(0, 10), 1);
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
  }, [role, toast]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectInfoRange({ startStr: selectInfo.startStr, endStr: selectInfo.endStr || undefined });
    // Pre-fill date/time fields; startStr is like 2025-11-11T12:00:00
    const s = selectInfo.startStr;
    const e = selectInfo.endStr || '';
  const isAllDay = (selectInfo as unknown as { allDay?: boolean }).allDay === true;
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
      description: (ev.extendedProps as Record<string, unknown>)['description'] ? String((ev.extendedProps as Record<string, unknown>)['description']) : '',
      start: ev.startStr,
      end: ev.endStr || undefined,
      owner_id: (ev.extendedProps as Record<string, unknown>)['owner_id'] ? String((ev.extendedProps as Record<string, unknown>)['owner_id']) : undefined,
      owner_name: (ev.extendedProps as Record<string, unknown>)['owner_name'] ? String((ev.extendedProps as Record<string, unknown>)['owner_name']) : null,
      owner_email: (ev.extendedProps as Record<string, unknown>)['owner_email'] ? String((ev.extendedProps as Record<string, unknown>)['owner_email']) : null,
      color: ev.backgroundColor || undefined,
    });
    setFormTitle(ev.title);
  setFormDescription(((ev.extendedProps as Record<string, unknown>)['description']) ? String((ev.extendedProps as Record<string, unknown>)['description']) : '');
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

      const payload: Record<string, unknown> = {
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
        const dataRec = data as Record<string, unknown>;
        let dispStart: string | undefined = dataRec['start'] ? String(dataRec['start']) : undefined;
        let dispEnd: string | undefined = dataRec['end_at'] ? String(dataRec['end_at']) : undefined;
        if (isAllDay) {
          dispStart = String(dataRec['start'] || '').slice(0, 10) || undefined;
          if (dataRec['end_at']) dispEnd = addDaysToYMD(String(dataRec['end_at']).slice(0, 10), 1);
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
    } catch (e: unknown) {
      console.error('create event', e);
      const message = e instanceof Error ? e.message : String(e ?? 'Création échouée');
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
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

      const payload: Record<string, unknown> = {
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
        const updatedRec = updated as Record<string, unknown>;
        let dispStart: string | undefined = updatedRec['start'] ? String(updatedRec['start']) : undefined;
        let dispEnd: string | undefined = updatedRec['end_at'] ? String(updatedRec['end_at']) : undefined;
        if (isAllDay) {
          dispStart = String(updatedRec['start'] || '').slice(0, 10) || undefined;
          if (updatedRec['end_at']) dispEnd = addDaysToYMD(String(updatedRec['end_at']).slice(0, 10), 1);
        }
        setEvents(prev => prev.map(p => p.id === updated.id ? { ...p, title: updated.title, start: dispStart, end: dispEnd, allDay: isAllDay, extendedProps: { ...(((p as EventInput).extendedProps as Record<string, unknown>) || {}), description: updated.description, all_day: isAllDay } } : p));
      }
      setEditingEvent(null);
      setOpenCreate(false);
      toast({ title: 'Événement mis à jour' });
    } catch (e: unknown) {
      console.error('update event', e);
      const message = e instanceof Error ? e.message : String(e ?? 'Mise à jour échouée');
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
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
    } catch (e: unknown) {
      console.error('delete event', e);
      const message = e instanceof Error ? e.message : String(e ?? 'Suppression échouée');
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
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
                  {editingEvent && user && (editingEvent.owner_id === user.id || isCabinetOwner || role === 'Fondateur' || role === 'Associé') && (
                    <Button className={`${mainButtonClass} mr-2`} onClick={() => deleteEvent(editingEvent.id)}>
                      Supprimer
                    </Button>
                  )}
                  <Button 
                    className={mainButtonClass} 
                    onClick={() => { if (editingEvent) updateEvent(); else createEvent(); }}
                    disabled={editingEvent && user && editingEvent.owner_id !== user.id && !isCabinetOwner && role !== 'Fondateur' && role !== 'Associé'}
                  >
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
                ref={(el) => { calendarRef.current = el as unknown as FullCalendar | null; }}
              />
            </div>
          </div>
    </div>
  );
}

export default SharedCalendar;
