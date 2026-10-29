import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/*
 SETUP: Copy your Supabase Project URL and anon/publishable key below.
 Set OWNER_UID to the Auth user UUID for the only account allowed to upload/delete.
 Never put a service_role/secret key in this browser file.
*/
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY';
const OWNER_UID = 'YOUR_OWNER_AUTH_USER_UUID';
const BUCKET = 'media';

const $ = (id) => document.getElementById(id);
$('year').textContent = new Date().getFullYear();
const gallery = $('gallery');
let supabase = null, currentUser = null, filter = 'all', media = [];
const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR_') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_') && OWNER_UID && !OWNER_UID.includes('YOUR_');

if (!configured) {
  $('authStatus').textContent = 'Setup required';
  gallery.innerHTML = '<div class="empty">Website ka design ready hai. Online gallery chalu karne ke liye README mein diye gaye Supabase setup steps complete karein.</div>';
  $('authPanel').classList.remove('hidden');
  $('authMessage').textContent = 'Pehle app.js mein Supabase project details configure karein.';
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await refreshSession();
  await loadMedia();
}
async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user ?? null;
  updateAuth();
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    setTimeout(() => { updateAuth(); loadMedia(); }, 0);
  });
}
function isOwner() { return Boolean(currentUser && currentUser.id === OWNER_UID); }
function updateAuth() {
  $('authStatus').textContent = isOwner() ? 'Owner signed in' : currentUser ? 'Signed in • viewer access' : 'Public gallery';
  $('authPanel').classList.toggle('hidden', Boolean(currentUser));
  $('ownerPanel').classList.toggle('hidden', !isOwner());
}
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabase) return;
  $('authMessage').textContent = 'Signing in…';
  const { error } = await supabase.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  $('authMessage').textContent = error ? error.message : 'Signed in.';
});
$('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOwner()) return;
  const files = [...$('mediaFiles').files];
  if (!files.length) { $('uploadMessage').textContent = 'Please choose at least one file.'; return; }
  const button = e.submitter; button.disabled = true;
  let done = 0, errors = [];
  for (const file of files) {
    if (!/^image\/(jpeg|png|gif|webp)$|^video\/(mp4|quicktime|webm)$/.test(file.type)) { errors.push(`${file.name}: unsupported type`); continue; }
    const path = `${OWNER_UID}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { errors.push(`${file.name}: ${uploadError.message}`); continue; }
    const { error: dbError } = await supabase.from('media').insert({ owner_id: OWNER_UID, storage_path: path, file_name: file.name, mime_type: file.type, file_size: file.size, caption: $('caption').value.trim() || null });
    if (dbError) { await supabase.storage.from(BUCKET).remove([path]); errors.push(`${file.name}: ${dbError.message}`); continue; }
    done++;
  }
  $('uploadMessage').textContent = `${done} file(s) uploaded.` + (errors.length ? ` Issues: ${errors.join(' | ')}` : '');
  $('mediaFiles').value = ''; button.disabled = false; await loadMedia();
});
document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b));
  render();
}));
async function loadMedia() {
  if (!supabase) return;
  const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  if (error) { gallery.innerHTML = `<div class="empty">Gallery load nahi ho paayi: ${escapeHtml(error.message)}</div>`; return; }
  media = data || [];
  render();
}
function render() {
  const list = media.filter(m => filter === 'all' || (m.mime_type || '').startsWith(filter === 'image' ? 'image/' : 'video/'));
  gallery.innerHTML = '';
  if (!list.length) { gallery.innerHTML = '<div class="empty">Abhi koi media upload nahi hua hai. Nayi photos aur videos jald yahan dikhenge.</div>'; return; }
  for (const m of list) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(m.storage_path);
    const isImage = m.mime_type.startsWith('image/');
    const card = document.createElement('article'); card.className = 'card';
    const preview = document.createElement('div'); preview.className = 'preview';
    const badge = document.createElement('span'); badge.className = 'type'; badge.textContent = isImage ? 'PHOTO' : 'VIDEO'; preview.append(badge);
    const el = document.createElement(isImage ? 'img' : 'video'); el.src = data.publicUrl;
    if (isImage) { el.alt = m.caption || m.file_name; el.loading = 'lazy'; } else { el.controls = true; el.preload = 'metadata'; }
    preview.append(el);
    const info = document.createElement('div'); info.className = 'card-info';
    const title = document.createElement('div'); title.className = 'card-title'; title.textContent = m.caption || m.file_name; title.title = m.file_name;
    const meta = document.createElement('div'); meta.className = 'card-meta'; meta.textContent = `${formatBytes(m.file_size)} · ${new Date(m.created_at).toLocaleDateString()}`;
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const dl = document.createElement('a'); dl.className = 'download'; dl.href = data.publicUrl; dl.download = m.file_name; dl.target = '_blank'; dl.rel = 'noopener'; dl.textContent = '↓ Download';
    actions.append(dl);
    if (isOwner()) { const del = document.createElement('button'); del.className = 'delete'; del.textContent = 'Delete'; del.onclick = () => deleteMedia(m); actions.append(del); }
    info.append(title, meta, actions); card.append(preview, info); gallery.append(card);
  }
}
async function deleteMedia(m) {
  if (!isOwner() || !confirm(`Delete "${m.file_name}"?`)) return;
  const { error } = await supabase.from('media').delete().eq('id', m.id);
  if (error) { alert(error.message); return; }
  await supabase.storage.from(BUCKET).remove([m.storage_path]);
  await loadMedia();
}
function formatBytes(n=0) { if(n<1024)return `${n} B`; if(n<1048576)return `${(n/1024).toFixed(1)} KB`; return `${(n/1048576).toFixed(1)} MB`; }
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
