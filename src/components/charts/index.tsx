import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

/** Small, mobile-safe chart wrappers with a consistent palette. */
const C = { primary: '#2546eb', soft: '#93b4fd', accent: '#0f9d8a', grid: '#e5e9f2', text: '#64748b' };

export function TrendLine({ data, xKey, yKey, unit = '%', height = 200, domain = [0, 100] as [number, number] }: { data: Record<string, unknown>[]; xKey: string; yKey: string; unit?: string; height?: number; domain?: [number, number] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: C.text }} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tick={{ fill: C.text }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => `${v}${unit}`} contentStyle={{ borderRadius: 12, border: `1px solid ${C.grid}` }} />
        <Line type="monotone" dataKey={yKey} stroke={C.primary} strokeWidth={2.5} dot={{ r: 4, fill: C.primary }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, xKey, yKey, height = 200, unit = '' , color = C.primary }: { data: Record<string, unknown>[]; xKey: string; yKey: string; height?: number; unit?: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: C.text }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fill: C.text }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip formatter={(v) => `${v}${unit}`} contentStyle={{ borderRadius: 12, border: `1px solid ${C.grid}` }} cursor={{ fill: '#f5f7fb' }} />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillRadar({ data, height = 240 }: { data: { skill: string; value: number; max: number }[]; height?: number }) {
  const norm = data.map((d) => ({ skill: d.skill, pct: Math.round((d.value / d.max) * 100) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={norm} outerRadius="70%">
        <PolarGrid stroke={C.grid} />
        <PolarAngleAxis dataKey="skill" tick={{ fill: C.text, fontSize: 11 }} />
        <Radar dataKey="pct" stroke={C.primary} fill={C.soft} fillOpacity={0.5} />
        <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: `1px solid ${C.grid}` }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
