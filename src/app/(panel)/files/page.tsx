"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Folder,
  File,
  FileCode,
  FileImage,
  Upload,
  FolderPlus,
  FilePlus2,
  Pencil,
  Trash2,
  Home,
  ChevronRight,
  RefreshCw,
  KeyRound,
  Download,
  Eye,
  Loader2,
  HardDrive,
} from "lucide-react";
import {
  Button,
  Card,
  CodeBlock,
  ConfirmDialog,
  Field,
  IconBtn,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Toasts,
  formatBytes,
  formatDate,
  useToasts,
} from "@/components/panel/ui";

interface Entry {
  name: string;
  dir: boolean;
  symlink: boolean;
  size: number;
  mode: string;
  mtime: number;
}

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function FilesPage() {
  const [path, setPath] = useState("/www/wwwroot");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [content, setContent] = useState("");
  const [contentBusy, setContentBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [preview, setPreview] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"file" | "dir" | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [renaming, setRenaming] = useState<Entry | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const [chmodding, setChmodding] = useState<Entry | null>(null);
  const [chmodMode, setChmodMode] = useState("755");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/files?path=${encodeURIComponent(p)}`);
      setPath(data.path);
      setEntries(data.entries || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("/www/wwwroot");
  }, [load]);

  const openEntry = async (e: Entry) => {
    if (e.dir) {
      load(`${path === "/" ? "" : path}/${e.name}`);
      return;
    }
    const ext = e.name.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext)) {
      setPreview(e);
      return;
    }
    setEditing(e);
    setContent("");
    setContentBusy(true);
    try {
      const data = await api(`/api/files?path=${encodeURIComponent(`${path === "/" ? "" : path}/${e.name}`)}&op=read`);
      setContent(data.content || "");
    } catch (err: any) {
      setContent(`// ${err.message}`);
    } finally {
      setContentBusy(false);
    }
  };

  const full = (name: string) => `${path === "/" ? "" : path}/${name}`;

  const save = async () => {
    if (!editing) return;
    setSaveBusy(true);
    try {
      await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "write", path: full(editing.name), content }),
      });
      push(`Saved ${editing.name}`);
      setEditing(null);
      load(path);
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setSaveBusy(false);
    }
  };

  const create = async () => {
    if (!newKind) return;
    setCreateBusy(true);
    try {
      await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: newKind === "dir" ? "mkdir" : "write", path: full(newName), content: "" }),
      });
      push(`${newKind === "dir" ? "Folder" : "File"} created`);
      setNewKind(null);
      setNewName("");
      load(path);
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setCreateBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelBusy(true);
    try {
      await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "delete", path: full(deleting.name) }),
      });
      push(`Deleted ${deleting.name}`);
      setDeleting(null);
      load(path);
    } catch (e: any) {
      push(e.message, "error");
    } finally {
      setDelBusy(false);
    }
  };

  const rename = async () => {
    if (!renaming) return;
    try {
      await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "rename", path: full(renaming.name), to: full(renameTo) }),
      });
      push(`Renamed to ${renameTo}`);
      setRenaming(null);
      load(path);
    } catch (e: any) {
      push(e.message, "error");
    }
  };

  const chmod = async () => {
    if (!chmodding) return;
    try {
      await api("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "chmod", path: full(chmodding.name), mode: chmodMode }),
      });
      push(`Permissions set to ${chmodMode}`);
      setChmodding(null);
      load(path);
    } catch (e: any) {
      push(e.message, "error");
    }
  };

  const upload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      push("File too large (max 8 MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result).split(",")[1];
      try {
        await api("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "upload", path, name: file.name, data: base64 }),
        });
        push(`Uploaded ${file.name}`);
        load(path);
      } catch (e: any) {
        push(e.message, "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const crumbs = path.split("/").filter(Boolean);

  return (
    <div className="space-y-5">
      <PageHeader
        title="File Manager"
        subtitle="Browse, edit, upload and chmod files on the server — with root filesystem access."
        actions={
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Upload
            </Button>
            <Button variant="ghost" onClick={() => setNewKind("file")}>
              <FilePlus2 size={14} /> New file
            </Button>
            <Button variant="ghost" onClick={() => setNewKind("dir")}>
              <FolderPlus size={14} /> New folder
            </Button>
          </div>
        }
      />

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <IconBtn title="Root" onClick={() => load("/")}>
            <HardDrive size={14} />
          </IconBtn>
          <IconBtn title="Home (www)" onClick={() => load("/www/wwwroot")}>
            <Home size={14} />
          </IconBtn>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs">
            <span className="cursor-pointer text-zinc-500 hover:text-zinc-200" onClick={() => load("/")}>
              /
            </span>
            {crumbs.map((c, i) => (
              <span key={i} className="flex shrink-0 items-center gap-1">
                <ChevronRight size={12} className="text-zinc-700" />
                <span
                  className="cursor-pointer font-medium text-zinc-300 hover:text-white"
                  onClick={() => load("/" + crumbs.slice(0, i + 1).join("/"))}
                >
                  {c}
                </span>
              </span>
            ))}
          </div>
          <IconBtn title="Refresh" className="ml-auto" onClick={() => load(path)}>
            <RefreshCw size={14} />
          </IconBtn>
        </div>

        {error ? (
          <div className="px-4 py-10 text-center text-sm text-rose-400">{error}</div>
        ) : loading ? (
          <div className="flex justify-center py-14">
            <Spinner />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Permissions</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Size</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Modified</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.name} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                  <td className="px-4 py-2">
                    <button
                      className="flex items-center gap-2.5 font-medium text-zinc-200 hover:text-sky-300"
                      onClick={() => openEntry(e)}
                    >
                      <EntryIcon e={e} />
                      <span className="truncate">{e.name}</span>
                      {e.symlink && <span className="text-[10px] text-zinc-600">symlink</span>}
                    </button>
                  </td>
                  <td className="hidden px-4 py-2 font-mono text-xs text-zinc-500 sm:table-cell">{e.mode}</td>
                  <td className="hidden px-4 py-2 text-zinc-400 md:table-cell">{e.dir ? "—" : formatBytes(e.size)}</td>
                  <td className="hidden px-4 py-2 text-zinc-500 md:table-cell">{formatDate(e.mtime)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-0.5">
                      {!e.dir && (
                        <>
                          <IconBtn title="Preview" onClick={() => openEntry(e)}>
                            <Eye size={13} />
                          </IconBtn>
                          <IconBtn title="Download" onClick={() => window.open(`/api/files?path=${encodeURIComponent(full(e.name))}&op=raw`, "_blank")}>
                            <Download size={13} />
                          </IconBtn>
                        </>
                      )}
                      <IconBtn title="Rename" onClick={() => { setRenaming(e); setRenameTo(e.name); }}>
                        <Pencil size={13} />
                      </IconBtn>
                      <IconBtn title="Permissions" onClick={() => { setChmodding(e); setChmodMode(e.mode.slice(1).replace(/-/g, "0")); }}>
                        <KeyRound size={13} />
                      </IconBtn>
                      <IconBtn title="Delete" className="hover:text-rose-400" onClick={() => setDeleting(e)}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-600">
                    Empty directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Editing ${editing?.name}`} width="max-w-3xl">
        {contentBusy ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            <textarea
              className="h-[46vh] w-full resize-none rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-sky-500/50"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saveBusy}>
                {saveBusy && <Loader2 size={14} className="animate-spin" />} Save file
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* image preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name} width="max-w-3xl">
        <div className="flex justify-center rounded-lg bg-black/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files?path=${encodeURIComponent(full(preview?.name || ""))}&op=raw`}
            alt={preview?.name}
            className="max-h-[60vh] rounded object-contain"
          />
        </div>
      </Modal>

      {/* new file/folder */}
      <Modal open={!!newKind} onClose={() => setNewKind(null)} title={`New ${newKind === "dir" ? "folder" : "file"}`} width="max-w-md">
        <Field label="Name" required>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={newKind === "dir" ? "my-folder" : "index.html"} autoFocus />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setNewKind(null)}>Cancel</Button>
          <Button onClick={create} disabled={!newName.trim() || createBusy}>
            {createBusy && <Loader2 size={14} className="animate-spin" />} Create
          </Button>
        </div>
      </Modal>

      {/* rename */}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title={`Rename ${renaming?.name}`} width="max-w-md">
        <Field label="New name" required>
          <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} autoFocus />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
          <Button onClick={rename} disabled={!renameTo.trim()}>Rename</Button>
        </div>
      </Modal>

      {/* chmod */}
      <Modal open={!!chmodding} onClose={() => setChmodding(null)} title={`Permissions — ${chmodding?.name}`} width="max-w-md">
        <Field label="Octal mode">
          <Input value={chmodMode} onChange={(e) => setChmodMode(e.target.value.replace(/[^0-7]/g, "").slice(0, 4))} className="font-mono" />
        </Field>
        <p className="mt-2 text-xs text-zinc-600">e.g. 755 (rwxr-xr-x) · 644 (rw-r--r--) · 600 (rw-------)</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setChmodding(null)}>Cancel</Button>
          <Button onClick={chmod} disabled={chmodMode.length < 3}>Apply</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete path?"
        message={<>This will permanently delete <b className="text-zinc-200">{deleting?.name}</b>{deleting?.dir ? " and everything inside it" : ""}.</>}
        busy={delBusy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function EntryIcon({ e }: { e: Entry }) {
  if (e.dir) return <Folder size={15} className="shrink-0 text-amber-400/80" />;
  const ext = e.name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return <FileImage size={15} className="shrink-0 text-emerald-400/80" />;
  if (["js", "ts", "tsx", "jsx", "css", "html", "json", "php", "sh", "py", "yml", "yaml"].includes(ext)) return <FileCode size={15} className="shrink-0 text-sky-400/80" />;
  return <File size={15} className="shrink-0 text-zinc-600" />;
}
