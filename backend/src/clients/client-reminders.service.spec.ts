import { ClientRemindersService } from './client-reminders.service';

const d = (s: string) => new Date(s);
const client = (over: any) => ({
  id: over.id || 'c1',
  status: 'ACTIVE',
  startedAt: d('2026-10-01T06:00:00Z'),
  user: { telegramId: '111', firstName: 'Анна', tgStatus: 'OK' },
  measurements: [],
  reminders: [],
  ...over,
});
const planFor = async (clients: any[], now: string) => {
  const prisma: any = { clientProfile: { findMany: async () => clients } };
  return new ClientRemindersService(prisma).plan(d(now));
};

describe('ClientRemindersService.plan', () => {
  it('no measurements: nothing on day 1, first reminder from day 2', async () => {
    const c = client({ startedAt: d('2026-11-17T06:00:00Z') });
    expect(await planFor([c], '2026-11-18T06:00:00Z')).toHaveLength(0);
    const p = await planFor([c], '2026-11-19T06:00:00Z');
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ kind: 'ONBOARDING', dueKey: '0' });
    expect(p[0].text).toContain('Здравствуйте, Анна');
  });

  it('no measurements: old client gets steps one at a time with gaps, then stops', async () => {
    const sent = (n: number, lastAt: string) =>
      Array.from({ length: n }, (_, i) => ({ kind: 'ONBOARDING', dueKey: String(n - 1 - i), sentAt: d(lastAt) }));
    // шаг 1 отправлен вчера → второй ещё рано (нужно 3 дня)
    expect(await planFor([client({ reminders: sent(1, '2026-11-17T06:00:00Z') })], '2026-11-18T06:00:00Z')).toHaveLength(0);
    const p = await planFor([client({ reminders: sent(1, '2026-11-15T06:00:00Z') })], '2026-11-18T06:00:00Z');
    expect(p[0]).toMatchObject({ kind: 'ONBOARDING', dueKey: '1' });
    // все 5 отправлены → тишина
    expect(await planFor([client({ reminders: sent(5, '2026-10-01T06:00:00Z') })], '2026-11-18T06:00:00Z')).toHaveLength(0);
  });

  it('monthly: pre (2 days before), day, late — each once per due date', async () => {
    const c = (reminders: any[] = []) =>
      client({ measurements: [{ date: d('2026-10-20T07:00:00Z') }], reminders });
    expect(await planFor([c()], '2026-11-17T06:00:00Z')).toHaveLength(0); // за 3 дня
    const pre = await planFor([c()], '2026-11-18T06:00:00Z');
    expect(pre[0]).toMatchObject({ kind: 'MONTHLY_PRE', dueKey: '2026-11-20' });
    expect(pre[0].text).toContain('20 ноября');
    const preSent = [{ kind: 'MONTHLY_PRE', dueKey: '2026-11-20', sentAt: d('2026-11-18T06:00:00Z') }];
    expect(await planFor([c(preSent)], '2026-11-19T06:00:00Z')).toHaveLength(0);
    const day = await planFor([c(preSent)], '2026-11-20T06:00:00Z');
    expect(day[0].kind).toBe('MONTHLY_DAY');
    const daySent = [...preSent, { kind: 'MONTHLY_DAY', dueKey: '2026-11-20', sentAt: d('2026-11-20T06:00:00Z') }];
    expect(await planFor([c(daySent)], '2026-11-21T06:00:00Z')).toHaveLength(0);
    const late = await planFor([c(daySent)], '2026-11-22T06:00:00Z');
    expect(late[0].kind).toBe('MONTHLY_LATE');
    const all = [...daySent, { kind: 'MONTHLY_LATE', dueKey: '2026-11-20', sentAt: d('2026-11-22T06:00:00Z') }];
    expect(await planFor([c(all)], '2026-12-25T06:00:00Z')).toHaveLength(0);
  });

  it('monthly: new measurement resets the cycle', async () => {
    const c = client({
      measurements: [{ date: d('2026-11-21T07:00:00Z') }],
      reminders: [{ kind: 'MONTHLY_DAY', dueKey: '2026-11-20', sentAt: d('2026-11-20T06:00:00Z') }],
    });
    expect(await planFor([c], '2026-11-22T06:00:00Z')).toHaveLength(0);
    expect((await planFor([c], '2026-12-19T06:00:00Z'))[0]).toMatchObject({ kind: 'MONTHLY_PRE', dueKey: '2026-12-21' });
  });
});
