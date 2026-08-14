"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Play,
  Square,
  ShieldCheck,
  Activity,
  Zap,
  RotateCcw,
  ScrollText,
  DatabaseZap,
  Inbox,
  Loader2,
  Send,
  Pause,
  PhoneCall,
  Rocket,
  BadgeCheck,
  Cable,
  KeyRound,
  Package,
} from "lucide-react";
import { ENTITY_MAP, EntityDef, FieldDef } from "@/lib/entities";
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  ConfirmDialog,
  EmptyState,
  Field,
  IconBtn,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Switch,
  Textarea,
  Toasts,
  cn,
  formatDate,
  isDateLike,
  useToasts,
} from "./ui";

const ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  Play,
  Square,
  ShieldCheck,
  Activity,
  Zap,
  RotateCcw,
  ScrollText,
  DatabaseZap,
  RefreshCw,
  Send,
  Pause,
  PhoneCall,
  Rocket,
  BadgeCheck,
  Cable,
  KeyRound,
  Package,
};

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export default function EntityManager({
  entityKey,
  embedded = false,
  limit,
}: {
  entityKey: string;
  embedded?: boolean;
  limit?: number;
}) {
  const entity = ENTITY_MAP[entityKey];
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [logsText, setLogsText] = useState("");
  const [logsTitle, setLogsTitle] = useState("");
  const [logsOpen, setLogsOpen] = useState(false);
  const [optionsCache, setOptionsCache] = useState<Record<string, any[]>>({});
  const { toasts, push, dismiss } = useToasts();

  const sort = entity.sort || "createdAt:desc";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api(`/api/data/${entityKey}?sort=${sort.split(":")[0]}&order=${sort.split(":")[1] || "asc"}`);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [entityKey, sort, push]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey]);

  useEffect(() => {
    const needs: string[] = entity.fields.filter((f) => f.optionsFrom).map((f) => f.optionsFrom!);
    for (const n of needs) {
      if (!optionsCache[n]) {
        api(`/api/data/${n}?sort=id&order=asc`)
          .then((rows) => setOptionsCache((c) => ({ ...c, [n]: Array.isArray(rows) ? rows : [] })))
          .catch(() => undefined);
      }
    }
  }, [entity, optionsCache]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((it) =>
      entity.listFields.some((f) => String(it[f] ?? "").toLowerCase().includes(q))
    );
  }, [items, search, entity]);

  const list = limit ? filtered.slice(0, limit) : filtered;

  const openCreate = () => {
    setEditing(null);
    setForm(entity.defaultValues || {});
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    const f: Record<string, unknown> = {};
    for (const fd of entity.fields) f[fd.key] = item[fd.key];
    setEditing(item);
    setForm(f);
    setFormError("");
    setModalOpen(true);
  };

  const setField = (key: string, v: unknown) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    for (const fd of entity.fields) {
      if (fd.required && (form[fd.key] === undefined || form[fd.key] === null || form[fd.key] === "")) {
        setFormError(`"${fd.label}" is required`);
        return;
      }
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api(`/api/data/${entityKey}/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: form }),
        });
        push(`${entity.singular} updated`);
      } else {
        await api(`/api/data/${entityKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: form }),
        });
        push(`${entity.singular} created`);
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/data/${entityKey}/${deleting.id}`, { method: "DELETE" });
      push(`${entity.singular} deleted`);
      setDeleting(null);
      load();
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const runAction = async (item: any, actionKey: string) => {
    setActionBusy(actionKey);
    try {
      const res = await api("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionKey, id: item.id, entity: entityKey }),
      });
      if (res.records || res.logs) {
        setLogsTitle(res.title || `${item.name} — details`);
        setLogsText(res.records || res.logs);
        setLogsOpen(true);
      } else if (actionKey === "site.health") {
        push(res.message, res.reachable ? "ok" : "error");
      } else {
        push(res.message || "Done");
      }
      load();
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setActionBusy(null);
    }
  };

  const labelFor = (fd: FieldDef, value: unknown): string => {
    if (fd.optionsFrom) {
      const opts = optionsCache[fd.optionsFrom] || [];
      const found = opts.find((o) => String(o[fd.valueField || "id"]) === String(value));
      if (found) return String(found[fd.labelField || "name"]);
      return String(value ?? "—");
    }
    if (fd.options) {
      const o = fd.options.find((x) => x.value === value);
      return o ? o.label : String(value ?? "—");
    }
    if (fd.type === "switch") return value ? "Yes" : "No";
    if (isDateLike(value)) return formatDate(value);
    return value === null || value === undefined || value === "" ? "—" : String(value);
  };

  const badgeFor = (item: any) => {
    if (!entity.badge) return null;
    const v = String(item[entity.badge.field]);
    const b = entity.badge.map[v];
    if (!b) return null;
    return <Badge label={b.label} cls={b.cls} />;
  };

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
            {entity.listFields.map((f) => {
              const fd = entity.fields.find((x) => x.key === f);
              return <th key={f} className="px-3 py-2.5 font-medium">{fd?.label || f}</th>;
            })}
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
              {entity.listFields.map((f) => {
                const fd = entity.fields.find((x) => x.key === f);
                const val = item[f];
                return (
                  <td key={f} className={cn("px-3 py-2.5 text-zinc-300", f === "domain" || f === "name" || f === "username" ? "font-medium text-zinc-100" : "")}>
                    {fd?.type === "switch" ? (
                      <span className={val ? "text-emerald-400" : "text-zinc-600"}>{val ? "●" : "○"}</span>
                    ) : (
                      labelFor(fd!, val)
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2.5">{badgeFor(item) || <span className="text-zinc-600">—</span>}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-0.5">
                  {entity.rowActions?.map((a) => {
                    const Icon = ICONS[a.icon] || Zap;
                    return (
                      <IconBtn key={a.key} title={a.label} disabled={actionBusy !== null} onClick={() => runAction(item, a.key)}>
                        {actionBusy === a.key ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                      </IconBtn>
                    );
                  })}
                  <IconBtn title="Edit" onClick={() => openEdit(item)}>
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn title="Delete" onClick={() => setDeleting(item)} className="hover:text-rose-400">
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {!embedded && (
        <PageHeader
          title={entity.plural}
          subtitle={entity.description}
          actions={
            <Button onClick={openCreate}>
              <Plus size={15} /> New {entity.singular}
            </Button>
          }
        />
      )}

      <div className={cn(!embedded && "mt-6")}>
        <Card
          title={
            <div className="flex items-center gap-3">
              <span>{embedded ? `${entity.plural}` : ""}</span>
            </div>
          }
          actions={
            embedded ? (
              <Button variant="ghost" onClick={openCreate} className="px-2.5 py-1.5 text-xs">
                <Plus size={13} /> Add
              </Button>
            ) : undefined
          }
          pad={false}
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${entity.plural.toLowerCase()}…`}
                className="pl-8"
              />
            </div>
            <span className="text-xs text-zinc-600">
              {filtered.length} of {items.length}
            </span>
            <IconBtn title="Refresh" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </IconBtn>
            {!embedded && (
              <Button onClick={openCreate} className="ml-auto">
                <Plus size={15} /> New {entity.singular}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<Inbox size={30} />}
              title={search ? "No matches" : `No ${entity.plural.toLowerCase()} yet`}
              hint={search ? "Try a different search term." : `Click "New ${entity.singular}" to create the first one.`}
            />
          ) : (
            table
          )}
        </Card>
      </div>

      {/* create / edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? "Edit" : "Create"} ${entity.singular}`} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {entity.fields.map((fd) => (
            <div key={fd.key} className={cn(fd.col === 2 ? "col-span-2" : "")}>
              <FormField fd={fd} value={form[fd.key]} onChange={(v) => setField(fd.key, v)} optionsCache={optionsCache} />
            </div>
          ))}
        </div>
        {formError && <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{formError}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editing ? "Save changes" : `Create ${entity.singular}`}
          </Button>
        </div>
      </Modal>

      {/* logs modal */}
      <Modal open={logsOpen} onClose={() => setLogsOpen(false)} title={logsTitle} width="max-w-2xl">
        <CodeBlock text={logsText} className="max-h-[50vh]" />
      </Modal>

      {/* delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${entity.singular}?`}
        message={
          <>
            This will permanently remove{" "}
            <b className="text-zinc-200">{deleting ? labelFor(entity.fields[0], deleting[entity.fields[0].key]) : ""}</b>.
            This action cannot be undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={doDelete}
        onCancel={() => setDeleting(null)}
      />

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function FormField({
  fd,
  value,
  onChange,
  optionsCache,
}: {
  fd: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  optionsCache: Record<string, any[]>;
}) {
  if (fd.type === "readonly") {
    return (
      <Field label={fd.label}>
        <div className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-sm text-zinc-500">
          {isDateLike(value) ? formatDate(value) : value === null || value === undefined || value === "" ? "—" : String(value)}
        </div>
      </Field>
    );
  }
  if (fd.type === "switch") {
    return (
      <Field label={fd.label}>
        <div className="flex h-9 items-center">
          <Switch checked={!!value} onChange={onChange} />
        </div>
      </Field>
    );
  }
  if (fd.type === "textarea") {
    return (
      <Field label={fd.label} required={fd.required}>
        <Textarea rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={fd.placeholder} />
      </Field>
    );
  }
  if (fd.type === "select") {
    const opts = fd.optionsFrom ? optionsCache[fd.optionsFrom] || [] : fd.options || [];
    const options = fd.optionsFrom
      ? opts.map((o) => ({ value: String(o[fd.valueField || "id"]), label: String(o[fd.labelField || "name"]) }))
      : opts;
    return (
      <Field label={fd.label} required={fd.required}>
        <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (fd.type === "number") {
    return (
      <Field label={fd.label} required={fd.required}>
        <Input
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={fd.placeholder}
        />
      </Field>
    );
  }
  return (
    <Field label={fd.label} required={fd.required}>
      <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={fd.placeholder} />
    </Field>
  );
}
