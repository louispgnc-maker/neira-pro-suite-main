import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import FullCalendar, { EventInput, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
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
  color?: string | null;
  event_type?: string | null;
};

export function SharedCalendar({ role }: { role?: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectInfoRange, setSelectInfoRange] = useState<{ startStr: string; endStr?: string } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const { toast } = useToast();

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
        const mapEvents = (data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end || undefined,
          extendedProps: { description: e.description, owner_id: e.owner_id, event_type: e.event_type },
          backgroundColor: e.color || undefined,
          borderColor: e.color || undefined,
        }));
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
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, (payload) => {
      const evt = payload.record;
      if (!evt) return;
      if (payload.eventType === 'INSERT') {
        setEvents(prev => [{ id: evt.id, title: evt.title, start: evt.start, end: evt.end || undefined, extendedProps: { description: evt.description, owner_id: evt.owner_id }, backgroundColor: evt.color || undefined, borderColor: evt.color || undefined }, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, title: evt.title, start: evt.start, end: evt.end || undefined, extendedProps: { ...p.extendedProps, description: evt.description } } : p));
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
    setFormStart(selectInfo.startStr.slice(0, 16));
    setFormEnd(selectInfo.endStr ? selectInfo.endStr.slice(0, 16) : '');
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
      color: ev.backgroundColor || undefined,
    });
    setFormTitle(ev.title);
    setFormDescription((ev.extendedProps as any)?.description || '');
    setFormStart(ev.startStr.slice(0, 16));
    setFormEnd(ev.endStr ? ev.endStr.slice(0, 16) : '');
    setOpenCreate(true);
  };

  const createEvent = async () => {
    if (!user) return;
    if (!formTitle || !formStart) {
      toast({ title: 'Erreur', description: 'Titre et date de début requis', variant: 'destructive' });
      return;
    }
    try {
      const payload: any = {
        title: formTitle,
        description: formDescription || null,
        start: new Date(formStart).toISOString(),
        end: formEnd ? new Date(formEnd).toISOString() : null,
        owner_id: user.id,
        role: role || null,
        color: generateColorFromString(user.id || 'u'),
        event_type: null,
      };
      const { data, error } = await supabase.from('calendar_events').insert(payload).select().single();
      if (error) throw error;
      setOpenCreate(false);
      setFormTitle(''); setFormDescription(''); setFormStart(''); setFormEnd('');
      toast({ title: 'Événement créé' });
    } catch (e:any) {
      console.error('create event', e);
      toast({ title: 'Erreur', description: e.message || 'Création échouée', variant: 'destructive' });
    }
  };

  const updateEvent = async () => {
    if (!editingEvent) return;
    try {
      const payload: any = {
        title: formTitle,
        description: formDescription || null,
        start: new Date(formStart).toISOString(),
        end: formEnd ? new Date(formEnd).toISOString() : null,
      };
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
      if (error) throw error;
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
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
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
              <Button variant="outline">Nouvel événement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm">Titre</label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">Description</label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full rounded-md border border-input px-3 py-2" />
                  <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full rounded-md border border-input px-3 py-2" />
                </div>
                <div className="flex justify-end gap-2">
                  {editingEvent && (
                    <Button variant="outline" onClick={() => deleteEvent(editingEvent.id)}>Supprimer</Button>
                  )}
                  <Button onClick={() => { if (editingEvent) updateEvent(); else createEvent(); }}>
                    {editingEvent ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-2">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          ref={calendarRef as any}
        />
      </div>
    </div>
  );
}

export default SharedCalendar;
